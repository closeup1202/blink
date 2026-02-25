/**
 * LinkedIn SPA 변화 감지 및 대응
 * history.pushState 인터셉트 + popstate로 URL 변화 감지
 */

import { type Root } from 'react-dom/client'
import { createBlinkButton, BUTTON_ID } from './components/BlinkButton'
import { createSearchBadge, BADGE_CLASS } from './components/StatusBadge'
import { waitForElement } from './utils/dom'
import { normalizeLinkedInProfileUrl } from '@/utils/url'
import { storage } from '@/storage'
import type { Contact } from '@/types'
import { logger } from '@/utils/logger'

let currentUrl = location.href
let buttonRoots: Root[] = [] // 여러 버튼을 관리 (프로필 카드 + sticky header)
let searchObserver: MutationObserver | null = null
let cachedContactMap: Map<string, Contact> | null = null
let urlPollingInterval: number | null = null
let popstateHandler: (() => void) | null = null
let buttonInjectionTimer: number | null = null // 버튼 재시도 타이머
let badgeDebounceTimer: number | null = null
let visibilityChangeHandler: (() => void) | null = null

/**
 * LinkedIn 페이지 변화 감지 시작
 * URL 폴링 + history API 인터셉트 조합
 */
export function observeLinkedInChanges() {
  logger.log('Blink: Starting LinkedIn page observer')

  function handleUrlChange() {
    if (location.href !== currentUrl) {
      logger.log(`Blink: URL changed from ${currentUrl} to ${location.href}`)
      currentUrl = location.href
      onPageChange()
    }
  }

  // 방법 1: SPA 네비게이션 감지 (LinkedIn은 pushState 사용)
  try {
    const originalPushState = history.pushState
    history.pushState = function (...args) {
      originalPushState.apply(history, args)
      handleUrlChange()
    }

    const originalReplaceState = history.replaceState
    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args)
      handleUrlChange()
    }
    logger.log('Blink: History API intercepted')
  } catch (e) {
    logger.warn('Blink: Failed to intercept history API', e)
  }

  // 방법 2: 브라우저 뒤로/앞으로 버튼
  popstateHandler = handleUrlChange
  window.addEventListener('popstate', popstateHandler)

  // 방법 3: URL 폴링 (fallback - LinkedIn이 다른 방식으로 라우팅할 경우)
  // 기존 폴링이 있으면 정리
  if (urlPollingInterval) {
    clearInterval(urlPollingInterval)
  }
  urlPollingInterval = window.setInterval(() => {
    handleUrlChange()
  }, 5000) // 5000ms 폴백 - history API/popstate가 대부분 처리
  logger.log('Blink: URL polling started (5000ms fallback interval)')

  // 탭이 숨겨질 때 폴링 일시 중단, 표시될 때 재개 (배터리/CPU 절약)
  visibilityChangeHandler = () => {
    if (document.hidden) {
      if (urlPollingInterval) {
        clearInterval(urlPollingInterval)
        urlPollingInterval = null
        logger.log('Blink: URL polling paused (tab hidden)')
      }
    } else {
      handleUrlChange()
      if (!urlPollingInterval) {
        urlPollingInterval = window.setInterval(handleUrlChange, 5000)
        logger.log('Blink: URL polling resumed (tab visible)')
      }
    }
  }
  document.addEventListener('visibilitychange', visibilityChangeHandler)

  // 초기 페이지 로드 - 현재 URL 동기화
  currentUrl = location.href
  logger.log(`Blink: Initial page load, URL: ${currentUrl}`)
  onPageChange()

  // DOM이 완전히 로드될 때까지 기다린 후 재시도
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      currentUrl = location.href
      logger.log('Blink: DOMContentLoaded event fired, retrying')
      onPageChange()
    })
  }

  // 추가 안전장치: 페이지 로드 완료 후 재시도
  window.addEventListener('load', () => {
    currentUrl = location.href
    logger.log('Blink: Window load event fired, retrying')
    setTimeout(() => onPageChange(), 1000)
  })

  // Extension unload 또는 페이지 이탈 시 cleanup
  window.addEventListener('beforeunload', () => {
    cleanup()
  })
}

/**
 * 리소스 정리 함수
 */
function cleanup() {
  // URL 폴링 정리
  if (urlPollingInterval) {
    clearInterval(urlPollingInterval)
    urlPollingInterval = null
    logger.log('Blink: URL polling cleared')
  }

  // Popstate 이벤트 리스너 제거 (메모리 누수 방지)
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler)
    popstateHandler = null
    logger.log('Blink: Popstate listener removed')
  }

  // 버튼 재시도 타이머 정리
  if (buttonInjectionTimer) {
    clearTimeout(buttonInjectionTimer)
    buttonInjectionTimer = null
    logger.log('Blink: Button injection timer cleared')
  }

  // 버튼 React roots 정리 (race condition 방지를 위해 순차 처리)
  const rootsToUnmount = [...buttonRoots]
  buttonRoots = []

  rootsToUnmount.forEach(root => {
    try {
      root.unmount()
    } catch (e) {
      logger.warn('Blink: Failed to unmount button root', e)
    }
  })

  // unmount 완료 후 DOM 제거
  document.querySelectorAll(`[id^="${BUTTON_ID}"]`).forEach(el => el.remove())

  // 검색 observer 정리
  if (searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
    logger.log('Blink: Search observer disconnected')
  }

  // 배지 디바운스 타이머 정리
  if (badgeDebounceTimer) {
    clearTimeout(badgeDebounceTimer)
    badgeDebounceTimer = null
  }

  // visibilitychange 이벤트 리스너 제거
  if (visibilityChangeHandler) {
    document.removeEventListener('visibilitychange', visibilityChangeHandler)
    visibilityChangeHandler = null
  }

  // 캐시 정리
  cachedContactMap = null
}

/**
 * 페이지 변경 시 실행
 */
function onPageChange() {
  logger.log(`Blink: onPageChange called, isProfile: ${isProfilePage()}, isSearch: ${isSearchPage()}`)

  // 이전 버튼 재시도 타이머 취소 (중복 주입 방지)
  if (buttonInjectionTimer) {
    clearTimeout(buttonInjectionTimer)
    buttonInjectionTimer = null
  }

  // 검색 페이지가 아니면 검색 observer 정리
  if (!isSearchPage() && searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
  }

  if (isProfilePage()) {
    logger.log('Blink: Profile page detected, injecting button')
    injectBlinkButton()

    // 실패 시 재시도 (LinkedIn DOM이 늦게 로드되는 경우 대비)
    buttonInjectionTimer = window.setTimeout(async () => {
      // 버튼이 아직 주입되지 않았으면 재시도
      const existingButtons = document.querySelectorAll(`[id^="${BUTTON_ID}"]`)
      if (isProfilePage() && existingButtons.length === 0) {
        logger.log('Blink: Retrying button injection after 2s delay')
        await injectBlinkButton()
      }
      buttonInjectionTimer = null
    }, 2000)
  }

  if (isSearchPage()) {
    logger.log('Blink: Search page detected, injecting badges')
    injectSearchBadges()
  }
}

function isProfilePage(): boolean {
  const url = location.href
  return /linkedin\.com\/in\/[^/]+\/?/.test(url)
}

function isSearchPage(): boolean {
  const url = location.href
  return url.includes('/search/results/people/')
}

/**
 * More 버튼을 찾지 못했을 때 대체 위치 찾기
 * LinkedIn 프로필 헤더의 다른 버튼들을 찾아서 그 옆에 주입
 */
async function findFallbackButtonLocation(): Promise<Element | null> {
  // 프로필 헤더의 다른 버튼들을 찾아본다
  const fallbackSelectors = [
    'button[aria-label*="Message"]',
    'button[aria-label*="메시지"]',
    'button[aria-label*="Connect"]',
    'button[aria-label*="연결"]',
    'button[aria-label*="Follow"]',
    'button[aria-label*="팔로우"]',
    // 프로필 카드의 버튼 컨테이너
    '.pvs-profile-actions button',
    'div.display-flex.gap-2 button',
  ]

  for (const selector of fallbackSelectors) {
    const element = await waitForElement(selector, 2000)
    if (element) {
      logger.log(`Blink: Found fallback button with selector: ${selector}`)
      return element
    }
  }

  return null
}

/**
 * 프로필 페이지에 Blink 버튼 주입 (상단 프로필 카드만, sticky header 제외)
 */
async function injectBlinkButton() {
  logger.log('Blink: Attempting to inject button on profile page')

  // 기존 버튼들 언마운트 후 제거 (race condition 방지)
  const rootsToUnmount = [...buttonRoots]
  buttonRoots = []

  rootsToUnmount.forEach(root => {
    try {
      root.unmount()
    } catch (e) {
      logger.warn('Blink: Failed to unmount button root', e)
    }
  })

  // unmount 완료 후 DOM 제거
  const existingButtons = document.querySelectorAll(`[id^="${BUTTON_ID}"]`)
  existingButtons.forEach(el => el.remove())

  if (existingButtons.length > 0) {
    logger.log(`Blink: Removed ${existingButtons.length} existing button(s)`)
  }

  // 디버깅: 페이지의 모든 버튼 aria-label 확인
  const allButtons = Array.from(document.querySelectorAll('button[aria-label]'))
  if (allButtons.length > 0) {
    logger.log('Blink: Found buttons with aria-labels:',
      allButtons.slice(0, 10).map(b => b.getAttribute('aria-label')))
  }

  // More 버튼 찾기 (여러 selector 시도)
  const moreButtonSelectors = [
    'button[aria-label*="More"]',
    'button[aria-label*="more"]',
    'button[aria-label*="추가"]', // 한국어 "추가 작업"
    'button[aria-label*="기타"]', // 한국어 대체 버전
    'button[aria-label*="더 보기"]', // 한국어 "더 보기"
  ]

  // 첫 번째 More 버튼이 나타날 때까지 대기 (timeout 증가)
  let foundSelector = ''
  for (const selector of moreButtonSelectors) {
    const btn = await waitForElement(selector, 5000) // 1s → 5s 증가
    if (btn) {
      foundSelector = selector
      logger.log(`Blink: Found More button(s) with selector: ${selector}`)
      break
    }
  }

  if (!foundSelector) {
    logger.warn('Blink: More button not found after 5s timeout')

    // 중복 주입 방지: 버튼이 이미 존재하는지 확인
    const alreadyInjectedCheck = document.querySelectorAll(`[id^="${BUTTON_ID}"]`)
    if (alreadyInjectedCheck.length > 0) {
      logger.warn(`Blink: Button already exists (${alreadyInjectedCheck.length} found), skipping fallback`)
      return
    }

    // 대체 전략: 프로필 헤더의 버튼 그룹 찾기
    const fallbackButton = await findFallbackButtonLocation()
    if (fallbackButton) {
      logger.log('Blink: Using fallback button location')

      // 다시 한 번 중복 확인 (비동기 대기 후)
      const alreadyInjected2 = document.querySelectorAll(`[id^="${BUTTON_ID}"]`)
      if (alreadyInjected2.length > 0) {
        logger.warn(`Blink: Button injected during fallback wait, aborting`)
        return
      }

      const { button, root } = createBlinkButton()
      button.id = BUTTON_ID
      fallbackButton.parentElement?.insertBefore(button, fallbackButton)
      buttonRoots.push(root)
      logger.log('Blink: Button injected using fallback method')
    } else {
      logger.warn('Blink: Fallback button location also not found')
    }
    return
  }

  // 모든 More 버튼 찾기
  const allMoreButtons = Array.from(document.querySelectorAll(foundSelector))
  logger.log(`Blink: Found ${allMoreButtons.length} More button(s) total`)

  // Sticky가 아닌 버튼 찾기
  let profileCardButton: Element | null = null

  for (const moreButton of allMoreButtons) {
    // Sticky header의 버튼인지 확인
    let parent = moreButton.parentElement
    let isSticky = false

    for (let i = 0; i < 10 && parent; i++) {
      const style = window.getComputedStyle(parent)
      if (style.position === 'fixed' || style.position === 'sticky') {
        const top = parseInt(style.top || '0')
        if (top < 100) {
          isSticky = true
          logger.log('Blink: Skipping sticky header button')
          break
        }
      }
      parent = parent.parentElement
    }

    if (!isSticky) {
      profileCardButton = moreButton
      logger.log('Blink: Found profile card More button (non-sticky)')
      break
    }
  }

  if (!profileCardButton) {
    logger.warn('Blink: Only found sticky header buttons, profile card button not available')
    return
  }

  // More 버튼을 찾았으면 옆에 Blink 버튼 추가
  if (!isProfilePage()) {
    logger.log('Blink: Page changed during injection, aborting')
    return
  }

  // 중복 주입 최종 방어: 버튼이 이미 존재하는지 확인
  const alreadyInjected = document.querySelectorAll(`[id^="${BUTTON_ID}"]`)
  if (alreadyInjected.length > 0) {
    logger.warn(`Blink: Button already exists (${alreadyInjected.length} found), skipping injection`)
    return
  }

  const { button, root } = createBlinkButton()
  button.id = BUTTON_ID

  profileCardButton.parentElement?.insertBefore(button, profileCardButton.nextSibling)
  buttonRoots.push(root)
  logger.log('Blink: Button injected next to More button in profile card')

  // 주입 후 검증
  const finalCheck = document.querySelectorAll(`[id^="${BUTTON_ID}"]`)
  if (finalCheck.length > 1) {
    logger.error(`Blink: Duplicate buttons detected! Found ${finalCheck.length} buttons`)
    // 첫 번째 제외하고 모두 제거
    finalCheck.forEach((btn, idx) => {
      if (idx > 0) btn.remove()
    })
  }
}

/**
 * 검색 결과에 상태 배지 주입
 */
async function injectSearchBadges() {
  // 이전 검색 페이지 observer 정리
  if (searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
  }

  // 검색 페이지 진입 시 contacts 캐시 갱신
  const contacts = await storage.getAllContacts()
  cachedContactMap = new Map(contacts.map(c => [c.id, c]))

  // 첫 번째 검색 결과가 나타날 때까지 대기
  const firstResult = await waitForElement('[data-view-name="people-search-result"]', 5000)
  if (!firstResult || !isSearchPage()) return

  // 현재 보이는 결과에 배지 주입
  injectBadgesIntoResults()

  // 무한 스크롤 대응: 부모 컨테이너 관찰
  const container = firstResult.closest('ul') ?? firstResult.parentElement ?? document.body
  searchObserver = new MutationObserver(() => {
    if (badgeDebounceTimer) clearTimeout(badgeDebounceTimer)
    badgeDebounceTimer = window.setTimeout(() => {
      badgeDebounceTimer = null
      injectBadgesIntoResults()
    }, 150)
  })
  searchObserver.observe(container, { childList: true, subtree: true })
}

/**
 * 검색 결과 아이템에 배지 주입 (캐시된 contactMap 사용)
 */
function injectBadgesIntoResults() {
  const contactMap = cachedContactMap
  if (!contactMap || contactMap.size === 0) return

  const results = document.querySelectorAll('[data-view-name="people-search-result"]')
  for (const result of results) {
    // 이미 배지가 있으면 건너뜀
    if (result.querySelector(`.${BADGE_CLASS}`)) continue

    // result 자체가 <a> 태그 (href="/in/...")
    const href = result instanceof HTMLAnchorElement
      ? result.href
      : (result.querySelector('a[href*="/in/"]') as HTMLAnchorElement | null)?.href
    if (!href?.includes('/in/')) continue

    const profileId = normalizeLinkedInProfileUrl(href)
    const contact = contactMap.get(profileId)
    if (!contact) continue

    // 카드 우하단에 절대 위치로 배지 삽입
    const listItem = (result.querySelector('[role="listitem"]') ?? result) as HTMLElement
    listItem.style.position = 'relative'

    const badge = createSearchBadge(contact)
    listItem.appendChild(badge)
  }
}

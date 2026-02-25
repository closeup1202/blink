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
let isInjectingButton = false  // 동시 주입 방지 플래그
let isInjectingBadges = false  // 동시 배지 주입 방지 플래그

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

  // 주입 플래그 초기화
  isInjectingButton = false
  isInjectingBadges = false

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
  try {
    const { hostname, pathname } = new URL(location.href)
    return hostname.includes('linkedin.com') && /^\/in\/[\w-]+/.test(pathname)
  } catch {
    return false
  }
}

function isSearchPage(): boolean {
  const url = location.href
  return url.includes('/search/results/people/')
}


/**
 * 요소가 sticky/fixed 헤더 안에 있는지 확인
 */
function isStickyElement(el: Element): boolean {
  let parent = el.parentElement
  for (let i = 0; i < 10 && parent; i++) {
    const style = window.getComputedStyle(parent)
    if (
      (style.position === 'fixed' || style.position === 'sticky') &&
      parseInt(style.top || '0') < 100
    ) {
      return true
    }
    parent = parent.parentElement
  }
  return false
}

/**
 * 유효한 프로필 액션 컨테이너 후보인지 검증
 * - sticky/fixed 헤더 제외
 * - 검색 결과 카드 내부 제외
 */
function isValidProfileEl(el: Element): boolean {
  return !isStickyElement(el) && !el.closest('[data-view-name="people-search-result"]')
}

/**
 * 현재 DOM에서 non-sticky 프로필 액션 컨테이너를 탐색
 *
 * 1차: .pvs-profile-actions__custom
 * 2차: [id$="-profile-overflow-action"] More 버튼 → 부모
 * 3차: aria-label="More actions" 버튼 → 부모
 * 4차: Follow/Connect/Message 버튼 → 부모 (레이아웃 최소 프로필 대응)
 */
function findActionsContainer(): HTMLElement | null {
  // 1차
  const validCustom = Array.from(document.querySelectorAll('.pvs-profile-actions__custom'))
    .find(isValidProfileEl)
  if (validCustom) return validCustom as HTMLElement

  // 2차
  const validOverflowById = Array.from(document.querySelectorAll('[id$="-profile-overflow-action"]'))
    .find(isValidProfileEl)
  if (validOverflowById) {
    return (validOverflowById.closest('.artdeco-dropdown')?.parentElement as HTMLElement) ?? null
  }

  // 3차
  const validMoreBtn = Array.from(document.querySelectorAll('button[aria-label="More actions"]'))
    .find(isValidProfileEl)
  if (validMoreBtn) {
    return (validMoreBtn.closest('.artdeco-dropdown')?.parentElement as HTMLElement) ?? null
  }

  // 4차: 기본 액션 버튼 → 부모 컨테이너
  const actionBtnSelector = [
    'button[aria-label*="Follow"]', 'button[aria-label*="팔로우"]',
    'button[aria-label*="Connect"]', 'button[aria-label*="연결"]',
    'button[aria-label*="Message"]', 'button[aria-label*="메시지"]',
  ].join(', ')
  const validActionBtn = Array.from(document.querySelectorAll(actionBtnSelector))
    .find(isValidProfileEl)
  if (validActionBtn?.parentElement) return validActionBtn.parentElement as HTMLElement

  return null
}

/**
 * 프로필 액션 컨테이너가 나타날 때까지 대기
 *
 * MutationObserver(childList + attributes) + 300ms 폴링 조합.
 * LinkedIn이 노드 추가 대신 visibility/class 토글로 전환하는 경우도 감지.
 */
function waitForProfileActionsContainer(timeoutMs: number): Promise<HTMLElement | null> {
  const immediate = findActionsContainer()
  if (immediate) return Promise.resolve(immediate)

  return new Promise(resolve => {
    let done = false

    const finish = (result: HTMLElement | null) => {
      if (done) return
      done = true
      clearInterval(pollId)
      clearTimeout(timerId)
      observer.disconnect()
      resolve(result)
    }

    const check = () => {
      if (!isProfilePage()) { finish(null); return }
      const container = findActionsContainer()
      if (container) finish(container)
    }

    const pollId = window.setInterval(check, 300)
    const timerId = window.setTimeout(() => finish(null), timeoutMs)
    const observer = new MutationObserver(check)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    })
  })
}

/**
 * 프로필 페이지에 Blink 버튼 주입
 */
async function injectBlinkButton() {
  if (isInjectingButton) {
    logger.log('Blink: Button injection already in progress, skipping')
    return
  }
  isInjectingButton = true
  try {
    logger.log('Blink: Attempting to inject button on profile page')

    // 기존 버튼 정리
    const rootsToUnmount = [...buttonRoots]
    buttonRoots = []
    rootsToUnmount.forEach(root => {
      try { root.unmount() } catch (e) { logger.warn('Blink: Failed to unmount', e) }
    })
    document.querySelectorAll(`[id^="${BUTTON_ID}"]`).forEach(el => el.remove())

    const actionsContainer = await waitForProfileActionsContainer(8000)

    if (!actionsContainer || !isProfilePage()) {
      logger.warn('Blink: Profile actions container not found')
      return
    }

    // 중복 주입 최종 방어
    if (document.querySelector(`[id^="${BUTTON_ID}"]`)) {
      logger.warn('Blink: Button already exists, skipping injection')
      return
    }

    const { button, root } = createBlinkButton()
    button.id = BUTTON_ID

    actionsContainer.appendChild(button)
    logger.log('Blink: Button injected into profile actions container')
    buttonRoots.push(root)
  } finally {
    isInjectingButton = false
  }
}

/**
 * 검색 결과에 상태 배지 주입
 */
async function injectSearchBadges() {
  if (isInjectingBadges) return
  isInjectingBadges = true
  try {
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
  if (!firstResult || !isSearchPage()) return // finally 블록에서 isInjectingBadges = false 처리됨

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
  } finally {
    isInjectingBadges = false
  }
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

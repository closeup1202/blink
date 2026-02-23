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

let currentUrl = location.href
let buttonRoots: Root[] = [] // 여러 버튼을 관리 (프로필 카드 + sticky header)
let searchObserver: MutationObserver | null = null
let cachedContactMap: Map<string, Contact> | null = null
let urlPollingInterval: number | null = null

/**
 * LinkedIn 페이지 변화 감지 시작
 * URL 폴링 + history API 인터셉트 조합
 */
export function observeLinkedInChanges() {
  console.log('Blink: Starting LinkedIn page observer')

  function handleUrlChange() {
    if (location.href !== currentUrl) {
      console.log(`Blink: URL changed from ${currentUrl} to ${location.href}`)
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
    console.log('Blink: History API intercepted')
  } catch (e) {
    console.warn('Blink: Failed to intercept history API', e)
  }

  // 방법 2: 브라우저 뒤로/앞으로 버튼
  window.addEventListener('popstate', handleUrlChange)

  // 방법 3: URL 폴링 (fallback - LinkedIn이 다른 방식으로 라우팅할 경우)
  // 기존 폴링이 있으면 정리
  if (urlPollingInterval) {
    clearInterval(urlPollingInterval)
  }
  urlPollingInterval = window.setInterval(() => {
    handleUrlChange()
  }, 500) // 500ms 간격 (배터리 및 CPU 효율성 개선)
  console.log('Blink: URL polling started (500ms interval)')

  // 초기 페이지 로드 - 현재 URL 동기화
  currentUrl = location.href
  console.log(`Blink: Initial page load, URL: ${currentUrl}`)
  onPageChange()

  // DOM이 완전히 로드될 때까지 기다린 후 재시도
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      currentUrl = location.href
      console.log('Blink: DOMContentLoaded event fired, retrying')
      onPageChange()
    })
  }

  // 추가 안전장치: 페이지 로드 완료 후 재시도
  window.addEventListener('load', () => {
    currentUrl = location.href
    console.log('Blink: Window load event fired, retrying')
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
    console.log('Blink: URL polling cleared')
  }

  // 버튼 React roots 정리
  buttonRoots.forEach(root => {
    try {
      root.unmount()
    } catch (e) {
      console.warn('Blink: Failed to unmount button root', e)
    }
  })
  buttonRoots = []

  // 검색 observer 정리
  if (searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
    console.log('Blink: Search observer disconnected')
  }

  // 캐시 정리
  cachedContactMap = null
}

/**
 * 페이지 변경 시 실행
 */
function onPageChange() {
  console.log(`Blink: onPageChange called, isProfile: ${isProfilePage()}, isSearch: ${isSearchPage()}`)

  // 검색 페이지가 아니면 검색 observer 정리
  if (!isSearchPage() && searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
  }

  if (isProfilePage()) {
    console.log('Blink: Profile page detected, injecting button')
    injectBlinkButton()
  }

  if (isSearchPage()) {
    console.log('Blink: Search page detected, injecting badges')
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
 * 프로필 페이지에 Blink 버튼 주입 (상단 프로필 카드만, sticky header 제외)
 */
async function injectBlinkButton() {
  // 기존 버튼들 언마운트 후 제거
  buttonRoots.forEach(root => root.unmount())
  buttonRoots = []
  document.querySelectorAll(`[id^="${BUTTON_ID}"]`).forEach(el => el.remove())

  console.log('Blink: Attempting to inject button on profile page')

  // More 버튼 찾기 (여러 selector 시도)
  const moreButtonSelectors = [
    'button[aria-label*="More"]',
    'button[aria-label*="more"]',
    'button[aria-label*="추가"]', // 한국어 버전
  ]

  // 첫 번째 More 버튼이 나타날 때까지 대기
  let foundSelector = ''
  for (const selector of moreButtonSelectors) {
    const btn = await waitForElement(selector, 1000)
    if (btn) {
      foundSelector = selector
      console.log(`Blink: Found More button(s) with selector: ${selector}`)
      break
    }
  }

  if (!foundSelector) {
    console.warn('Blink: More button not found')
    return
  }

  // 모든 More 버튼 찾기
  const allMoreButtons = Array.from(document.querySelectorAll(foundSelector))
  console.log(`Blink: Found ${allMoreButtons.length} More button(s) total`)

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
          console.log('Blink: Skipping sticky header button')
          break
        }
      }
      parent = parent.parentElement
    }

    if (!isSticky) {
      profileCardButton = moreButton
      console.log('Blink: Found profile card More button (non-sticky)')
      break
    }
  }

  if (!profileCardButton) {
    console.warn('Blink: Only found sticky header buttons, profile card button not available')
    return
  }

  // More 버튼을 찾았으면 옆에 Blink 버튼 추가
  if (!isProfilePage()) {
    console.log('Blink: Page changed during injection, aborting')
    return
  }

  const { button, root } = createBlinkButton()
  button.id = BUTTON_ID

  profileCardButton.parentElement?.insertBefore(button, profileCardButton.nextSibling)
  buttonRoots.push(root)
  console.log('Blink: Button injected next to More button in profile card')
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
    injectBadgesIntoResults()
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

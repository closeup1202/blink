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
let buttonRoots: Root[] = []
let searchObserver: MutationObserver | null = null
let cachedContactMap: Map<string, Contact> | null = null
let urlPollingInterval: number | null = null
let popstateHandler: (() => void) | null = null
let badgeDebounceTimer: number | null = null
let visibilityChangeHandler: (() => void) | null = null
let isInjectingBadges = false

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

  // 버튼 React roots 정리
  const rootsToUnmount = [...buttonRoots]
  buttonRoots = []

  rootsToUnmount.forEach((root) => {
    try {
      root.unmount()
    } catch (e) {
      logger.warn('Blink: Failed to unmount button root', e)
    }
  })

  document.getElementById(BUTTON_ID)?.remove()

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

  isInjectingBadges = false

  // 캐시 정리
  cachedContactMap = null
}

/**
 * 페이지 변경 시 실행
 */
function onPageChange() {
  logger.log(
    `Blink: onPageChange called, isProfile: ${isProfilePage()}, isSearch: ${isSearchPage()}`
  )

  // 검색 페이지가 아니면 검색 observer 정리
  if (!isSearchPage() && searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
  }

  if (isProfilePage()) {
    logger.log('Blink: Profile page detected, injecting button')
    injectBlinkButton()
  } else {
    // 프로필 페이지가 아니면 버튼 제거
    const rootsToUnmount = [...buttonRoots]
    buttonRoots = []
    rootsToUnmount.forEach((root) => {
      try {
        root.unmount()
      } catch (e) {
        logger.warn('Blink: Failed to unmount button root', e)
      }
    })
    document.getElementById(BUTTON_ID)?.remove()
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
 * 프로필 페이지에 Blink 버튼 주입
 * document.body에 fixed로 직접 주입 — LinkedIn DOM 셀렉터에 의존하지 않음
 */
function injectBlinkButton() {
  logger.log('Blink: Injecting button into body')

  // 기존 버튼 정리
  const rootsToUnmount = [...buttonRoots]
  buttonRoots = []
  rootsToUnmount.forEach((root) => {
    try {
      root.unmount()
    } catch (e) {
      logger.warn('Blink: Failed to unmount', e)
    }
  })
  document.getElementById(BUTTON_ID)?.remove()

  if (!isProfilePage()) return

  // 중복 주입 방어
  if (document.getElementById(BUTTON_ID)) {
    logger.log('Blink: Button already exists, skipping injection')
    return
  }

  const { button, root } = createBlinkButton()
  document.body.appendChild(button)
  buttonRoots.push(root)
  logger.log('Blink: Button injected')
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
    cachedContactMap = new Map(contacts.map((c) => [c.id, c]))

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
    const href =
      result instanceof HTMLAnchorElement
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

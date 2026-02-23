/**
 * LinkedIn SPA 변화 감지 및 대응
 * history.pushState 인터셉트 + popstate로 URL 변화 감지
 */

import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SaveLeadPanel, PANEL_ID } from './components/SaveLeadPanel'
import { createSearchBadge, BADGE_CLASS } from './components/StatusBadge'
import { waitForElement } from './utils/dom'
import { storage } from '@/storage'

let currentUrl = location.href
let panelRoot: Root | null = null
let searchObserver: MutationObserver | null = null
let cachedContactMap: Map<string, import('@/types').Contact> | null = null

/**
 * LinkedIn 페이지 변화 감지 시작
 * MutationObserver 대신 history API 인터셉트 사용 (CPU 효율적)
 */
export function observeLinkedInChanges() {
  function handleUrlChange() {
    if (location.href !== currentUrl) {
      currentUrl = location.href
      onPageChange()
    }
  }

  // SPA 네비게이션 감지 (LinkedIn은 pushState 사용)
  const originalPushState = history.pushState.bind(history)
  history.pushState = function (...args) {
    originalPushState(...args)
    handleUrlChange()
  }

  const originalReplaceState = history.replaceState.bind(history)
  history.replaceState = function (...args) {
    originalReplaceState(...args)
    handleUrlChange()
  }

  // 브라우저 뒤로/앞으로 버튼
  window.addEventListener('popstate', handleUrlChange)

  // 초기 페이지 로드
  onPageChange()
}

/**
 * 페이지 변경 시 실행
 */
function onPageChange() {
  console.log('LinkedIn page changed:', currentUrl)

  // 검색 페이지가 아니면 검색 observer 정리
  if (!isSearchPage() && searchObserver) {
    searchObserver.disconnect()
    searchObserver = null
  }

  if (isProfilePage()) {
    console.log('Profile page detected')
    injectProfilePanel()
  }

  if (isSearchPage()) {
    console.log('Search page detected')
    injectSearchBadges()
  }
}

function isProfilePage(): boolean {
  return /linkedin\.com\/in\/[^/]+\/?/.test(currentUrl)
}

function isSearchPage(): boolean {
  return currentUrl.includes('/search/results/people/')
}

/**
 * 프로필 페이지에 Save Lead 패널 주입
 */
async function injectProfilePanel() {
  // 기존 패널 언마운트 후 제거 (SPA 이동 시 새 프로필로 교체)
  if (panelRoot) {
    panelRoot.unmount()
    panelRoot = null
  }
  document.getElementById(PANEL_ID)?.remove()

  // LinkedIn 프로필 DOM 로딩 대기 (여러 셀렉터 순서대로 시도)
  const target = await waitForElement(
    '.pv-top-card-v2-ctas__custom, .ph5.pb5 > :last-child',
    5000
  )

  if (!target) {
    console.log('Blink: injection point not found')
    return
  }

  // URL이 바뀌어 있으면 중단 (대기 중 페이지가 변경된 경우)
  if (!isProfilePage()) return

  const container = document.createElement('div')
  container.id = PANEL_ID

  // 버튼 영역 다음에 삽입 (앞에 삽입하면 프로필 사진과 겹침)
  target.parentNode?.insertBefore(container, target.nextSibling)

  panelRoot = createRoot(container)
  panelRoot.render(createElement(SaveLeadPanel))
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

    const url = new URL(href)
    const profileId = url.origin + url.pathname.replace(/\/$/, '')
    const contact = contactMap.get(profileId)
    if (!contact) continue

    // 카드 우하단에 절대 위치로 배지 삽입
    const listItem = (result.querySelector('[role="listitem"]') ?? result) as HTMLElement
    listItem.style.position = 'relative'

    const badge = createSearchBadge(contact)
    listItem.appendChild(badge)
  }
}

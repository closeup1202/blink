/**
 * LinkedIn SPA 변화 감지 및 대응
 * MutationObserver를 사용하여 DOM 변화를 감지하고 필요한 UI를 재주입
 */

let currentUrl = location.href

/**
 * LinkedIn 페이지 변화 감지 시작
 */
export function observeLinkedInChanges() {
  // URL 변경 감지 (SPA 라우팅)
  const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href
      onPageChange()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // 초기 페이지 로드
  onPageChange()
}

/**
 * 페이지 변경 시 실행
 */
function onPageChange() {
  console.log('LinkedIn page changed:', currentUrl)

  // 프로필 페이지인지 확인
  if (isProfilePage()) {
    console.log('Profile page detected')
    injectProfilePanel()
  }

  // 검색 결과 페이지인지 확인
  if (isSearchPage()) {
    console.log('Search page detected')
    injectSearchBadges()
  }
}

/**
 * 프로필 페이지 여부 확인
 */
function isProfilePage(): boolean {
  return /linkedin\.com\/in\/[^/]+\/?$/.test(currentUrl)
}

/**
 * 검색 결과 페이지 여부 확인
 */
function isSearchPage(): boolean {
  return currentUrl.includes('/search/results/people/')
}

/**
 * 프로필 페이지에 Save Lead 패널 주입
 */
function injectProfilePanel() {
  // TODO: Day 4-6에서 구현
  console.log('TODO: Inject profile panel')
}

/**
 * 검색 결과에 상태 배지 주입
 */
function injectSearchBadges() {
  // TODO: Day 7-9에서 구현
  console.log('TODO: Inject search badges')
}

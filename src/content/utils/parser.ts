/**
 * LinkedIn 프로필 정보 파싱 유틸리티
 */

export interface ProfileInfo {
  name: string
  title: string
  company: string
  profileUrl: string
}

/**
 * 현재 페이지에서 프로필 정보 추출
 */
export function parseProfileInfo(): ProfileInfo | null {
  try {
    const profileUrl = window.location.href

    // 이름 추출 (LinkedIn이 클래스명을 난독화하므로 안정적인 유틸리티 클래스 조합 사용)
    const nameElement = document.querySelector('h1.inline.t-24') ?? document.querySelector('h1')
    const name = nameElement?.textContent?.trim() || ''

    // 직함 추출
    const titleElement = document.querySelector('.text-body-medium.break-words')
    const title = titleElement?.textContent?.trim() || ''

    // 회사명은 직함에서 "at" 뒤에 있는 경우가 많음
    // 예: "Founder at Acme Inc." -> "Acme Inc."
    const company = extractCompanyFromTitle(title)

    if (!name || !profileUrl) {
      return null
    }

    return {
      name,
      title,
      company,
      profileUrl,
    }
  } catch (error) {
    console.error('Failed to parse profile info:', error)
    return null
  }
}

/**
 * 직함에서 회사명 추출
 */
function extractCompanyFromTitle(title: string): string {
  const atIndex = title.toLowerCase().lastIndexOf(' at ')
  if (atIndex !== -1) {
    return title.slice(atIndex + 4).trim()
  }
  return ''
}

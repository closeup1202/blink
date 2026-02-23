/**
 * LinkedIn 프로필 URL 정규화
 * 중복 저장을 방지하기 위해 URL을 일관된 형식으로 변환
 */
export function normalizeLinkedInProfileUrl(url: string): string {
  try {
    const urlObj = new URL(url)

    // Query string 제거
    // 예: https://linkedin.com/in/johndoe?trk=... → https://linkedin.com/in/johndoe
    urlObj.search = ''

    // Hash 제거
    urlObj.hash = ''

    // 끝의 슬래시 제거
    // 예: https://linkedin.com/in/johndoe/ → https://linkedin.com/in/johndoe
    const cleanPath = urlObj.pathname.replace(/\/$/, '')

    // 정규화된 URL 반환
    return `${urlObj.origin}${cleanPath}`
  } catch (e) {
    console.error('Blink: Failed to normalize URL', url, e)
    // 실패 시 원본 URL 반환 (fallback)
    return url
  }
}

/**
 * 현재 페이지의 LinkedIn 프로필 ID 추출
 */
export function getCurrentProfileId(): string {
  return normalizeLinkedInProfileUrl(window.location.href)
}

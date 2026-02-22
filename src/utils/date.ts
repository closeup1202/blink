/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * 며칠 후 날짜 계산
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * overdue 여부 확인
 */
export function isOverdue(nextFollowUpDate: number): boolean {
  return Date.now() > nextFollowUpDate
}

/**
 * 며칠 overdue인지 계산
 */
export function getDaysOverdue(nextFollowUpDate: number): number {
  if (!isOverdue(nextFollowUpDate)) return 0
  const diffMs = Date.now() - nextFollowUpDate
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * 상대적 시간 표시 (예: "3 days ago")
 */
export function getRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * 날짜를 읽기 쉬운 형식으로 포맷 (예: "Feb 21, 2026")
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

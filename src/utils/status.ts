import type { FollowUpStatus } from '@/types'
import { STATUS_CONFIG } from '@/types'

/**
 * 상태 관련 유틸리티 함수
 */

export function getStatusLabel(status: FollowUpStatus): string {
  return STATUS_CONFIG[status].label
}

export function getStatusEmoji(status: FollowUpStatus): string {
  return STATUS_CONFIG[status].emoji
}

export function getStatusColor(status: FollowUpStatus): string {
  return STATUS_CONFIG[status].color
}

export function getStatusBadge(status: FollowUpStatus): string {
  return `${getStatusEmoji(status)} ${getStatusLabel(status)}`
}

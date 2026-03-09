// Core types for Hotline Chrome Extension

export type FollowUpStatus =
  | 'contacted' // 🔵 Contacted
  | 'replied' // 🟡 Replied
  | 'meeting_booked' // 🟢 Meeting Booked
  | 'not_interested' // 🔴 Not Interested

export interface Contact {
  id: string // LinkedIn profile URL (고유 키)
  name: string
  title?: string // Optional: LinkedIn UI 변경 시 파싱 실패 대응
  company?: string // Optional: LinkedIn UI 변경 시 파싱 실패 대응
  status: FollowUpStatus
  lastContactedAt: number // timestamp (ms)
  nextFollowUpDate: number // timestamp (ms)
  followUpAfterDays: number // 며칠 후 리마인더 (default: 7)
  createdAt: number // timestamp (ms)
  memo?: string // v2 기능
}

export interface StorageData {
  contacts: Record<string, Contact> // key: profile URL
}

export const STATUS_CONFIG = {
  contacted: {
    label: 'Contacted',
    emoji: '🔵',
    color: '#0A66C2',
  },
  replied: {
    label: 'Replied',
    emoji: '🟡',
    color: '#F5C542',
  },
  meeting_booked: {
    label: 'Meeting Booked',
    emoji: '🟢',
    color: '#057642',
  },
  not_interested: {
    label: 'Not Interested',
    emoji: '🔴',
    color: '#CC1016',
  },
} as const

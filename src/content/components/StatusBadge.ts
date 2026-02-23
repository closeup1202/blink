import type { Contact } from '@/types'
import { STATUS_CONFIG } from '@/types'
import { isOverdue, getRelativeTime } from '@/utils/date'

export const BADGE_CLASS = 'blink-search-badge'

export function createSearchBadge(contact: Contact): HTMLElement {
  const overdue = isOverdue(contact.nextFollowUpDate)
  const cfg = STATUS_CONFIG[contact.status]

  const badge = document.createElement('div')
  badge.className = BADGE_CLASS
  badge.style.cssText = `
    position: absolute;
    bottom: 12px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: ${overdue ? '#fff0f0' : '#f0f7ff'};
    border: 1px solid ${overdue ? '#ffb3b3' : '#c8ddf5'};
    color: ${overdue ? '#CC1016' : '#333'};
    z-index: 1;
    pointer-events: none;
  `

  const statusLabel = overdue ? '🔴 Overdue' : `${cfg.emoji} ${cfg.label}`
  const timeLabel = `Last: ${getRelativeTime(contact.lastContactedAt)}`

  badge.innerHTML = `
    <span>${statusLabel}</span>
    <span style="opacity:0.4">·</span>
    <span style="opacity:0.7">${timeLabel}</span>
  `

  return badge
}

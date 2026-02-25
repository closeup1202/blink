/**
 * Content Script - LinkedIn 페이지에 주입
 */

import { observeLinkedInChanges } from './observer'
import { logger } from '@/utils/logger'

logger.log('Blink content script loaded!')

// Background script의 ping에 응답 (중복 주입 방지)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ping') {
    sendResponse({ status: 'ok' })
  }
  return true
})

// LinkedIn SPA 변화 감지 시작
observeLinkedInChanges()

// CSS 주입 (중복 방지: 이미 주입된 경우 건너뜀)
const STYLE_ID = 'blink-content-styles'
if (!document.getElementById(STYLE_ID)) {
const style = document.createElement('style')
style.id = STYLE_ID
style.textContent = `
  .blink-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    margin-left: 8px;
  }

  .blink-overdue {
    background-color: #FEE;
    color: #CC1016;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`
document.head.appendChild(style)
}

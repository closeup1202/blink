/**
 * Content Script - LinkedIn 페이지에 주입
 */

import { observeLinkedInChanges } from './observer'

console.log('Blink content script loaded!')

// LinkedIn SPA 변화 감지 시작
observeLinkedInChanges()

// CSS 주입
const style = document.createElement('style')
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

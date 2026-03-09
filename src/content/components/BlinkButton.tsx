import { useState, useCallback, useEffect, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SaveLeadModal } from './SaveLeadModal'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { storage } from '@/storage'
import type { Contact } from '@/types'
import { STATUS_CONFIG } from '@/types'
import { getCurrentProfileId } from '@/utils/url'

export const BUTTON_ID = 'blink-action-button'

function BlinkButton() {
  const [showModal, setShowModal] = useState(false)
  const [contact, setContact] = useState<Contact | null>(null)

  useEffect(() => {
    let mounted = true
    const profileId = getCurrentProfileId()
    if (!profileId) return

    // 초기 로드
    storage.getContact(profileId).then((c) => {
      if (mounted) setContact(c ?? null)
    }).catch(() => { /* storage 에러 시 기본 상태 유지 */ })

    // 팝업에서 삭제/수정 시 storage 변경 감지 → 버튼 상태 즉시 갱신
    const handleStorageChange = () => {
      storage.getContact(profileId).then((c) => {
        if (mounted) setContact(c ?? null)
      }).catch(() => { /* storage 에러 시 기본 상태 유지 */ })
    }
    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    const profileId = getCurrentProfileId()
    if (profileId) {
      storage.getContact(profileId).then((c) => setContact(c ?? null)).catch(() => {})
    }
  }, [])

  const cfg = contact ? STATUS_CONFIG[contact.status] : null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        aria-label={cfg ? `Blink: ${cfg.label}` : 'Save to Blink'}
        title={cfg ? `Blink: ${cfg.label}` : 'Save to Blink'}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          background: 'white',
          border: `2px solid ${cfg ? cfg.color : '#0A66C2'}`,
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          outline: 'none',
          padding: '0',
          lineHeight: '1',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.28)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {cfg ? cfg.emoji : '💼'}
      </button>
      {showModal && <SaveLeadModal onClose={handleModalClose} />}
    </>
  )
}

export function createBlinkButton(): { button: HTMLElement; root: Root } {
  const container = document.createElement('div')
  container.id = BUTTON_ID
  // body에 fixed로 주입 — LinkedIn 셀렉터에 의존하지 않음
  container.style.position = 'fixed'
  container.style.bottom = '64px'
  container.style.right = '24px'
  container.style.zIndex = '9999'

  const root = createRoot(container)
  root.render(
    createElement(ErrorBoundary, { fallback: null, children: createElement(BlinkButton) })
  )

  return { button: container, root }
}

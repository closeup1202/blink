import { useState, useCallback, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SaveLeadModal } from './SaveLeadModal'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const BUTTON_ID = 'blink-action-button'

export function BlinkButton() {
  const [showModal, setShowModal] = useState(false)
  const handleModalClose = useCallback(() => setShowModal(false), [])

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        aria-label="Save contact to Blink CRM"
        title="Save this LinkedIn contact for follow-up"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          height: '32px',
          background: 'white',
          border: '1px solid #0A66C2',
          borderRadius: '16px',
          color: '#0A66C2',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          outline: 'none',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          verticalAlign: 'middle',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#e8f3ff'
          e.currentTarget.style.borderColor = '#004182'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'white'
          e.currentTarget.style.borderColor = '#0A66C2'
        }}
      >
        Blink
      </button>
      {showModal && (
        <SaveLeadModal onClose={handleModalClose} />
      )}
    </>
  )
}

/**
 * Create Blink button element
 */
export function createBlinkButton(): { button: HTMLElement; root: Root } {
  const container = document.createElement('div')
  container.id = BUTTON_ID
  // flex item으로 동작하도록 — LinkedIn 액션 버튼 컨테이너(flex)에 맞게 정렬
  container.style.display = 'inline-flex'
  container.style.alignItems = 'center'

  const root = createRoot(container)
  root.render(createElement(ErrorBoundary, { fallback: null, children: createElement(BlinkButton) }))

  return { button: container, root }
}

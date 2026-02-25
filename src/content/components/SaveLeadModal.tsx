import { useState, useEffect, useRef } from 'react'
import { storage } from '@/storage'
import { parseProfileInfo } from '@/content/utils/parser'
import type { ProfileInfo } from '@/content/utils/parser'
import { getCurrentProfileId } from '@/utils/url'
import type { Contact, FollowUpStatus } from '@/types'
import { STATUS_CONFIG } from '@/types'
import { addDays } from '@/utils/date'

export const MODAL_ID = 'blink-save-lead-modal'

interface SaveLeadModalProps {
  onClose: () => void
}

export function SaveLeadModal({ onClose }: SaveLeadModalProps) {
  const [status, setStatus] = useState<FollowUpStatus>('contacted')
  const [followUpDays, setFollowUpDays] = useState(7)
  const [memo, setMemo] = useState('')
  const [existing, setExisting] = useState<Contact | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [profileId] = useState(() => getCurrentProfileId())

  // undefined = 로딩 중, null = 파싱 실패, ProfileInfo = 성공
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null | undefined>(undefined)

  const dialogRef = useRef<HTMLDivElement>(null)

  // 프로필 정보 비동기 로딩 (LinkedIn DOM이 늦게 렌더링될 수 있음)
  useEffect(() => {
    let mounted = true
    let attempts = 0
    const MAX_ATTEMPTS = 4
    const RETRY_INTERVAL_MS = 500

    const tryParse = () => {
      const info = parseProfileInfo()
      if (!mounted) return

      if (info) {
        setProfileInfo(info)
      } else if (attempts < MAX_ATTEMPTS) {
        attempts++
        setTimeout(tryParse, RETRY_INTERVAL_MS)
      } else {
        setProfileInfo(null) // 최종 실패
      }
    }

    tryParse()
    return () => { mounted = false }
  }, [])

  // 기존 연락처 로드
  useEffect(() => {
    storage.getContact(profileId)
      .then(c => {
        if (c) {
          setExisting(c)
          setStatus(c.status)
          setFollowUpDays(c.followUpAfterDays)
          setMemo(c.memo ?? '')
        }
      })
      .catch(err => {
        // 기존 연락처 로드 실패는 치명적이지 않으나 사용자에게 알림
        console.error('Failed to load existing contact:', err)
        setError('Could not load existing data. You can still save new data.')
      })
  }, [profileId])

  // ESC 키 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // 포커스 트랩 — 폼이 렌더링된 후 활성화
  useEffect(() => {
    if (profileInfo === undefined) return // 아직 로딩 중
    const dialog = dialogRef.current
    if (!dialog) return

    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(
        'select, input, textarea, button:not([disabled])'
      ))

    // 첫 번째 요소로 자동 포커스
    getFocusable()[0]?.focus()

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const elements = getFocusable()
      if (!elements.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey) {
        if (!dialog.contains(document.activeElement) || document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (!dialog.contains(document.activeElement) || document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTrap)
    return () => document.removeEventListener('keydown', handleTrap)
  }, [profileInfo])

  async function handleSave() {
    if (saving || !profileInfo) return

    // Stale profileId 방어: 저장 시점에 URL이 바뀌었으면 차단
    const currentProfileId = getCurrentProfileId()
    if (currentProfileId !== profileId) {
      setError('Profile changed while modal was open. Please close and reopen.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const now = Date.now()
      const contact: Contact = {
        id: profileId,
        name: profileInfo.name,
        title: profileInfo.title,
        company: profileInfo.company,
        status,
        lastContactedAt: now,
        nextFollowUpDate: addDays(new Date(now), followUpDays).getTime(),
        followUpAfterDays: followUpDays,
        memo: memo.trim() || undefined,
        createdAt: existing?.createdAt ?? now,
      }

      await storage.saveContact(contact)
      setExisting(contact)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Failed to save contact:', err)
      const message = err instanceof Error ? err.message : 'Failed to save contact'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  // 로딩 상태
  if (profileInfo === undefined) {
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'white', borderRadius: '8px', padding: '24px',
            maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: '18px' }}>⏳</div>
          <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>Loading profile info...</p>
        </div>
      </div>
    )
  }

  // 파싱 실패 상태
  if (profileInfo === null) {
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'white', borderRadius: '8px', padding: '24px',
            maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            background: '#fff3cd', border: '1px solid #ffc107',
            borderRadius: '8px', padding: '12px',
            fontSize: '13px', color: '#856404',
          }}>
            <strong>⚠️ Blink</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              Could not read profile information. Please reload the page.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: '12px', width: '100%', padding: '8px',
              background: '#666', color: 'white', border: 'none',
              borderRadius: '4px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[status]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save LinkedIn contact to Blink"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        style={{
          background: 'white', borderRadius: '8px', padding: '24px',
          width: '400px', maxWidth: '90vw',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: '#0A66C2', fontSize: '16px' }}>💼 Blink</span>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 400 }}>Track your follow-ups</span>
            </div>
            {existing && (
              <span style={{
                fontSize: '11px', background: '#e8f3ff', color: '#0A66C2',
                padding: '2px 6px', borderRadius: '10px',
              }}>
                {cfg.emoji} {cfg.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none', border: 'none', fontSize: '20px',
              cursor: 'pointer', color: '#666', padding: '0',
              width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#000' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
          >
            ×
          </button>
        </div>

        {/* Profile info */}
        <div style={{
          marginBottom: '16px', paddingBottom: '12px',
          borderBottom: '1px solid #e0e0e0', cursor: 'default',
        }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
            {profileInfo.name}
          </div>
          {profileInfo.title && (
            <div style={{ fontSize: '13px', color: '#666' }}>{profileInfo.title}</div>
          )}
          {profileInfo.company && (
            <div style={{ fontSize: '13px', color: '#666' }}>{profileInfo.company}</div>
          )}
        </div>

        {/* Status */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="blink-status"
            style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}
          >
            Status
          </label>
          <select
            id="blink-status"
            value={status}
            onChange={e => setStatus(e.target.value as FollowUpStatus)}
            style={{
              width: '100%', padding: '10px 12px',
              border: `1.5px solid ${cfg.color}`, borderRadius: '4px',
              fontSize: '14px', cursor: 'pointer', background: 'white',
              outline: 'none', lineHeight: '1.5', height: 'auto',
            }}
          >
            {Object.entries(STATUS_CONFIG).map(([key, c]) => (
              <option key={key} value={key}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Follow-up days */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="blink-followup-days"
            style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}
          >
            Follow up in
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="blink-followup-days"
              type="number"
              min={1}
              max={90}
              value={followUpDays}
              onChange={e => setFollowUpDays(Number(e.target.value))}
              style={{
                width: '70px', padding: '8px 10px',
                border: '1px solid #ccc', borderRadius: '4px',
                fontSize: '14px', outline: 'none',
              }}
            />
            <span style={{ color: '#666', fontSize: '14px' }}>days</span>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="blink-memo"
            style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}
          >
            Notes
          </label>
          <textarea
            id="blink-memo"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            style={{
              width: '100%', padding: '8px 10px',
              border: '1px solid #ccc', borderRadius: '4px',
              fontSize: '14px', resize: 'vertical', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              padding: '10px', marginBottom: '12px',
              background: '#fee', border: '1px solid #fcc',
              borderRadius: '4px', fontSize: '13px', color: '#c00',
            }}
          >
            {error}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '10px',
            background: saved ? '#057642' : saving ? '#999' : '#0A66C2',
            color: 'white', border: 'none', borderRadius: '4px',
            fontWeight: 600, fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s', opacity: saving ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.background = '#004182' }}
          onMouseLeave={e => { if (!saving && !saved) e.currentTarget.style.background = '#0A66C2' }}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : existing ? 'Update Lead' : 'Save Lead'}
        </button>
      </div>
    </div>
  )
}

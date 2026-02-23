import { useState, useEffect } from 'react'
import { storage } from '@/storage'
import { parseProfileInfo } from '@/content/utils/parser'
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
        console.error('Failed to load existing contact:', err)
      })
  }, [profileId])

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const profileInfo = parseProfileInfo()

  if (!profileInfo) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }} onClick={onClose}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }} onClick={e => e.stopPropagation()}>
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            color: '#856404',
          }}>
            <strong>⚠️ Blink</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              Could not read profile information. Please reload the page.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '8px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  async function handleSave() {
    if (saving || !profileInfo) return

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

  const cfg = STATUS_CONFIG[status]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '400px',
          maxWidth: '90vw',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
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
                fontSize: '11px',
                background: '#e8f3ff',
                color: '#0A66C2',
                padding: '2px 6px',
                borderRadius: '10px',
              }}>
                {cfg.emoji} {cfg.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#000'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Profile info */}
        <div style={{
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e0e0e0',
          cursor: 'default',
        }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
            {profileInfo.name}
          </div>
          {profileInfo.title && (
            <div style={{ fontSize: '13px', color: '#666' }}>
              {profileInfo.title}
            </div>
          )}
          {profileInfo.company && (
            <div style={{ fontSize: '13px', color: '#666' }}>
              {profileInfo.company}
            </div>
          )}
        </div>

        {/* Status */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
            Status
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as FollowUpStatus)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1.5px solid ${cfg.color}`,
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              background: 'white',
              outline: 'none',
              lineHeight: '1.5',
              height: 'auto',
            }}
          >
            {Object.entries(STATUS_CONFIG).map(([key, c]) => (
              <option key={key} value={key}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Follow-up days */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
            Follow up in
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min={1}
              max={90}
              value={followUpDays}
              onChange={e => setFollowUpDays(Number(e.target.value))}
              style={{
                width: '70px',
                padding: '8px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <span style={{ color: '#666', fontSize: '14px' }}>days</span>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>
            Notes
          </label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '10px',
            marginBottom: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#c00',
          }}>
            {error}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '10px',
            background: saved ? '#057642' : saving ? '#999' : '#0A66C2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: saving ? 0.7 : 1,
          }}
          onMouseEnter={e => {
            if (!saving && !saved) {
              e.currentTarget.style.background = '#004182'
            }
          }}
          onMouseLeave={e => {
            if (!saving && !saved) {
              e.currentTarget.style.background = '#0A66C2'
            }
          }}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : existing ? 'Update Lead' : 'Save Lead'}
        </button>
      </div>
    </div>
  )
}

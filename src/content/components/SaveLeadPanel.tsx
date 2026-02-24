import { useState, useEffect } from 'react'
import { storage } from '@/storage'
import { parseProfileInfo } from '@/content/utils/parser'
import { getCurrentProfileId } from '@/utils/url'
import type { Contact, FollowUpStatus } from '@/types'
import { STATUS_CONFIG } from '@/types'
import { addDays } from '@/utils/date'

export const PANEL_ID = 'blink-save-lead-panel'

export function SaveLeadPanel() {
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
        // 기존 연락처 로드 실패는 치명적이지 않으므로 조용히 처리
      })
  }, [profileId])

  const profileInfo = parseProfileInfo()

  if (!profileInfo) {
    return (
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '14px',
        marginBottom: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '13px',
        color: '#856404',
      }}>
        <strong>⚠️ Blink</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
          Could not read profile information. Please reload the page.
        </p>
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
      setTimeout(() => setSaved(false), 2000)
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
    <div style={{
      background: 'white',
      border: '1px solid #dce6f1',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '14px',
      marginBottom: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontWeight: 700, color: '#0A66C2', fontSize: '15px' }}>💼 Blink</span>
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

      {/* Status */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="blink-status-select" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
          Status
        </label>
        <select
          id="blink-status-select"
          value={status}
          onChange={e => setStatus(e.target.value as FollowUpStatus)}
          aria-label="Contact status"
          style={{
            width: '100%',
            padding: '6px 8px',
            border: `1.5px solid ${cfg.color}`,
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer',
            background: 'white',
            outline: 'none',
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <option key={key} value={key}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Follow-up days */}
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="blink-followup-days" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
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
            aria-label="Follow-up days"
            style={{
              width: '60px',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <span style={{ color: '#666', fontSize: '13px' }}>days</span>
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="blink-notes" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
          Notes
        </label>
        <textarea
          id="blink-notes"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          aria-label="Contact notes"
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div role="alert" aria-live="assertive" style={{
          padding: '8px',
          marginBottom: '10px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#c00',
        }}>
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        aria-label={saved ? 'Contact saved' : saving ? 'Saving contact' : existing ? 'Update lead information' : 'Save lead information'}
        aria-busy={saving}
        style={{
          width: '100%',
          padding: '8px',
          background: saved ? '#057642' : saving ? '#999' : '#0A66C2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saved ? '✓ Saved!' : saving ? 'Saving...' : existing ? 'Update Lead' : 'Save Lead'}
      </button>
    </div>
  )
}

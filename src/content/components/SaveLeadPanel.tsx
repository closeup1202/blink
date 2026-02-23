import { useState, useEffect } from 'react'
import { storage } from '@/storage'
import { parseProfileInfo } from '@/content/utils/parser'
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
  const [profileId] = useState(() => {
    // query string 제거하여 정규화
    const url = new URL(window.location.href)
    return url.origin + url.pathname.replace(/\/$/, '')
  })

  useEffect(() => {
    storage.getContact(profileId).then(c => {
      if (c) {
        setExisting(c)
        setStatus(c.status)
        setFollowUpDays(c.followUpAfterDays)
        setMemo(c.memo ?? '')
      }
    })
  }, [profileId])

  const profileInfo = parseProfileInfo()
  if (!profileInfo) return null

  async function handleSave() {
    const now = Date.now()
    const contact: Contact = {
      id: profileId,
      name: profileInfo!.name,
      title: profileInfo!.title,
      company: profileInfo!.company,
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
  }

  const cfg = STATUS_CONFIG[status]

  return (
    <div style={{
      background: 'white',
      border: '1px solid #dce6f1',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '14px',
      marginBottom: '8px',
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
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
          Status
        </label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as FollowUpStatus)}
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
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
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
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
          Notes
        </label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="Add a note..."
          rows={2}
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

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '8px',
          background: saved ? '#057642' : '#0A66C2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {saved ? '✓ Saved!' : existing ? 'Update Lead' : 'Save Lead'}
      </button>
    </div>
  )
}

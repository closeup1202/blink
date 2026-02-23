import { useEffect, useState } from 'react'
import { storage } from '@/storage'
import type { Contact } from '@/types'
import ContactList from './components/ContactList'
import { isOverdue } from '@/utils/date'

function App() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    try {
      setError(null)
      const allContacts = await storage.getAllContacts()
      setContacts(allContacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
      const message = error instanceof Error ? error.message : 'Failed to load contacts'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function sanitizeCSVField(value: string): string {
    // CSV 수식 주입 방어: =, +, -, @ 로 시작하는 경우 ' 추가
    const dangerous = /^[=+\-@\t\r]/
    let sanitized = String(value)

    if (dangerous.test(sanitized)) {
      sanitized = "'" + sanitized
    }

    // 쌍따옴표 이스케이프 및 개행문자 제거
    sanitized = sanitized
      .replace(/"/g, '""')
      .replace(/[\r\n]/g, ' ')

    return `"${sanitized}"`
  }

  function exportCSV() {
    try {
      const header = ['Name', 'Title', 'Company', 'Status', 'Last Contacted', 'Next Follow Up', 'Notes', 'Profile URL']
      const rows = contacts.map(c => [
        c.name,
        c.title ?? '',
        c.company ?? '',
        c.status,
        new Date(c.lastContactedAt).toLocaleDateString(),
        new Date(c.nextFollowUpDate).toLocaleDateString(),
        c.memo ?? '',
        c.id,
      ].map(v => sanitizeCSVField(String(v))).join(','))

      const csv = [header.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blink-contacts-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export CSV:', error)
      alert('Failed to export contacts. Please try again.')
    }
  }

  // 상태별로 그룹화
  const overdueContacts = contacts.filter(c => isOverdue(c.nextFollowUpDate) && c.status !== 'not_interested')
  const contactedContacts = contacts.filter(c => c.status === 'contacted' && !isOverdue(c.nextFollowUpDate))
  const repliedContacts = contacts.filter(c => c.status === 'replied')
  const meetingContacts = contacts.filter(c => c.status === 'meeting_booked')
  const notInterestedContacts = contacts.filter(c => c.status === 'not_interested')

  if (loading) {
    return (
      <div className="w-[400px] h-[600px] p-4 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[400px] h-[600px] p-4 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              loadContacts()
            }}
            className="bg-linkedin text-white px-4 py-2 rounded text-sm hover:bg-linkedin/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[600px] bg-white">
      {/* Header */}
      <div className="bg-linkedin text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Blink</h1>
          <p className="text-sm opacity-90">LinkedIn Follow-up</p>
        </div>
        {contacts.length > 0 && (
          <button
            onClick={exportCSV}
            className="text-xs bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded font-medium"
            title="Export to CSV"
          >
            ↓ CSV
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No contacts yet</p>
            <p className="text-sm text-gray-400">
              Visit a LinkedIn profile to save your first lead
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue */}
            {overdueContacts.length > 0 && (
              <ContactList
                title="🔴 Overdue"
                onDelete={loadContacts}
                contacts={overdueContacts}
                count={overdueContacts.length}
              />
            )}

            {/* Contacted */}
            {contactedContacts.length > 0 && (
              <ContactList
                title="🔵 Contacted"
                contacts={contactedContacts}
                count={contactedContacts.length}
                onDelete={loadContacts}
              />
            )}

            {/* Replied */}
            {repliedContacts.length > 0 && (
              <ContactList
                title="🟡 Replied"
                contacts={repliedContacts}
                count={repliedContacts.length}
                onDelete={loadContacts}
              />
            )}

            {/* Meeting Booked */}
            {meetingContacts.length > 0 && (
              <ContactList
                title="🟢 Meeting Booked"
                contacts={meetingContacts}
                count={meetingContacts.length}
                onDelete={loadContacts}
              />
            )}

            {/* Not Interested */}
            {notInterestedContacts.length > 0 && (
              <ContactList
                title="⚫ Not Interested"
                contacts={notInterestedContacts}
                count={notInterestedContacts.length}
                onDelete={loadContacts}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App

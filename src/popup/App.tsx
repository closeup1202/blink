import { useEffect, useState } from 'react'
import { storage } from '@/storage'
import type { Contact } from '@/types'
import ContactList from './components/ContactList'
import { isOverdue } from '@/utils/date'

function App() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    try {
      const allContacts = await storage.getAllContacts()
      setContacts(allContacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  // 상태별로 그룹화
  const overdueContacts = contacts.filter(c => isOverdue(c.nextFollowUpDate))
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

  return (
    <div className="w-[400px] h-[600px] bg-white">
      {/* Header */}
      <div className="bg-linkedin text-white p-4">
        <h1 className="text-xl font-bold">Blink</h1>
        <p className="text-sm opacity-90">LinkedIn Follow-up</p>
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
              />
            )}

            {/* Replied */}
            {repliedContacts.length > 0 && (
              <ContactList
                title="🟡 Replied"
                contacts={repliedContacts}
                count={repliedContacts.length}
              />
            )}

            {/* Meeting Booked */}
            {meetingContacts.length > 0 && (
              <ContactList
                title="🟢 Meeting Booked"
                contacts={meetingContacts}
                count={meetingContacts.length}
              />
            )}

            {/* Not Interested */}
            {notInterestedContacts.length > 0 && (
              <ContactList
                title="⚫ Not Interested"
                contacts={notInterestedContacts}
                count={notInterestedContacts.length}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App

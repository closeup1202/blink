import type { Contact } from '@/types'
import { getRelativeTime, getDaysOverdue, isOverdue } from '@/utils/date'
import { storage } from '@/storage'

interface ContactCardProps {
  contact: Contact
  onDelete: () => void
}

function ContactCard({ contact, onDelete }: ContactCardProps) {
  const isContactOverdue = isOverdue(contact.nextFollowUpDate)
  const daysOverdue = getDaysOverdue(contact.nextFollowUpDate)

  async function handleDelete() {
    if (!confirm(`Delete ${contact.name}?`)) return

    try {
      await storage.deleteContact(contact.id)
      onDelete()
    } catch (error) {
      console.error('Failed to delete contact:', error)
      const message = error instanceof Error ? error.message : 'Failed to delete contact'
      alert(`Error: ${message}`)
    }
  }

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      {/* Name & Company */}
      <div className="flex items-center justify-between mb-1">
        <a
          href={contact.id}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm text-linkedin hover:underline"
        >
          {contact.name}
        </a>
        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-500 transition-colors text-xs px-1"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {/* Title & Company */}
      {contact.title && (
        <div className="text-xs text-gray-600 mb-2">
          {contact.title}
          {contact.company && ` @ ${contact.company}`}
        </div>
      )}

      {/* Notes */}
      {contact.memo && (
        <div className="text-xs text-gray-500 mb-2 truncate" title={contact.memo}>
          📝 {contact.memo}
        </div>
      )}

      {/* Status & Timing */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Last: {getRelativeTime(contact.lastContactedAt)}
        </span>

        {isContactOverdue ? (
          <span className="text-red-600 font-semibold">
            {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
          </span>
        ) : (
          <span className="text-gray-400">
            Follow up: {getRelativeTime(contact.nextFollowUpDate)}
          </span>
        )}
      </div>
    </div>
  )
}

export default ContactCard

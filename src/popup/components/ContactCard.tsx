import type { Contact } from '@/types'
import { getRelativeTime, getDaysOverdue, isOverdue } from '@/utils/date'

interface ContactCardProps {
  contact: Contact
}

function ContactCard({ contact }: ContactCardProps) {
  const isContactOverdue = isOverdue(contact.nextFollowUpDate)
  const daysOverdue = getDaysOverdue(contact.nextFollowUpDate)

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      {/* Name & Company */}
      <div className="mb-1">
        <a
          href={contact.id}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm text-linkedin hover:underline"
        >
          {contact.name}
        </a>
      </div>

      {/* Title & Company */}
      {contact.title && (
        <div className="text-xs text-gray-600 mb-2">
          {contact.title}
          {contact.company && ` @ ${contact.company}`}
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

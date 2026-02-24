import { useState } from 'react'
import type { Contact } from '@/types'
import ContactCard from './ContactCard'

interface ContactListProps {
  title: string
  contacts: Contact[]
  count: number
  onDelete: () => void
}

function ContactList({ title, contacts, count, onDelete }: ContactListProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section with ${count} contact${count !== 1 ? 's' : ''}`}
        aria-expanded={isExpanded}
      >
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-2">
          <span className="bg-white px-2 py-0.5 rounded text-xs font-medium" aria-label={`${count} contact${count !== 1 ? 's' : ''}`}>
            {count}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {contacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ContactList

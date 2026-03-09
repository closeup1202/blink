import { useState } from 'react'
import type { Contact } from '@/types'
import { storage } from '@/storage'
import { logger } from '@/utils/logger'
import ContactCard from './ContactCard'

interface ContactListProps {
  title: string
  contacts: Contact[]
  count: number
  onDelete: () => void
}

function ContactList({ title, contacts, count, onDelete }: ContactListProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  async function handleDeleteGroup(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete all ${count} contact${count !== 1 ? 's' : ''} in "${title}"?`)) return
    try {
      await storage.deleteMultiple(contacts.map((c) => c.id))
      onDelete()
    } catch (err) {
      logger.error('Failed to delete group:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to delete group: ${message}`)
    }
  }

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
          <span
            className="bg-white px-2 py-0.5 rounded text-xs font-medium"
            aria-label={`${count} contact${count !== 1 ? 's' : ''}`}
          >
            {count}
          </span>
          <button
            onClick={handleDeleteGroup}
            className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
            title={`Delete all in ${title}`}
            aria-label={`Delete all contacts in ${title}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
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
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ContactList

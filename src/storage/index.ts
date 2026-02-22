import type { Contact, StorageData } from '@/types'

const STORAGE_KEY = 'blink_contacts'

/**
 * chrome.storage.local 래퍼
 */
export const storage = {
  /**
   * 모든 연락처 가져오기
   */
  async getAllContacts(): Promise<Contact[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
    return Object.values(data.contacts)
  },

  /**
   * 특정 연락처 가져오기
   */
  async getContact(id: string): Promise<Contact | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
    return data.contacts[id] || null
  },

  /**
   * 연락처 저장 또는 업데이트
   */
  async saveContact(contact: Contact): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data: StorageData = result[STORAGE_KEY] || { contacts: {} }

    data.contacts[contact.id] = contact

    await chrome.storage.local.set({ [STORAGE_KEY]: data })
  },

  /**
   * 연락처 삭제
   */
  async deleteContact(id: string): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data: StorageData = result[STORAGE_KEY] || { contacts: {} }

    delete data.contacts[id]

    await chrome.storage.local.set({ [STORAGE_KEY]: data })
  },

  /**
   * 모든 데이터 삭제
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY)
  },
}

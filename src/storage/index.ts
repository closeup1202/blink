import type { Contact, StorageData } from '@/types'

const STORAGE_KEY = 'blink_contacts'

/**
 * 익스텐션 컨텍스트가 유효한지 확인
 * chrome.runtime.id가 undefined이면 context invalidated 상태
 */
function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id
  } catch {
    return false
  }
}

/**
 * chrome.storage.local 래퍼
 */
export const storage = {
  /**
   * 모든 연락처 가져오기
   */
  async getAllContacts(): Promise<Contact[]> {
    if (!isExtensionContextValid()) return []
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      return Object.values(data.contacts)
    } catch (e) {
      console.warn('Blink: storage unavailable', e)
      return []
    }
  },

  /**
   * 특정 연락처 가져오기
   */
  async getContact(id: string): Promise<Contact | null> {
    if (!isExtensionContextValid()) return null
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      return data.contacts[id] || null
    } catch (e) {
      console.warn('Blink: storage unavailable', e)
      return null
    }
  },

  /**
   * 연락처 저장 또는 업데이트
   */
  async saveContact(contact: Contact): Promise<void> {
    if (!isExtensionContextValid()) return
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      data.contacts[contact.id] = contact
      await chrome.storage.local.set({ [STORAGE_KEY]: data })
    } catch (e) {
      console.warn('Blink: storage unavailable', e)
    }
  },

  /**
   * 연락처 삭제
   */
  async deleteContact(id: string): Promise<void> {
    if (!isExtensionContextValid()) return
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      delete data.contacts[id]
      await chrome.storage.local.set({ [STORAGE_KEY]: data })
    } catch (e) {
      console.warn('Blink: storage unavailable', e)
    }
  },

  /**
   * 모든 데이터 삭제
   */
  async clearAll(): Promise<void> {
    if (!isExtensionContextValid()) return
    try {
      await chrome.storage.local.remove(STORAGE_KEY)
    } catch (e) {
      console.warn('Blink: storage unavailable', e)
    }
  },
}

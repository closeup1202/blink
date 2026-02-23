import type { Contact, StorageData } from '@/types'

const STORAGE_KEY = 'blink_contacts'

/**
 * Storage 에러 타입
 */
export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'StorageError'
  }
}

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
   * @throws {StorageError} 익스텐션 컨텍스트가 무효하거나 storage 접근 실패 시
   */
  async getAllContacts(): Promise<Contact[]> {
    if (!isExtensionContextValid()) {
      throw new StorageError('Extension context is invalid. Please reload the extension.')
    }

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      return Object.values(data.contacts)
    } catch (e) {
      console.error('Blink: Failed to get contacts', e)
      throw new StorageError('Failed to load contacts', e)
    }
  },

  /**
   * 특정 연락처 가져오기
   * @throws {StorageError} 익스텐션 컨텍스트가 무효하거나 storage 접근 실패 시
   */
  async getContact(id: string): Promise<Contact | null> {
    if (!isExtensionContextValid()) {
      throw new StorageError('Extension context is invalid. Please reload the extension.')
    }

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      return data.contacts[id] || null
    } catch (e) {
      console.error('Blink: Failed to get contact', e)
      throw new StorageError('Failed to load contact', e)
    }
  },

  /**
   * 연락처 저장 또는 업데이트
   * @throws {StorageError} 익스텐션 컨텍스트가 무효하거나 storage 접근 실패 시
   */
  async saveContact(contact: Contact): Promise<void> {
    if (!isExtensionContextValid()) {
      throw new StorageError('Extension context is invalid. Please reload the extension.')
    }

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      data.contacts[contact.id] = contact
      await chrome.storage.local.set({ [STORAGE_KEY]: data })
    } catch (e) {
      console.error('Blink: Failed to save contact', e)
      throw new StorageError('Failed to save contact', e)
    }
  },

  /**
   * 연락처 삭제
   * @throws {StorageError} 익스텐션 컨텍스트가 무효하거나 storage 접근 실패 시
   */
  async deleteContact(id: string): Promise<void> {
    if (!isExtensionContextValid()) {
      throw new StorageError('Extension context is invalid. Please reload the extension.')
    }

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const data: StorageData = result[STORAGE_KEY] || { contacts: {} }
      delete data.contacts[id]
      await chrome.storage.local.set({ [STORAGE_KEY]: data })
    } catch (e) {
      console.error('Blink: Failed to delete contact', e)
      throw new StorageError('Failed to delete contact', e)
    }
  },

  /**
   * 모든 데이터 삭제
   * @throws {StorageError} 익스텐션 컨텍스트가 무효하거나 storage 접근 실패 시
   */
  async clearAll(): Promise<void> {
    if (!isExtensionContextValid()) {
      throw new StorageError('Extension context is invalid. Please reload the extension.')
    }

    try {
      await chrome.storage.local.remove(STORAGE_KEY)
    } catch (e) {
      console.error('Blink: Failed to clear storage', e)
      throw new StorageError('Failed to clear all data', e)
    }
  },
}

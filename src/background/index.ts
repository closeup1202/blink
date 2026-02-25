/**
 * Background Service Worker
 * - 알림 타이머
 * - Follow-up 리마인더
 */

import { storage } from '@/storage'
import type { Contact, StorageData } from '@/types'
import { isOverdue } from '@/utils/date'
import { logger } from '@/utils/logger'

// storage/index.ts와 동일한 키 (원자적 쓰기를 위해 background에서 직접 관리)
const STORAGE_KEY = 'blink_contacts'

/**
 * 스토리지 쓰기 메시지 핸들러
 * Background는 단일 스레드이므로 모든 쓰기가 직렬화됨 → race condition 방지
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'STORAGE_WRITE') return false

  handleStorageWrite(message as StorageWriteMessage)
    .then(() => sendResponse({ ok: true }))
    .catch(e => sendResponse({ error: e instanceof Error ? e.message : String(e) }))
  return true // 비동기 응답
})

type StorageWriteMessage =
  | { type: 'STORAGE_WRITE'; op: 'save'; contact: Contact }
  | { type: 'STORAGE_WRITE'; op: 'delete'; id: string }
  | { type: 'STORAGE_WRITE'; op: 'clear' }

async function handleStorageWrite(message: StorageWriteMessage): Promise<void> {
  if (message.op === 'clear') {
    await chrome.storage.local.remove(STORAGE_KEY)
    return
  }
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data: StorageData = result[STORAGE_KEY] || { contacts: {} }

  if (message.op === 'save') {
    data.contacts[message.contact.id] = message.contact
  } else if (message.op === 'delete') {
    delete data.contacts[message.id]
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: data })
}

// Extension 설치 또는 업데이트 시
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.log('Blink installed!')

  // 1시간마다 overdue 체크하는 알람 설정
  chrome.alarms.create('checkOverdue', {
    delayInMinutes: 0, // 즉시 시작
    periodInMinutes: 60, // 1시간마다
  })

  // 이미 열려있는 LinkedIn 탭에 content script 주입
  if (details.reason === 'install' || details.reason === 'update') {
    await injectContentScriptToExistingTabs()
  }
})

/**
 * 이미 열려있는 LinkedIn 탭에 content script 주입
 */
async function injectContentScriptToExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({
      url: 'https://www.linkedin.com/*'
    })

    for (const tab of tabs) {
      if (!tab.id) continue

      try {
        // content script가 이미 주입되었는지 확인
        await chrome.tabs.sendMessage(tab.id, { type: 'ping' })
      } catch {
        // 주입되지 않았으면 주입
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          })
          logger.log(`Blink: Injected into tab ${tab.id}`)
        } catch (err) {
          logger.warn(`Blink: Failed to inject into tab ${tab.id}:`, err)
        }
      }
    }
  } catch (err) {
    logger.error('Blink: Failed to inject content scripts:', err)
  }
}

// 알람 리스너
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkOverdue') {
    checkOverdueContacts()
  }
})

// Overdue 연락처 체크
async function checkOverdueContacts() {
  try {
    const contacts = await storage.getAllContacts()
    const overdueContacts = contacts.filter(contact =>
      isOverdue(contact.nextFollowUpDate) && contact.status !== 'not_interested'
    )

    if (overdueContacts.length > 0) {
      // 배지에 overdue 개수 표시
      chrome.action.setBadgeText({
        text: String(overdueContacts.length)
      })
      chrome.action.setBadgeBackgroundColor({
        color: '#CC1016'
      })
    } else {
      chrome.action.setBadgeText({ text: '' })
    }
  } catch (err) {
    logger.error('Blink: Failed to check overdue contacts:', err)
    // 에러 시 배지 초기화
    chrome.action.setBadgeText({ text: '' })
  }
}

// Storage 변경 시 overdue 체크
chrome.storage.onChanged.addListener(() => {
  checkOverdueContacts()
})

// 초기 실행 시 overdue 체크
checkOverdueContacts()

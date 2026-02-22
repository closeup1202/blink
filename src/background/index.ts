/**
 * Background Service Worker
 * - 알림 타이머
 * - Follow-up 리마인더
 */

import { storage } from '@/storage'
import { isOverdue } from '@/utils/date'

// Extension 설치 시
chrome.runtime.onInstalled.addListener(() => {
  console.log('Blink installed!')

  // 매일 overdue 체크하는 알람 설정
  chrome.alarms.create('checkOverdue', {
    periodInMinutes: 60 * 24, // 매일
  })
})

// 알람 리스너
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkOverdue') {
    checkOverdueContacts()
  }
})

// Overdue 연락처 체크
async function checkOverdueContacts() {
  const contacts = await storage.getAllContacts()
  const overdueContacts = contacts.filter(contact =>
    isOverdue(contact.nextFollowUpDate)
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
}

// Extension 아이콘 클릭 시 (popup 열릴 때) overdue 체크
chrome.action.onClicked.addListener(() => {
  checkOverdueContacts()
})

// Storage 변경 시 overdue 체크
chrome.storage.onChanged.addListener(() => {
  checkOverdueContacts()
})

// 초기 실행 시 overdue 체크
checkOverdueContacts()

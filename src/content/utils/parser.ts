/**
 * LinkedIn 프로필 정보 파싱 유틸리티
 */

import { logger } from '@/utils/logger'

export interface ProfileInfo {
  name: string
  title?: string   // Optional: LinkedIn UI 변경 시 파싱 실패 가능
  company?: string // Optional: LinkedIn UI 변경 시 파싱 실패 가능
  profileUrl: string
}

/**
 * 현재 페이지에서 프로필 정보 추출
 */
export function parseProfileInfo(): ProfileInfo | null {
  try {
    const profileUrl = window.location.href

    // 이름 추출 - 다중 fallback으로 안정성 향상
    const name = extractName()
    if (!name) {
      logger.warn('Blink: Could not extract profile name')
      return null
    }

    // 직함 및 회사 추출
    const { title, company } = extractTitleAndCompany()

    return {
      name,
      title: title || undefined,
      company: company || undefined,
      profileUrl,
    }
  } catch (error) {
    logger.error('Failed to parse profile info:', error)
    return null
  }
}

/**
 * 이름 추출 (다중 셀렉터 fallback)
 */
function extractName(): string {
  const selectors = [
    'h1.inline.t-24',                          // 기본 셀렉터
    'h1.text-heading-xlarge',                  // 새 디자인
    '.pv-top-card--list h1',                   // 레거시
    '[data-generated-suggestion-target] h1',   // 동적 로드
    'main h1',                                 // 최후 수단
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    const text = element?.textContent?.trim()
    if (text && text.length > 0 && text.length < 100) { // 합리적인 이름 길이
      return text
    }
  }

  return ''
}

/**
 * 직함 및 회사 추출 (개선된 로직)
 */
function extractTitleAndCompany(): { title: string; company: string } {
  const selectors = [
    '.text-body-medium.break-words',           // 기본
    '.pv-top-card--list .text-body-medium',    // 레거시
    '.pv-top-card-profile-picture__container ~ div .text-body-medium', // 구조 기반
  ]

  let title = ''

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    const text = element?.textContent?.trim()
    if (text && text.length > 0) {
      title = text
      break
    }
  }

  // 회사명 추출 - 개선된 정규식
  const company = extractCompanyFromTitle(title)

  return { title, company }
}

/**
 * 직함에서 회사명 추출 (개선된 정규식)
 */
function extractCompanyFromTitle(title: string): string {
  if (!title) return ''

  // 다양한 패턴 지원:
  // "Founder at Acme Inc." -> "Acme Inc."
  // "CEO @ Company" -> "Company"
  // "Director of Engineering at Google" -> "Google"

  // 1. "at" 또는 "@" 기준으로 추출 (마지막 등장 위치 사용)
  const atMatch = title.match(/\s+(?:at|@)\s+(.+?)(?:\s*[·|•]\s*|$)/i)
  if (atMatch && atMatch[1]) {
    const company = atMatch[1].trim()
    // "Director at Large" 같은 오탐 방지 (너무 짧거나 흔한 단어)
    const commonWords = ['large', 'will', 'home', 'self-employed']
    if (company.length > 2 && !commonWords.includes(company.toLowerCase())) {
      return company
    }
  }

  // 2. Fallback: 별도 회사 정보 영역 찾기 (향후 확장 가능)
  // LinkedIn이 구조를 변경할 경우를 대비한 주석
  // const companyElement = document.querySelector('[data-field="company"]')

  return ''
}

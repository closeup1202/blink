/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
/**
 * Production-safe logger utility
 * - Development: 모든 로그 출력
 * - Production: error와 warn만 출력
 */

// Vite에서 정의하는 환경변수 타입 확장
declare const __DEV__: boolean

// Development 모드 감지 (production 빌드에서는 false로 대체됨)
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production'

export const logger = {
  /**
   * 디버그 로그 (production에서는 무시됨)
   */
  log: (...args: any[]) => {
    if (IS_DEV) {
      console.log(...args)
    }
  },

  /**
   * 경고 로그 (항상 출력)
   */
  warn: (...args: any[]) => {
    console.warn(...args)
  },

  /**
   * 에러 로그 (항상 출력)
   */
  error: (...args: any[]) => {
    console.error(...args)
  },

  /**
   * 정보 로그 (production에서는 무시됨)
   */
  info: (...args: any[]) => {
    if (IS_DEV) {
      console.info(...args)
    }
  },
}

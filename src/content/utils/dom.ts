/**
 * DOM 조작 유틸리티
 */

/**
 * 요소가 이미 주입되었는지 확인
 */
export function isAlreadyInjected(id: string): boolean {
  return document.getElementById(id) !== null
}

/**
 * 요소를 특정 선택자 앞에 삽입
 */
export function insertBefore(newElement: HTMLElement, targetSelector: string): boolean {
  const target = document.querySelector(targetSelector)
  if (!target || !target.parentNode) {
    return false
  }

  target.parentNode.insertBefore(newElement, target)
  return true
}

/**
 * 요소를 특정 선택자 뒤에 삽입
 */
export function insertAfter(newElement: HTMLElement, targetSelector: string): boolean {
  const target = document.querySelector(targetSelector)
  if (!target || !target.parentNode) {
    return false
  }

  if (target.nextSibling) {
    target.parentNode.insertBefore(newElement, target.nextSibling)
  } else {
    target.parentNode.appendChild(newElement)
  }
  return true
}

/**
 * 요소를 대기하여 가져오기 - MutationObserver 기반 (즉시 감지)
 */
export function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element | null> {
  const existing = document.querySelector(selector)
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        clearTimeout(timer)
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  })
}

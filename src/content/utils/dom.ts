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
 * 요소를 대기하여 가져오기 (최대 10초)
 */
export async function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector)
    if (element) {
      return element
    }
    await sleep(100)
  }

  return null
}

/**
 * 지연 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

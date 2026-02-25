import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /**
   * 에러 발생 시 렌더링할 fallback.
   * - undefined (기본값): 내장 에러 UI 표시
   * - null: 아무것도 렌더링하지 않음 (content script 등에서 silent fail)
   * - ReactNode: 해당 요소 렌더링
   */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[Blink] ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }

      return (
        <div
          className="w-full p-4 text-center"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-red-600 font-semibold text-sm">Something went wrong</p>
          {this.state.error?.message && (
            <p className="text-xs text-gray-500 mt-1">{this.state.error.message}</p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs text-linkedin underline hover:opacity-70"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

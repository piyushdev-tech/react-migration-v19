import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// React 18 pattern: an error boundary is the primary hook for render-error
// monitoring. React 19 changed render-error behavior — errors are no longer
// re-thrown/double-logged; caught errors go to `console.error` once, uncaught
// errors go to `window.reportError`. SKILL.md Phase 7 flags this so custom
// monitoring can move to the `onCaughtError` / `onUncaughtError` /
// `onRecoverableError` options on `createRoot`.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Custom render-error monitoring hook — revisit for React 19 (see above).
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <div role="alert">Something went wrong.</div>
    }
    return this.props.children
  }
}

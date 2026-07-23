import { createRoot } from 'react-dom/client'

function Widget() {
  return <div className="border rounded p-2">Widget with custom error reporting</div>
}

// React 18 pattern: `createRoot`'s `onRecoverableError` callback receives an
// `errorInfo` object with a `digest` field (a hash React sometimes attaches to
// hydration-related errors). React 19 removes `digest` from `onRecoverableError`'s
// second argument entirely — custom error-reporting code that read `.digest` off
// of it needs to stop, since the field is simply gone from the type and the
// runtime value.
//
// Intentionally NOT wired into the live app (this repo's real root, in
// `src/main.tsx`, doesn't need custom error reporting) — a standalone
// demonstration of the option shape that would need updating.
export function mountWidgetWithDigestReporting(container: HTMLElement) {
  const root = createRoot(container, {
    onRecoverableError(error, errorInfo) {
      // React 19: `errorInfo.digest` no longer exists — this line needs to
      // drop the `.digest` read (or source it from wherever the app's own
      // error-reporting pipeline now derives a hash, if it still needs one).
      console.error('[recoverable]', error, 'digest:', errorInfo.digest)
    },
  })
  root.render(<Widget />)
  return root
}

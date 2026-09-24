import { useEffect, useState } from 'react'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'

// React 16 pattern: a `useEffect` that subscribes on mount (and whenever
// `connected` flips back on) and unsubscribes in its cleanup function — the
// standard way to track an external connection's lifecycle. This hop changes
// *when* React runs that cleanup function: React 16 runs it synchronously as
// part of unmounting/re-running the effect; React 17 defers it to run
// asynchronously instead (the same direction React 18 later standardizes
// further). No code change is required here — connect/disconnect still end up
// paired either way — but a test that asserts the cleanup already ran
// immediately after the click that triggers it (rather than `await`-ing it)
// can be affected. See the "stays paired" test in
// ConnectionStatusPanel.test.tsx below, written with `waitFor` rather than a
// synchronous assertion, and references/breaking-changes.md's
// `## React 16 → React 17` section.
export function ConnectionStatusPanel() {
  const [connected, setConnected] = useState(true)
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    if (!connected) return
    setLog((prev) => [...prev, 'connected'])
    return () => {
      setLog((prev) => [...prev, 'disconnected'])
    }
  }, [connected])

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Connection status</h2>
        <Button
          size="sm"
          variant={connected ? 'outline-secondary' : 'outline-success'}
          onClick={() => setConnected((prev) => !prev)}
          data-testid="connection-toggle"
        >
          {connected ? 'Disconnect' : 'Reconnect'}
        </Button>
      </div>
      <Badge bg={connected ? 'success' : 'secondary'} data-testid="connection-badge">
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>
      <ul className="small text-muted mt-2 mb-0 ps-3" data-testid="connection-log">
        {log.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}

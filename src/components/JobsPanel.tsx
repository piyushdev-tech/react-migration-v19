import { Component, useState, type ReactNode } from 'react'
import Button from 'react-bootstrap/Button'
import ListGroup from 'react-bootstrap/ListGroup'

interface Job {
  id: number
  name: string
  status: 'ok' | 'broken'
}

interface JobRowBoundaryState {
  hasError: boolean
}

// This boundary's own `componentDidCatch` is this app's only hook for
// render-error monitoring — it deliberately logs once per real failure so a
// "sync failures today" count could be built on top of it later.
class JobRowBoundary extends Component<{ children: ReactNode }, JobRowBoundaryState> {
  state: JobRowBoundaryState = { hasError: false }

  static getDerivedStateFromError(): JobRowBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[JobsPanel] row failed to render:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ListGroup.Item variant="danger" data-testid="job-row-error">
          Row failed to render
        </ListGroup.Item>
      )
    }
    return this.props.children
  }
}

function JobRow({ job }: { job: Job }) {
  if (job.status === 'broken') {
    throw new Error(`Job ${job.id} reported a broken sync status`)
  }
  return (
    <ListGroup.Item data-testid={`job-row-${job.id}`}>
      {job.name} — {job.status}
    </ListGroup.Item>
  )
}

const initialJobs: Job[] = [
  { id: 1, name: 'Nightly inventory sync', status: 'ok' },
  { id: 2, name: 'Payroll export', status: 'ok' },
]

// React 16 pattern: an Error Boundary is this app's only hook for render-error
// monitoring, via `componentDidCatch` logging to `console.error` once per real
// failure (above). Separately from that app-level call, React 16 itself
// double-logs a caught render error to the console (once via its own dev-mode
// announcement, once via the internal rethrow it uses to surface the error to
// browser devtools) — React 17 removes that internal duplicate, logging the
// underlying error once instead. No application code needs to change here, but
// anything that assumed the old, React-internal call count (a console.error
// spy in a test, a log-shipping integration that dedupes by call count rather
// than by error identity) was written against a count this hop changes and is
// worth re-verifying, which is what the "logs it exactly once" test in
// JobsPanel.test.tsx below does for this app's own monitoring call. See
// references/breaking-changes.md's `## React 16 → React 17` section.
export function JobsPanel() {
  const [jobs, setJobs] = useState(initialJobs)

  function breakJob(id: number) {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, status: 'broken' } : job)))
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Jobs</h2>
        <Button
          size="sm"
          variant="outline-danger"
          disabled={jobs.every((job) => job.status === 'broken')}
          onClick={() => breakJob(jobs.find((job) => job.status === 'ok')?.id ?? -1)}
          data-testid="jobs-break-button"
        >
          Simulate a sync failure
        </Button>
      </div>
      <ListGroup data-testid="jobs-list">
        {jobs.map((job) => (
          <JobRowBoundary key={job.id}>
            <JobRow job={job} />
          </JobRowBoundary>
        ))}
      </ListGroup>
    </div>
  )
}

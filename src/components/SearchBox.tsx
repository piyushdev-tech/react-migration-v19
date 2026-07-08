import { useRef, useState } from 'react'
import Button from 'react-bootstrap/Button'
import { TextField } from './TextField'
import { useRenderCount } from '../hooks/useRenderCount'

export function SearchBox() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const renderCount = useRenderCount()

  // React 18 pattern: a ref callback with an implicit return. React 18 ignored
  // the returned value; React 19 treats it as a cleanup function, so the types
  // reject it — the `no-implicit-ref-callback-return` codemod (SKILL.md Phase 5)
  // wraps the body in braces so nothing is returned.
  const attachInput = (node: HTMLInputElement | null) => (inputRef.current = node)

  return (
    <div className="d-flex flex-column gap-2" data-testid="search-box">
      <TextField ref={attachInput} label="Search todos" onChange={setQuery} />
      <div className="d-flex align-items-center gap-2">
        <Button size="sm" variant="outline-secondary" onClick={() => inputRef.current?.focus()}>
          Focus
        </Button>
        <small className="text-muted" data-testid="search-meta">
          Query: {query || '(empty)'} · renders: {renderCount}
        </small>
      </div>
    </div>
  )
}

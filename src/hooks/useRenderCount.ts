import { useRef } from 'react'

// React 18 types allow `useRef()` with no initial value. React 19 types require
// an explicit argument — the `useRef-required-initial` codemod (SKILL.md Phase 5)
// rewrites this to `useRef<number>(undefined)`.
export function useRenderCount() {
  const renders = useRef<number>(undefined)
  renders.current = (renders.current ?? 0) + 1
  return renders.current
}

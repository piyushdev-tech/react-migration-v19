import { createRef, createElement, type ReactElement } from 'react'

// React 18 pattern: reading `.ref` directly off a React element object — never
// part of the *public* TypeScript type for `ReactElement` (only `type`/`props`/
// `key` are declared, even in React 18), but a real *runtime* property that
// custom renderers, test utilities, and devtools have long reached for via an
// `any`/unknown cast. React 19 moves the actual runtime location of `ref` onto
// `element.props.ref` (since `ref` is now a normal prop) — code doing the old
// runtime access silently gets `undefined` instead of the real ref after the
// bump, which is a quieter, easier-to-miss break than a compile error.
//
// Intentionally NOT wired into the live app — this is exactly the kind of thing
// only custom tooling does, never ordinary component code — but it's real
// source so the migration can find and rewrite it.
export function getElementRef(element: ReactElement) {
  // Cast needed because `.ref` was never part of the declared `ReactElement`
  // type, even under React 18 — this line's whole point is that it works at
  // runtime today (18) and silently stops working (19) despite compiling
  // unchanged in both. Fix: read `element.props.ref` instead (a normal, typed
  // prop as of React 19).
  return (element as unknown as { ref: unknown }).ref
}

export function demoElement() {
  return createElement('div', { ref: createRef<HTMLDivElement>() })
}

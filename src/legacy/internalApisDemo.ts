// @ts-nocheck
/*
 * A single consolidated fixture for React 19's removal of several obscure,
 * never-public-API internals. These are grouped together (rather than one file
 * each, like the rest of this repo's fixtures) because they're rarely used in
 * real application code — almost exclusively found inside libraries reaching
 * into React internals — so they get lighter-weight coverage here: real source
 * text for the grep sweep and codemods to find, `@ts-nocheck`'d since some of
 * these were never type-declared as public API in the first place, and NOT
 * wired into the live app (calling several of these directly can be unsafe
 * outside the exact internal context React itself used them in).
 *
 * See `references/breaking-changes.md`'s Removed APIs table for each of these.
 */
import ReactDOM from 'react-dom'
import * as ReactIs from 'react-is'

// `unstable_flushControlled` — an internal used by a handful of libraries
// (notably some old React Native / event-batching integrations) to force-flush
// React's controlled updates. Never public API; removed in 19 with no
// replacement — remove the call.
export function legacyFlushControlled(fn: () => void) {
  ReactDOM.unstable_flushControlled(fn)
}

// `unstable_createEventHandle` — an experimental event-delegation API that
// never graduated past experimental. Removed in 19, no replacement.
export function legacyCreateEventHandle(eventType: string) {
  return ReactDOM.unstable_createEventHandle(eventType)
}

// `unstable_renderSubtreeIntoContainer` — a legacy way to render a subtree into
// a different container while preserving context from an ancestor tree
// (pre-portals). `createPortal` replaced this need long before React 19, but
// old code that never migrated to portals still sometimes called it directly.
export function legacyRenderSubtree(parent: React.Component, node: React.ReactNode, container: Element) {
  return ReactDOM.unstable_renderSubtreeIntoContainer(parent, node, container)
}

// `unstable_runWithPriority` — an internal scheduler-priority API, never
// intended for application code. Removed in 19, no replacement.
export function legacyRunWithPriority(priority: number, fn: () => void) {
  ReactDOM.unstable_runWithPriority(priority, fn)
}

// `react-is`'s older element-type-checking surface. React 19 ships an updated
// `react-is` with some methods removed/renamed — check `react-is`'s own
// changelog for the current replacement per method if application code (rare —
// mostly used inside component libraries and devtools) imports it directly.
export function legacyIsElementType(value: unknown) {
  return ReactIs.isValidElementType(value)
}

// The old single internals export — replaced by three per-package exports in
// React 19 (`__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`
// from `react`, `__DOM_INTERNALS_...` from `react-dom`,
// `__SERVER_INTERNALS_...` from `react` under the `react-server` condition).
// Officially unsupported surface area regardless of version — if a dependency
// touches this, expect to patch or replace that dependency, not just rename
// the import.
export function legacyInternalsAccess() {
  return ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
}

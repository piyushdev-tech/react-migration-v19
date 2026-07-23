# React 19 breaking changes — exhaustive reference

Loaded on demand from `SKILL.md`. This is organized by category: removed APIs, changed
behavior, TypeScript-only changes, and ecosystem-wide gotchas that recur across many
projects regardless of stack. Every item that has an official codemod lists the exact
command.

## Removed APIs

Codemods are published to the codemod.com registry and invoked as
`npx codemod run <package-name> --target <path> --no-interactive` (not
`npx codemod <package-name>` — that older path-style invocation no longer resolves).
Package names change occasionally; if a command below 404s, re-verify with
`npx codemod search react-19` before assuming the change has no codemod.

| Removed | Replacement | Codemod |
|---|---|---|
| `ReactDOM.render(el, container)` | `createRoot(container).render(el)` | `npx codemod run react-19-replace-reactdom-render --target <path> --no-interactive` |
| `ReactDOM.hydrate(el, container)` | `hydrateRoot(container, el)` | included in `react-19-migration-recipe` |
| `ReactDOM.unmountComponentAtNode(container)` | `root.unmount()` | manual — requires holding a reference to the root created by `createRoot` |
| `ReactDOM.findDOMNode(instance)` | a `ref` on the actual DOM node you need | manual — no clean automated replacement since it's context-dependent |
| String refs (`ref="foo"`, `this.refs.foo`) | callback refs or `useRef`/`createRef` | `npx codemod run react-19-replace-string-ref --target <path> --no-interactive` |
| `react-dom/test-utils` `act` | `import { act } from 'react'` | `npx codemod run react-19-replace-act-import --target <path> --no-interactive` |
| `propTypes` runtime checks | TypeScript, or the `prop-types` package purely for docs (checks are silently ignored, not an error, but stop protecting you) | included in `react-19-migration-recipe` (prop-types-to-TypeScript step) |
| `defaultProps` on **function** components | ES6 default parameters (`function Foo({ x = 1 })`) | `npx codemod run react-19-replace-default-props --target <path> --no-interactive` |
| Legacy Context (`contextTypes`, `getChildContext`) | `contextType` / `useContext` | `npx codemod run react-19-remove-legacy-context --target <path> --no-interactive` |
| UMD builds of `react`/`react-dom` | ESM/CJS builds only | only relevant if you load React via a `<script>` CDN tag without a bundler |
| `useFormState` | `useActionState` (same shape, renamed) | `npx codemod run react-19-replace-use-form-state --target <path> --no-interactive` |
| `createFactory` | JSX or plain function calls | `npx codemod run react-19-replace-create-factory --target <path> --no-interactive` |
| String-form legacy `forwardRef` wrapping (no longer needed — refs are a regular prop now) | drop the `forwardRef` wrapper | `npx codemod run react-19-remove-forward-ref --target <path> --no-interactive` |
| Module-pattern factories (a function component returning a plain object with a `render()` method, e.g. `{ render() { return <div/> } }`) | return JSX directly from the function component | manual — a pre-hooks-era pattern old enough that no codemod targets it; grep for `render()` methods on functions that aren't classes if you suspect it's present |
| `react-test-renderer/shallow` | the standalone `react-shallow-renderer` package | manual — `npm install react-shallow-renderer`, same shallow-rendering API, just no longer bundled inside `react-test-renderer` |
| `react-dom`'s `unstable_flushControlled` | — | manual — remove the call; it was never public API, only ever used by a handful of libraries reaching into React internals |
| `react-dom`'s `unstable_createEventHandle` | — | manual — same as above, an experimental internal that never shipped as public API |
| `react-dom`'s `unstable_renderSubtreeIntoContainer` | — | manual — same as above |
| `react-dom`'s `unstable_runWithPriority` | — | manual — same as above |
| `react-is`'s deprecated element-type-checking methods | current `react-is` exports (check its own changelog for the replacement name per method) | manual — only matters if application code imports `react-is` directly, which is uncommon outside component libraries |

## Changed behavior (not removed, but different)

- **`element.ref` moved into `element.props.ref`, and reading the old location now
  warns** (not just a silent behavior change). Code that reads `.ref` directly off a
  React element (rare, usually in test utilities or custom renderers) needs to read
  `element.props.ref` instead — grep for `.ref` accesses that aren't
  `useRef`/`createRef`/`forwardRef`/`element.props.ref` if you maintain either kind of
  code.
- **Ref callbacks can now return a cleanup function**, mirroring `useEffect`. If your
  ref callback used to return something incidentally (e.g. an implicit arrow-function
  return), that return value is now treated as a cleanup function rather than ignored.
- **Errors thrown during render are no longer duplicated to the console.** Previously:
  caught by `console.error` *and* re-thrown. Now: uncaught errors go to
  `window.reportError`, caught errors (by an Error Boundary) go to `console.error`
  once. If you have custom error-reporting middleware that assumed re-throwing, wire it
  up via the new `onCaughtError` / `onUncaughtError` / `onRecoverableError` options
  passed to `createRoot`/`hydrateRoot`.
- **Hydration mismatch errors are consolidated** into a single, more readable diff
  instead of multiple separate warnings.
- **Internal APIs renamed — and split per package.** The single
  `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` export is gone; it's now three
  separate exports depending on which package/condition you're in:
  `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE` (from `react`),
  `__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE` (from `react-dom`), and
  `__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE` (from `react` under
  the `react-server` condition). This is officially unsupported surface area, so if you
  (or a dependency) touch it, expect to fix it manually — check which package the
  broken reference actually came from before picking the replacement name.
- **Context can be used directly as a provider**: `<MyContext value={x}>` now works
  without `.Provider`. `<Context.Provider>` still works but is on a deprecation path —
  not urgent to change, but new code should prefer the shorthand.
- **`<StrictMode>` double-invoke behavior changed.** `useMemo`/`useCallback` now reuse
  their memoized result across Strict Mode's intentional double-render instead of
  recomputing — if code was relying on the second invocation actually re-running (a
  latent bug in itself), that assumption breaks. Ref callback cleanup functions are now
  also double-invoked on mount, mirroring the double-invoke Strict Mode already does for
  effects.
- **`<Suspense>` timing changed.** A fallback now commits immediately instead of
  waiting for the rest of the sibling tree to finish rendering, and once a fallback
  commits, React pre-warms the suspended sibling that caused it. Mostly a perceived-
  performance improvement, but code that depended on the old commit ordering (rare) can
  observe a difference.
- **`javascript:` URLs in `src`/`href` now throw an error** instead of silently
  executing — this was always a discouraged/dangerous pattern (XSS-adjacent), and
  React 19 turns it into a hard error rather than a warning.
- **`errorInfo.digest` removed from the `onRecoverableError` callback's second
  argument.** If custom error-reporting code read `.digest` off of it, that field is
  gone — check `onRecoverableError`'s updated signature if you have such code.
- **The modern JSX transform is now required.** React 19 assumes the `react-jsx`/
  `react-jsxdev` runtime; the old classic transform (implicit `React.createElement`
  calls requiring `import React from 'react'` in every file) is no longer supported.
  Virtually every current bundler/toolchain (Vite, current Next.js, current CRA,
  modern Babel/TS configs) already defaults to the modern transform, so this is rarely
  an active problem — but if `tsconfig.json`'s `"jsx"` is explicitly set to `"react"`
  (classic) rather than `"react-jsx"`, that needs to change.

## Deprecated (not removed — still works, but don't add new usage)

- **`react-test-renderer` (the whole package, not just `/shallow`) is deprecated** in
  favor of React Testing Library for web and Testing Library React Native for native.
  It still runs on React 19, but treat any remaining usage as a migration target, not
  just the `/shallow` entry point specifically (see the Removed APIs table above for
  that one).

## TypeScript-only changes

Run first: `npx types-react-codemod@latest preset-19 ./src` — handles the bulk of
these. Individually:

- **`useRef()` now requires an argument.** `useRef<HTMLDivElement>()` becomes
  `useRef<HTMLDivElement>(null)`. Codemod: `useRef-required-initial`.
- **`MutableRefObject`/`RefObject` distinction is gone.** All refs — mutable or not —
  now type as a single `RefObject<T>`. If code branched on `MutableRefObject` vs.
  `RefObject` specifically, that distinction no longer exists in the type system.
  Codemod: `refobject-defaults` (part of `preset-19`) handles the common cases.
- **Ref callback implicit returns are now a type error**, because a return value is
  meaningful (cleanup function) as of the behavior change above. Codemod:
  `no-implicit-ref-callback-return`.
- **The global `JSX` namespace moved to `React.JSX`.** If you augment JSX types (e.g. to
  add custom intrinsic elements), wrap the augmentation in
  `declare module "react/jsx-runtime"` (for `"jsx": "react-jsx"`),
  `declare module "react/jsx-dev-runtime"` (for `"jsx": "react-jsxdev"`), or
  `declare module "react"` (for `"jsx": "react"` / `"preserve"`) — depending on your
  `tsconfig.json` `"jsx"` setting. Codemod: `scoped-jsx`.
- **`useReducer` generic usage changed.** It no longer accepts the full reducer
  function type as a single type parameter — rely on contextual inference, or supply
  both the state and action types explicitly. No automated codemod; fix per call site.
- **`ReactElement["props"]` now defaults to `unknown` instead of `any`.** Any code that
  did unsound things with `element.props` relying on the old implicit `any` (e.g.
  accessing arbitrary properties without a type guard) now gets a type error, since
  `unknown` requires narrowing first. Run
  `npx types-react-codemod@latest react-element-default-any-props ./src` after the
  main preset if you need to restore the old `any` default rather than fix each
  call site (only do this as a stopgap — it's opting back into the unsound behavior).

Full list of individually invokable type codemods (interactive picker):
`npx types-react-codemod <codemod-name> <path>` — choices include `context-any`,
`deprecated-legacy-ref`, `deprecated-prop-types-types`, `deprecated-react-child`,
`deprecated-react-fragment`, `deprecated-react-node-array`, `deprecated-react-text`,
`deprecated-react-type`, `deprecated-sfc-element`, `deprecated-sfc`,
`deprecated-stateless-component`, `deprecated-void-function-component`,
`implicit-children`, `no-implicit-ref-callback-return`, `preset-18`, `preset-19`,
`react-element-default-any-props`, `refobject-defaults`, `scoped-jsx`,
`useCallback-implicit-any`, `useRef-required-initial`.

## Ecosystem-wide gotchas (recur across many projects)

These aren't React-19 API changes per se, but they're the most common reason a React 19
upgrade fails or misbehaves in practice, because they involve a third party rather than
React itself.

- **Data-grid / table libraries.** Many capped their peer dependency at `^18.0.0` for a
  while after React 19's release, which makes `npm install` fail with `ERESOLVE` the
  moment React is bumped — not a warning, a hard install failure. Always check
  `npm view <package> peerDependencies` for the grid/table library *before* bumping
  React, and upgrade it first if needed.
- **Any UI kit whose overlay/modal/transition components wrap
  `react-transition-group`-style DOM measurement.** These often used
  `ReactDOM.findDOMNode` internally to find the underlying DOM node of a transitioning
  child. Since `findDOMNode` is fully removed (not just deprecated) in React 19, an
  outdated version of such a library will throw at runtime, not just warn. Upgrade the
  UI kit to a version whose release notes explicitly mention React 19 support / removal
  of `findDOMNode` usage.
- **`@testing-library/react` below v14–16.** Older versions used `findDOMNode`
  internally and/or don't declare a React 19 peer range. Upgrade to the latest major
  before or alongside the React bump, not after — otherwise test failures will look
  like React 19 bugs when they're actually a stale testing-library version.
- **Anything importing `act` from `react-dom/test-utils`.** This throws once
  `react-dom/test-utils` no longer exports it. Codemod:
  `npx codemod run react-19-replace-act-import --target <path> --no-interactive` — but
  also check custom test-setup files and any internal testing utility wrappers, since
  codemods only scan application source by default.
- **`<Activity>` (introduced in React 19.2) and stateful third-party widgets.** If you
  adopt `<Activity mode="hidden">` to keep off-screen UI mounted, verify how any
  complex stateful child (data grids, rich text editors, canvas-based widgets) behaves
  when hidden — some libraries don't expect to be kept mounted-but-hidden and can lose
  internal state or throw when their container is detached from layout. This is a
  new-feature-adoption concern, not a plain upgrade concern, but it's a common follow-up
  question once teams are on 19.2+.

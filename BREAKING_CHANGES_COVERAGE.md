# Breaking-changes fixture coverage

This maps every item in
[`breaking-changes.md`](./.claude/skills/react19-migration/references/breaking-changes.md)
to the fixture file(s) under `src/` that exercise it, so a full migration run can be
checked against this list afterward: did the codemods/grep sweep/manual-fix phases
actually catch and correctly fix every one of these?

**Wired** = imported into the live app (`Home.tsx`) and/or has a test that actually
exercises it; the per-component fix-and-verify loop (`IMPLEMENT.md` Phase 7) will run
against these directly. **Unwired** = real, type-checked source under `src/legacy/`
that the grep sweep and codemods still find and rewrite, but never executed by the app
or test suite — matching this repo's existing convention (`LegacyThemeContext.tsx`,
`LegacyTodoList.tsx`) for patterns that are unsafe, meaningless, or impractical to
actually run (e.g. calling an internal API directly, or an SSR-only API in a pure SPA).

Every fixture was verified to compile and pass **on the true React 18.3.0 baseline**
before being counted as valid — several assumptions were checked live and corrected
along the way (see "Verification notes" at the bottom).

## Removed APIs

| Breaking change | Fixture | Status |
|---|---|---|
| `ReactDOM.render` | `src/legacy/mountReleaseBanner.tsx` | Wired (called from `main.tsx`) |
| `ReactDOM.hydrate` | `src/legacy/hydrateWidget.tsx` | Unwired — no real SSR markup in this SPA to hydrate against |
| `ReactDOM.unmountComponentAtNode` | `src/legacy/mountReleaseBanner.tsx` | Wired |
| `ReactDOM.findDOMNode` | `src/components/OutsideClick.tsx` | Wired (rendered on Home, no test) |
| String refs (`ref="foo"`, `this.refs.foo`) | `src/legacy/LegacyTodoList.tsx` | Unwired |
| `react-dom/test-utils` `act` | `src/components/SearchBox.test.tsx` | Wired (test) |
| `propTypes` runtime checks | `src/legacy/LegacyTodoList.tsx`, `src/legacy/LegacyThemeContext.tsx` | Unwired |
| `defaultProps` on function components | `src/components/TextField.tsx`, `src/legacy/LegacyTodoList.tsx` | Wired / Unwired |
| Legacy Context (`contextTypes`, `getChildContext`) | `src/legacy/LegacyThemeContext.tsx` | Unwired |
| UMD builds of `react`/`react-dom` | *(not fixtured)* | Build/loading concern, not expressible as app source — see notes |
| `useFormState` | *(not fixtured)* | **Not applicable to this repo's baseline** — see notes |
| `createFactory` | `src/components/CreateFactoryWidget.tsx` (+ test) | Wired |
| Legacy `forwardRef` wrapping | `src/components/TextField.tsx` | Wired |
| Module-pattern factories | `src/legacy/moduleFactoryComponent.tsx` | Unwired (`@ts-nocheck`) |
| `react-test-renderer/shallow` | `src/legacy/shallowRendererUsage.test.tsx` | Wired (test; added `react-test-renderer`/`@types/react-test-renderer` devDependencies) |
| `react-dom`'s `unstable_flushControlled` | `src/legacy/internalApisDemo.ts` | Unwired (`@ts-nocheck`) |
| `react-dom`'s `unstable_createEventHandle` | `src/legacy/internalApisDemo.ts` | Unwired (`@ts-nocheck`) |
| `react-dom`'s `unstable_renderSubtreeIntoContainer` | `src/legacy/internalApisDemo.ts` | Unwired (`@ts-nocheck`) |
| `react-dom`'s `unstable_runWithPriority` | `src/legacy/internalApisDemo.ts` | Unwired (`@ts-nocheck`) |
| `react-is`'s deprecated element-type-checking methods | `src/legacy/internalApisDemo.ts` | Unwired (`@ts-nocheck`) |

## Changed behavior

| Breaking change | Fixture | Status |
|---|---|---|
| `element.ref` → `element.props.ref` (+ now warns) | `src/legacy/elementRefDirectRead.ts` | Unwired — runtime behavior change, not a compile error; no automated test can show "before vs after" in one version |
| Ref callback implicit return → cleanup function | `src/components/SearchBox.tsx` | Wired (test) |
| Errors no longer re-thrown/double-logged | `src/components/ErrorBoundary.tsx` | Wired (no test — verified by direct review per `IMPLEMENT.md` Phase 9 item 1) |
| Hydration mismatch errors consolidated | *(not fixtured)* | Dev-console output formatting only — nothing to fix in source |
| Internal APIs renamed (3-way split) | `src/legacy/internalApisDemo.ts` | Unwired (`@ts-nocheck`) |
| Context-as-provider shorthand (`<Context value={x}>`) | *(not fixtured)* | **Not a breaking change** — new capability, old `.Provider` form still works |
| StrictMode `useMemo`/`useCallback` reuse + ref cleanup double-invoke | *(not fixtured)* | Runtime timing/behavior nuance, not code that needs migrating; the whole app already runs under `<StrictMode>` (`main.tsx`), so this is naturally exercised, just not asserted by a dedicated test |
| Suspense fallback timing changed | *(not fixtured)* | Same as above — behavior nuance, no `<Suspense>` boundary in this app to demonstrate it against |
| `javascript:` URLs in `src`/`href` now throw | `src/legacy/javascriptUrlDemo.tsx` | Unwired — would throw for real once migrated, which isn't safe to wire into a running app |
| `errorInfo.digest` removed from `onRecoverableError` | `src/legacy/errorInfoDigestDemo.tsx` | Unwired |
| Modern JSX transform required | *(not fixtured)* | This project's `tsconfig.json` already uses `"jsx": "react-jsx"` — nothing to demonstrate breaking |

## Deprecated (not removed)

| Breaking change | Fixture | Status |
|---|---|---|
| `react-test-renderer` (whole package) deprecated | `src/legacy/shallowRendererUsage.test.tsx` | Same fixture as the `/shallow` removal above — installing the package at all is the deprecated part |

## TypeScript-only changes

| Breaking change | Fixture | Status |
|---|---|---|
| `useRef()` requires an argument | `src/hooks/useRenderCount.ts` | Wired (consumed by `SearchBox`) |
| `MutableRefObject`/`RefObject` distinction gone | `src/components/ReducerDemo.tsx` | Wired (test) |
| Ref callback implicit returns are a type error | `src/components/SearchBox.tsx` | Wired (test) — same fixture as the runtime behavior change above, since it's one code change with both a type-level and runtime-level consequence |
| Global `JSX` namespace → `React.JSX` | `src/legacy/globalJsxAugmentation.d.ts` + `src/legacy/globalJsxUsage.tsx` | Unwired (type-checked, not rendered) |
| `useReducer` generic usage changed | `src/components/ReducerDemo.tsx` | Wired (test) |
| `ReactElement["props"]` defaults to `unknown`, not `any` | `src/legacy/reactElementPropsAny.ts` | Unwired (type-checked, not called) |

## Ecosystem-wide gotchas

These are about **which third-party package versions are installed**, not app source
code — Phase 1's live peer-dependency check is what actually exercises these, not a
fixture file. Not applicable to this coverage list; see `PLAN.md` Phase 1 instead.

## Verification notes (things checked live rather than assumed)

- **`useFormState` is genuinely not fixturable against this repo's baseline.** Checked
  the actual published `react-dom@18.3.0` tarball directly (not just its types) — it
  does not export `useFormState` at all; that API only ever shipped in canary/
  experimental builds before becoming `useActionState` in React 19. A codebase
  legitimately pinned to stable React 18.3.0 (like this one) could never have used it,
  so there's nothing real to migrate away from. Documented here rather than forcing a
  fake or silently dropping the item.
- **`react-test-renderer`'s latest version requires React 19.2.8+** (`peerDependencies:
  { react: "^19.2.8" }`) — one patch *ahead* of this project's `19.2.7` target. Installed
  `react-test-renderer@18.3.0` (peer `^18.3.0`, matching this repo's baseline exactly)
  for the "before" fixture; a real migration run will hit this exact peer-version edge
  case in Phase 1/6 and need to decide whether to bump the React target to `19.2.8+` or
  pin an older `react-test-renderer` — a genuinely useful real-world test of that phase.
- **`element.ref` was never in `ReactElement`'s public TypeScript type**, even under
  React 18 (only `type`/`props`/`key` are declared) — confirmed against the actual
  `@types/react@18.3.9` source. That fixture is a runtime behavior difference, not a
  compile-time one; written accordingly (an explicit cast, not a `@ts-expect-error`).
- **`ReactElement<P = any, ...>`** — confirmed the `any` default directly in
  `@types/react@18.3.9`, so `reactElementPropsAny.ts`'s unsound access genuinely compiles
  clean today and is expected to fail once `@types/react@19` changes that default to
  `unknown`.
- **`onRecoverableError`'s `errorInfo.digest`** — confirmed present in
  `@types/react-dom@18.3.7`'s `client.d.ts` before writing that fixture.
- **`React.createFactory`** — confirmed as a real runtime export (`exports.createFactory`)
  in the published `react@18.3.0` bundle, not just an internal implementation detail.
- **`act` is not exported from `'react'` in `react@18.3.0`** — confirmed directly
  (`typeof require('react').act === 'undefined'`) after an initial attempt assumed
  otherwise; `legacyTestUtilsUsage.test.ts` was written without relying on it.
- **`Simulate` (from `react-dom/test-utils`) only resolves correctly against a tree
  mounted via classic `ReactDOM.render`**, not `createRoot` — discovered by an actual
  test failure (`Cannot read properties of null`) during verification, not assumed
  upfront. That fixture uses `ReactDOM.render`/`unmountComponentAtNode` for this reason,
  which is also authentic to how such tests really looked pre-React-18.

## What this means for a migration run

A complete, correct migration should leave **zero** matches for the "Removed APIs" and
"Changed behavior" patterns above anywhere in `src/` (comments aside), and `npm run
build`/`npm test` should stay green throughout using the target React 19 version. If a
future run's grep sweep or business-logic-freeze diff can't account for one of these
fixtures, that's a real gap in the migration, not a false positive — check this file
before assuming a codemod's silence means "nothing to do here."

# Migrating this repo from React 18.3.0 to React 19.2.7

This document is the concrete, step-by-step playbook for upgrading **this specific
codebase** — Vite + TypeScript, Zustand, TanStack React Query, ag-grid, react-bootstrap,
react-router-dom, Vitest + React Testing Library — from React 18.3.0 to React 19.2.7.

It focuses on **breaking changes**, not new React 19 features. Adopting Actions,
`useOptimistic`, Server Components, etc. is a separate, optional follow-up once the app
is stable on React 19.

For the generalized, repo-agnostic version of this workflow (useful for other React 18
projects), see [`SKILL.md`](./SKILL.md).

---

## 1. Pre-flight checklist

- [ ] Working tree is clean and on a dedicated branch (`git checkout -b upgrade/react-19`) —
      the official codemods require a git repo to run safely.
- [ ] CI is green on `main` before you start.
- [ ] You are already on `react@18.3.x` (this repo is). React 18.3 is functionally
      identical to 18.2 but adds console warnings for everything that breaks in 19 —
      run the app and test suite once *before* touching versions and read the console
      output. Anything that warns here breaks in React 19.
- [ ] Confirm test coverage exists for: the pages that use ag-grid, any Bootstrap
      `Modal`/`Overlay`/`Tooltip`, and any component using refs into third-party DOM
      nodes. These are the highest-risk areas (see §4).

## 2. Compatibility matrix for this stack

Check these **before** bumping React, not after — an incompatible transitive peer
dependency will hard-fail `npm install` with `ERESOLVE` once React is on 19.

| Package | Version in this repo | Minimum version for React 19 | Notes |
|---|---|---|---|
| `react` / `react-dom` | 18.3.0 | 19.2.7 (target) | — |
| `react-router-dom` | ^7.18.1 | already supports `^18 \|\| ^19` | No action needed. Only the newer, unified `react-router` package (v8+) requires `react>=19.2.7` as a hard peer minimum — that's only relevant if you separately choose to move off `react-router-dom` onto the unified package. |
| `react-bootstrap` | ^2.10.10 | 2.10.x (already on it) | Older react-bootstrap majors called `ReactDOM.findDOMNode` internally (used by `Modal`, `OverlayTrigger`, `Transition`). React 19 removes `findDOMNode` entirely — this throws, not just warns. Current 2.10.x has removed those internal calls. Confirm you're not pinned below that. |
| `ag-grid-community` / `ag-grid-react` | ^36.0.0 | must be a version whose peer range includes `^19.0.0` | Versions around 32.x and earlier cap their peer dep at `^18.0.0`, which makes `npm install` fail outright on React 19 (`ERESOLVE`). Upgrade ag-grid *before* bumping React, and re-check `npm ls ag-grid-react` after. |
| `zustand` | ^5.0.14 | `>=18.0.0` peer, no 19-specific change | No code changes required. |
| `@tanstack/react-query` | ^5.101.2 | peer is `^18 \|\| ^19` already | No code changes required. |
| `@testing-library/react` | ^16.0.1 | must be `>=16` | v16's peer range covers `^18.0.0 \|\| ^19.0.0`. Versions before 14 also called `findDOMNode` internally in test utilities — v16 doesn't. |
| `vitest` / `jsdom` | current | no React-version constraint | Keep jsdom reasonably current so DOM API gaps aren't mistaken for React 19 issues. |

Run this to double check before you start:

```bash
npm view ag-grid-react peerDependencies
npm view react-bootstrap peerDependencies
npm view @testing-library/react peerDependencies
```

## 3. Step-by-step upgrade

### 3.1 Run the official codemods first

The React team publishes codemods (via codemod.com) that handle most of the mechanical
changes automatically. Run them **before** manually bumping the React version in
`package.json` — they work against the React-18 syntax and rewrite it into
19-compatible form:

```bash
# Runs the full recipe: replace-reactdom-render, replace-string-ref,
# replace-act-import, replace-use-form-state, prop-types-typescript
npx codemod react/19/migration-recipe

# TypeScript-specific type migrations (useRef, ref callbacks, JSX namespace, etc.)
npx types-react-codemod@latest preset-19 ./src

# Only if you have code that reads element.props in untyped/loose ways
npx types-react-codemod@latest react-element-default-any-props ./src
```

Review every file the codemods touch — they're reliable but not infallible,
particularly around ref callbacks.

### 3.2 Manually search for patterns codemods won't catch

```bash
# Legacy Context API
grep -rn "contextTypes\|getChildContext" src/

# Direct access to element.ref (moved to element.props.ref in React 19)
grep -rn "\.ref\b" src/ | grep -v "\.props\.ref\|useRef\|forwardRef\|createRef"

# Anyone reaching into React internals directly (renamed in 19)
grep -rn "SECRET_INTERNALS" src/ node_modules/*/package.json 2>/dev/null

# defaultProps on function components (removed in 19; class components unaffected)
grep -rn "\.defaultProps" src/
```

### 3.3 Upgrade the breaking-change-sensitive dependencies

Do this *before* bumping React itself, so `npm install` doesn't fail mid-upgrade:

```bash
npm install ag-grid-community@latest ag-grid-react@latest
npm install react-bootstrap@latest
npm install -D @testing-library/react@latest
```

Run the test suite and app once here, still on React 18.3, to confirm these upgrades
alone didn't regress anything.

### 3.4 Bump React itself

```bash
npm install --save-exact react@19.2.7 react-dom@19.2.7
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

### 3.5 Fix TypeScript compile errors

Expect a handful of these, all documented in the React 19 upgrade guide:

- `useRef()` with no argument now errors — pass an explicit initial value
  (`useRef<HTMLDivElement>(null)`).
- Ref callbacks with an implicit return (`ref={(el) => (instance = el)}`) are now
  rejected by TypeScript, because a returned value is treated as a ref cleanup
  function. Wrap the body in braces so nothing is returned.
- If you augment the global `JSX` namespace anywhere, it now needs to be wrapped in
  `declare module "react/jsx-runtime"` (or `react`, depending on your `tsconfig.json`
  `"jsx"` setting) instead of the bare global `JSX` namespace.
- `useReducer<...>` generic usage may need adjusting — it no longer accepts the full
  reducer type as a single type parameter.

### 3.6 Fix the runtime breaks

- Anything still calling `ReactDOM.render`, `ReactDOM.hydrate`, or
  `ReactDOM.unmountComponentAtNode` needs to move to `createRoot(...).render(...)` /
  `hydrateRoot(...)` / `root.unmount()` — the codemod recipe in §3.1 handles the common
  cases, but double check anything dynamically constructed.
- `ReactDOM.findDOMNode` is gone — if your own code (not a dependency) calls it,
  replace it with a ref on the actual element you need.
- `import { act } from 'react-dom/test-utils'` no longer works — import `act` from
  `react` instead (the codemod recipe includes `replace-act-import`, but double-check
  any custom test helpers).
- String refs (`ref="myRef"`) are fully removed — use `useRef`/callback refs.

### 3.7 Error handling changes — check if this affects you

React 19 no longer double-logs errors thrown during render. If you have custom error
monitoring that depended on errors being re-thrown to `window.onerror`, move that logic
to the new `onCaughtError` / `onUncaughtError` / `onRecoverableError` options on
`createRoot`/`hydrateRoot`. If you don't have custom render-error monitoring, there's
nothing to do here.

### 3.8 Run the test suite

```bash
npm test
```

Fix any remaining `act()` warnings-turned-errors, then re-run.

### 3.9 Manual QA pass (StrictMode will be your friend here)

With `<StrictMode>` still wrapping the app root, click through:

- Every ag-grid instance: sort, filter, inline edit, row selection. Watch the console
  for `ResizeObserver` errors (a known issue during React 19 betas that's fixed in
  current ag-grid releases, but re-check if you see it).
- Every react-bootstrap `Modal`, `OverlayTrigger`, and `Tooltip` — these were the most
  common source of `findDOMNode` warnings pre-upgrade.
- Route transitions via react-router-dom.
- Zustand-driven state updates and React Query loading/error/success states.

### 3.10 Production build

```bash
npm run build
```

Confirm it completes without new console errors and the bundle size hasn't
unexpectedly changed.

## 4. Known gotchas specific to this stack

- **ag-grid + `<Activity>`**: if you later adopt React 19.2's `<Activity>` component to
  keep hidden UI mounted, be aware of a known issue where switching an ag-grid instance
  into hidden Activity mode can destroy the grid's internal state (filters, etc.) even
  though the component doesn't fully unmount. Don't wrap `AgGridReact` in `<Activity
  mode="hidden">` without testing this specifically against your current ag-grid
  version.
- **ag-grid peer dependency trap**: this is the single most common install-time failure
  when upgrading. If `npm install` fails with `ERESOLVE` mentioning `ag-grid-react`,
  it's almost always because the installed ag-grid version predates React 19 peer
  support — upgrade ag-grid first (§3.3), not React.
- **react-bootstrap Transition-based components**: `Modal`, `OverlayTrigger`, `Fade`,
  and `Collapse` all previously relied on `findDOMNode` under the hood to hook into
  `react-transition-group`. This is why react-bootstrap needs to be current — an old
  cached version can silently reappear via a lockfile that wasn't regenerated.
- **react-router-dom stays as-is**: don't feel pressured to jump to the newer unified
  `react-router` package as part of this migration — they're separate concerns. Do it
  later, deliberately, if at all.

## 5. Rollback plan

Because the codemods and dependency bumps are committed incrementally on a branch:

1. If §3.3 dependency upgrades cause regressions, `git revert` just that commit and
   re-open issues against the specific package before retrying.
2. If React 19 itself causes a regression that can't be fixed quickly, revert the
   `react`/`react-dom`/`@types/react*` bump commit — the dependency upgrades from §3.3
   are backward-compatible with React 18.3 and can stay.
3. Keep the branch's commits scoped (codemods → dependency bumps → React version bump →
   manual fixes) specifically so any of these can be reverted independently.

## 6. Final verification checklist

- [ ] `npm test` passes with zero `act()`-related console errors
- [ ] `npm run build` completes cleanly
- [ ] No `findDOMNode`, legacy Context, or string-ref warnings in the dev console
- [ ] ag-grid: sort/filter/edit/select all verified manually
- [ ] react-bootstrap: Modal/Overlay/Tooltip verified manually
- [ ] Error monitoring (if any) still captures render errors after the change in §3.7
- [ ] `package.json` shows `react`/`react-dom` at exactly `19.2.7`, with no duplicate
      React copies in `npm ls react`

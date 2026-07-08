# Migrating this repo from React 18.3.0 to React 19.2.7

This document is the concrete, phased playbook for upgrading **this specific
codebase** — Vite + TypeScript, Zustand, TanStack React Query, ag-grid, react-bootstrap,
react-router-dom, Vitest + React Testing Library — from React 18.3.0 to React 19.2.7.

It focuses on **breaking changes**, not new React 19 features. Adopting Actions,
`useOptimistic`, Server Components, etc. is a separate, optional follow-up once the app
is stable on React 19.

For the generalized, repo-agnostic version of this workflow (useful for other React 18
projects), see [`SKILL.md`](./.claude/skills/react19-migration/SKILL.md).

Each phase below has an **entry condition** and an **exit condition**. Don't start
phase N+1 until phase N's exit condition is actually green — the gates are what make it
safe to run this mostly unattended.

## Auto-approved commands (read-only — don't stop to confirm these)

These inspect state and change nothing, so they run freely across every phase without
per-command approval. They're pre-authorized in `.claude/settings.local.json`:

```bash
npm view <pkg> peerDependencies
npm ls [<pkg>]
npm outdated
npm test
npm run build
npm run lint
grep -rn "<pattern>" src/
```

Anything that installs, replaces, or edits files (`npm install`, the codemods, source
edits, `git commit`) still deserves the normal confirm-before-mutating care — see
[SKILL.md](./.claude/skills/react19-migration/SKILL.md) — but a dependency *check*
shouldn't wait on the same approval as a dependency *change*.

## Phase 0 — Baseline

**Entry:** on `react@18.3.0`. **Exit:** a known-good baseline recorded before anything
changes.

- [ ] Working tree is clean and on a dedicated branch (`git checkout -b upgrade/react-19`)
      — the official codemods require a git repo to run safely.
- [ ] CI is green on `main` before you start.
- [ ] `npm test` and `npm run build` both pass on 18.3.0 right now — this is the
      baseline every later phase is compared against.
- [ ] Confirm test coverage exists for: `TodosGrid` (ag-grid), `NavBar` (react-bootstrap
      `Navbar`/`Nav`), and any component using refs into third-party DOM nodes. These
      are the highest-risk areas (see §Known gotchas). All three currently have tests
      (`src/components/*.test.tsx`) — don't add coverage speculatively, just confirm
      it still exists.

## Phase 1 — Compatibility matrix for this stack (validation-only)

**Entry:** Phase 0 exit is green. **Exit:** the table below is re-verified live, not
assumed from memory.

| Package | Version in this repo | Minimum version for React 19 | Notes |
|---|---|---|---|
| `react` / `react-dom` | 18.3.0 | 19.2.7 (target) | — |
| `react-router-dom` | ^7.18.1 | already supports `^18 \|\| ^19` | No action needed. Only the newer, unified `react-router` package (v8+) requires `react>=19.2.7` as a hard peer minimum — irrelevant unless you separately choose to move off `react-router-dom`. |
| `react-bootstrap` | ^2.10.10 | 2.10.x (already on it) | Older react-bootstrap majors called `ReactDOM.findDOMNode` internally (used by `Modal`, `OverlayTrigger`, `Transition`). React 19 removes `findDOMNode` entirely — this throws, not just warns. Current 2.10.x has removed those internal calls. Confirm you're not pinned below that. |
| `ag-grid-community` / `ag-grid-react` | ^36.0.0 | must be a version whose peer range includes `^19.0.0` | Versions around 32.x and earlier cap their peer dep at `^18.0.0`, which makes `npm install` fail outright on React 19 (`ERESOLVE`). Upgrade ag-grid *before* bumping React, and re-check `npm ls ag-grid-react` after. |
| `zustand` | ^5.0.14 | `>=18.0.0` peer, no 19-specific change | No code changes required. |
| `@tanstack/react-query` | ^5.101.2 | peer is `^18 \|\| ^19` already | No code changes required. |
| `@testing-library/react` | ^16.0.1 | must be `>=16` | v16's peer range covers `^18.0.0 \|\| ^19.0.0`. Versions before 14 also called `findDOMNode` internally in test utilities — v16 doesn't. |
| `vitest` / `jsdom` | current | no React-version constraint | Keep jsdom reasonably current so DOM API gaps aren't mistaken for React 19 issues. |

Run this to double check before you start (all read-only, auto-approved):

```bash
npm view ag-grid-react peerDependencies
npm view react-bootstrap peerDependencies
npm view @testing-library/react peerDependencies
```

- [ ] All three commands re-run and the table above still matches reality.

## Phase 2 — Mechanical codemods

**Entry:** Phase 1 exit is green. **Exit:** codemods have run and every touched file
reviewed.

```bash
# Runs the full recipe: replace-reactdom-render, replace-string-ref,
# replace-act-import, replace-use-form-state, prop-types-typescript
npx codemod react/19/migration-recipe

# TypeScript-specific type migrations (useRef, ref callbacks, JSX namespace, etc.)
npx types-react-codemod@latest preset-19 ./src

# Only if you have code that reads element.props in untyped/loose ways
npx types-react-codemod@latest react-element-default-any-props ./src
```

- [ ] Every file the codemods touched has been reviewed (particularly ref callbacks).
- [ ] `src/main.tsx` already uses `createRoot` + `StrictMode` (verified — no
      `ReactDOM.render`/`hydrate` calls exist in this repo), so this phase is expected
      to be a no-op here; treat any unexpected diff as a signal to look closer, not
      just accept it.

## Phase 3 — Grep sweep for what codemods can't catch (validation-only)

**Entry:** Phase 2 exit is green. **Exit:** every hit below is triaged.

```bash
grep -rn "contextTypes\|getChildContext" src/       # legacy Context API
grep -rn "\.ref\b" src/ | grep -v "\.props\.ref\|useRef\|forwardRef\|createRef"
grep -rn "SECRET_INTERNALS" src/ node_modules/*/package.json 2>/dev/null
grep -rn "\.defaultProps" src/                       # removed for function components
```

- [ ] No app-source hits (hits inside `node_modules` are a Phase 1/4 dependency
      concern, not something to hand-edit).

## Phase 4 — Upgrade the breaking-change-sensitive dependencies

**Entry:** Phase 1 flagged ag-grid, react-bootstrap, and `@testing-library/react` as the
packages to watch. **Exit:** each resolves to a version whose peer range includes
`^19.0.0`, and the app + suite are still green **on React 18.3**.

```bash
npm install ag-grid-community@latest ag-grid-react@latest
npm install react-bootstrap@latest
npm install -D @testing-library/react@latest
npm test && npm run build   # still on React 18.3 — isolates this step's regressions from React 19's
```

- [ ] `npm test` and `npm run build` pass on 18.3 with the upgraded dependencies.

## Phase 5 — Bump React itself

**Entry:** Phase 4 exit is green. **Exit:** TypeScript compiles clean on 19.2.7.

```bash
npm install --save-exact react@19.2.7 react-dom@19.2.7
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

Fix TypeScript compile errors — expect a subset of these, all documented in the React
19 upgrade guide:

- `useRef()` with no argument now errors — pass an explicit initial value
  (`useRef<HTMLDivElement>(null)`).
- Ref callbacks with an implicit return are now rejected by TypeScript, because a
  returned value is treated as a ref cleanup function. Wrap the body in braces so
  nothing is returned.
- Global `JSX` namespace augmentations need `declare module "react/jsx-runtime"` (or
  `react`, depending on `tsconfig.json`'s `"jsx"` setting) instead of the bare global.
- `useReducer<...>` generic usage may need adjusting — it no longer accepts the full
  reducer type as a single type parameter.

- [ ] `npx tsc -b` (or `npm run build`'s type-check step) is clean. Do not proceed to
      Phase 6 with a red build — a compile error here will look like a component bug in
      the next phase and waste time chasing the wrong cause.

## Phase 6 — Per-component fix-and-verify loop

**Entry:** Phase 5 exit is green (compiles clean on 19.2.7). **Exit:** every row below
is individually green, and only components whose own test failed were edited.

This is the phase where component files actually change — and only because a test told
you to. Run each pair in isolation before touching anything; don't batch-edit all three
components up front.

| Component | Test file | Run in isolation | What to check if it fails |
|---|---|---|---|
| `src/components/Counter.tsx` | `Counter.test.tsx` | `npx vitest run src/components/Counter.test.tsx` | react-bootstrap `Button`/`ButtonGroup` ref forwarding; zustand `useCounterStore` selector re-renders under React 19's changed batching/StrictMode double-invoke. |
| `src/components/NavBar.tsx` | `NavBar.test.tsx` | `npx vitest run src/components/NavBar.test.tsx` | react-bootstrap `Navbar`/`Nav`/`Navbar.Brand` polymorphic `as={NavLink}` prop — these rely on ref-forwarding through react-bootstrap into `react-router-dom`'s `NavLink`; this is the component most exposed to the react-bootstrap bump in Phase 4. |
| `src/components/TodosGrid.tsx` | `TodosGrid.test.tsx` | `npx vitest run src/components/TodosGrid.test.tsx` | `AgGridReact` mount/unmount timing under `<StrictMode>` (double-invoke of effects), `useMemo` columnDefs identity, and the loading/error branch driven by `useTodos` (`@tanstack/react-query`). This is the component most exposed to the ag-grid bump in Phase 4. |

Procedure per row:

1. Run that row's isolated test command.
2. **Pass →** move to the next row; do not edit that component.
3. **Fail →** open only that component file, and — if the failure traces into a
   supporting module — the specific one it depends on (`src/store/counterStore.ts` for
   `Counter`; `src/hooks/useTodos.ts` / `src/api/todos.ts` for `TodosGrid`). Make the
   minimal fix, re-run that single test file until green before moving on.
4. Once all three rows are individually green, run the full suite once more to catch
   cross-component regressions the isolated runs couldn't see:
   ```bash
   npm test
   ```

Status (fill in as you go — this is the artifact a reviewer checks):

- [ ] `Counter.tsx` / `Counter.test.tsx` — pass unmodified / fixed (describe fix) / still failing
- [ ] `NavBar.tsx` / `NavBar.test.tsx` — pass unmodified / fixed (describe fix) / still failing
- [ ] `TodosGrid.tsx` / `TodosGrid.test.tsx` — pass unmodified / fixed (describe fix) / still failing
- [ ] Full suite (`npm test`) green after all three rows pass individually

## Phase 7 — Error handling changes — check if this affects you

React 19 no longer double-logs errors thrown during render. If custom error monitoring
depends on errors being re-thrown to `window.onerror`, move that logic to the new
`onCaughtError` / `onUncaughtError` / `onRecoverableError` options on
`createRoot`/`hydrateRoot` in `src/main.tsx`. This repo has no custom render-error
monitoring today, so this phase is expected to be a no-op — confirm that's still true
rather than skipping the check.

## Phase 8 — Manual QA pass

**Entry:** Phase 6 and 7 exits are green. **Exit:** the checklist below is fully
checked, with `<StrictMode>` still wrapping the app root (`src/main.tsx`).

- [ ] `TodosGrid`: sort, filter, inline edit, row selection. Watch the console for
      `ResizeObserver` errors (a known issue during React 19 betas, fixed in current
      ag-grid releases — re-check if you see it).
- [ ] `NavBar` / react-bootstrap: `Navbar.Toggle` collapse, active-link styling via
      `NavLink`.
- [ ] Route transitions via react-router-dom (`Home` ↔ `About`).
- [ ] `Counter`: zustand-driven increment/decrement/reset.
- [ ] React Query loading/error/success states on `TodosGrid`.

## Phase 9 — Production build

```bash
npm run build
```

- [ ] Completes without new console errors and the bundle size hasn't unexpectedly
      changed.

## Known gotchas specific to this stack

- **ag-grid + `<Activity>`**: if you later adopt React 19.2's `<Activity>` component to
  keep hidden UI mounted, be aware of a known issue where switching an ag-grid instance
  into hidden Activity mode can destroy the grid's internal state (filters, etc.) even
  though the component doesn't fully unmount. Don't wrap `AgGridReact` in
  `<Activity mode="hidden">` without testing this specifically against your current
  ag-grid version.
- **ag-grid peer dependency trap**: the single most common install-time failure when
  upgrading. If `npm install` fails with `ERESOLVE` mentioning `ag-grid-react`, it's
  almost always because the installed ag-grid version predates React 19 peer support —
  upgrade ag-grid first (Phase 4), not React.
- **react-bootstrap Transition-based components**: `Modal`, `OverlayTrigger`, `Fade`,
  and `Collapse` all previously relied on `findDOMNode` under the hood to hook into
  `react-transition-group`. This is why react-bootstrap needs to be current — an old
  cached version can silently reappear via a lockfile that wasn't regenerated.
- **react-router-dom stays as-is**: don't feel pressured to jump to the newer unified
  `react-router` package as part of this migration — they're separate concerns. Do it
  later, deliberately, if at all.

## Rollback plan

Because codemods and dependency bumps are committed incrementally on a branch, one
commit per phase:

1. If Phase 4's dependency upgrades cause regressions, `git revert` just that commit
   and re-open issues against the specific package before retrying.
2. If React 19 itself (Phase 5) causes a regression that can't be fixed quickly, revert
   the `react`/`react-dom`/`@types/react*` bump commit — Phase 4's upgrades are
   backward-compatible with React 18.3 and can stay.
3. Keep the branch's commits scoped per phase (codemods → dependency bumps → React
   version bump → per-component fixes) specifically so any of these can be reverted
   independently without unwinding the whole branch.

## Final verification checklist

- [ ] `npm test` passes with zero `act()`-related console errors
- [ ] `npm run build` completes cleanly
- [ ] No `findDOMNode`, legacy Context, or string-ref warnings in the dev console
- [ ] Per-component matrix (Phase 6) fully green
- [ ] ag-grid: sort/filter/edit/select all verified manually (Phase 8)
- [ ] react-bootstrap: Navbar/Toggle/NavLink verified manually (Phase 8)
- [ ] Error monitoring (if any) still captures render errors after Phase 7
- [ ] `package.json` shows `react`/`react-dom` at exactly `19.2.7`, with no duplicate
      React copies in `npm ls react`

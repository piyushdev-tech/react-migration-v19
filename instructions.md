# Migrating this repo from React 18.3.0 to React 19.2.7

This document is the concrete, phased playbook for upgrading **this specific
codebase** — Vite + TypeScript, Zustand, TanStack React Query, ag-grid, react-bootstrap,
react-router-dom, Vitest + React Testing Library — from React 18.3.0 to React 19.2.7.

It focuses on **breaking changes**, not new React 19 features. Adopting Actions,
`useOptimistic`, Server Components, etc. is a separate, optional follow-up once the app
is stable on React 19.

For the generalized, repo-agnostic version of this workflow (useful for other React 18
projects), see [`SKILL.md`](./.claude/skills/react19-migration/SKILL.md).

**No step in this migration commits anything to git.** Every phase's edits — codemods,
dependency bumps, the React version bump, manual fixes — are left as uncommitted
working-tree changes. Review the diff with `git diff` / `git status` and commit
yourself, on whatever cadence you prefer.

## Auto-approved commands (read-only — don't stop to confirm these)

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
edits) still deserves the normal confirm-before-mutating care — see
[SKILL.md](./.claude/skills/react19-migration/SKILL.md) — but a dependency *check*
shouldn't wait on the same approval as a dependency *change*. `git commit` is never run
as part of this playbook.

## Phase 0 — Baseline

**Entry:** on `react@18.3.0`. **Exit:** a known-good baseline recorded before anything
changes.

- [x] Working tree on a dedicated branch (not `main`/`master`).
- [x] If `node_modules` is missing, run `npm install` first and confirm `npm ls react
      react-dom` shows no `invalid` entries before trusting the baseline below.
- [x] React 18.3.0 baseline: `npm test` → 4 test files / 5 tests pass, one expected
      `ReactDOMTestUtils.act` deprecation warning (from `@testing-library/react`
      internals, not app source). `npm run build` → clean, JS 1,381.91 kB / gzip
      397.02 kB.
- [x] Test coverage exists for the highest-risk areas: `TodosGrid` (ag-grid), `NavBar`
      (react-bootstrap), `Counter` (zustand), `SearchBox` (forwardRef + ref callback
      into `TextField`).

## Phase 1 — Compatibility matrix for this stack (validation-only)

**Entry:** Phase 0 exit is green. **Exit:** the table below is re-verified live, not
assumed from memory.

| Package | Version in this repo | Peer range (live) | Notes |
|---|---|---|---|
| `react` / `react-dom` | 18.3.0 → 19.2.7 | — | — |
| `ag-grid-react` | ^36.0.0 | `^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0` | Already covers 19. Older ag-grid majors cap their peer dep at `^18.0.0`, which is the most common `ERESOLVE` trap when bumping React — not an issue at this version. |
| `react-bootstrap` | ^2.10.10 | `>=16.14.0` (no upper cap) | Older majors called `ReactDOM.findDOMNode` internally in `Modal`/`OverlayTrigger`/transition components; current 2.10.x doesn't. |
| `@testing-library/react` | ^16.0.1 | `^18.0.0 \|\| ^19.0.0` | Clean. |
| `react-router-dom` | ^7.18.1 | `>=18` | No action needed. Not a reason to move to the newer unified `react-router` package as part of this migration. |
| `zustand` | ^5.0.14 | `>=18.0.0` | No code changes required. |
| `@tanstack/react-query` | ^5.101.2 | `^18 \|\| ^19` | No code changes required. |

- [x] All peer ranges verified live via `npm view <pkg> peerDependencies` — every
      installed version already covers React 19. **Phase 4 is a no-op** for this repo
      as long as this table holds.

## Phase 2 — Mechanical codemods

**Entry:** Phase 1 exit is green. **Exit:** codemods have run and every touched file has
been reviewed.

```bash
npx codemod run react-19-migration-recipe --target ./src --no-interactive
npx types-react-codemod@latest preset-19 ./src --yes
```

In this codebase these two commands modify: `SearchBox.test.tsx`, `useRenderCount.ts`,
`legacy/LegacyTodoList.tsx`, `legacy/mountReleaseBanner.tsx`.

**Known codemod defect — `mountReleaseBanner.tsx`:** the
`ReactDOM.unmountComponentAtNode` → `root.unmount()` transform creates a *second*,
unused `createRoot(container)` inside the returned cleanup function instead of reusing
the original `root`. This throws React's "calling `createRoot()` on a container that
already has a root" console error and leaves the original root's content orphaned.
`mountReleaseBanner()` is called from `main.tsx` on module load, so this is a functional
bug, not cosmetic. **Fix:** call `root.unmount()` directly in the returned cleanup
function instead of creating a new root.

## Phase 3 — Grep sweep for what codemods can't catch (validation-only)


**Entry:** Phase 2 exit is green. **Exit:** every hit fixed or triaged.

**3a — Removed APIs**

```bash
grep -rn "contextTypes\|getChildContext" src/
grep -rn "\.defaultProps" src/
grep -rln "findDOMNode" src/
```

- **Legacy Context API** (`src/legacy/LegacyThemeContext.tsx`): not covered by
  `react-19-remove-legacy-context` or the bundled recipe. **Fix:** rewrite the
  `getChildContext`/`childContextTypes`/`contextTypes` class components to
  `createContext` + `useContext` by hand. This file is intentionally unwired (not
  imported anywhere) — a grep-sweep/demo target only, doesn't affect the build.
- **`.defaultProps` on function components** (`TextField.tsx`, live/wired; and
  `legacy/LegacyTodoList.tsx`, unwired demo): not covered by the bundled recipe. **Fix:**
  run the dedicated codemod:
  `npx codemod run react-19-replace-default-props --target ./src --no-interactive --allow-dirty`
  (`--allow-dirty` is required — this codemod refuses to run on an uncommitted tree by
  default, and this playbook never commits mid-migration).
  **Known codemod defect:** in both files it touches, it deletes trailing syntax needed
  to close the statement it edits — the closing `)` of a `forwardRef(...)` call in
  `TextField.tsx`, and the remainder of a JSX closing tag in `LegacyTodoList.tsx` —
  leaving syntax errors that `tsc`/esbuild catch immediately. Always review the full
  diff of any file this codemod touches, not just the lines it reports as changed, and
  restore the truncated syntax by hand.
- **`findDOMNode`** (`src/components/OutsideClick.tsx`, live/wired via `Home.tsx`): no
  automated codemod exists for this (context-dependent by design). **Fix:** the
  component already has an unused `wrapperRef` next to the `findDOMNode(this)` call —
  replace `findDOMNode(this)` with `this.wrapperRef.current` and drop the `react-dom`
  import.

**3b — Changed behavior**

```bash
grep -rn "SECRET_INTERNALS" src/
grep -rn "\.ref\b" src/ | grep -v "\.props\.ref\|useRef\|forwardRef\|createRef"
```

- [x] Zero hits in app source for both.

## Phase 4 — Upgrade flagged third-party packages

**Entry:** Phase 1's matrix. **Exit:** confirmed no-op — every installed package's peer
range already includes `^19.0.0` (Phase 1). No `npm install` needed here unless Phase
1's table changes on a future re-run.

## Phase 5 — Bump React itself

**Entry:** Phase 4 exit green. **Exit:** `tsc -b` clean on 19.2.7.

```bash
npm install --save-exact react@19.2.7 react-dom@19.2.7
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

- [x] `npm ls react react-dom` — all packages dedupe to `19.2.7`, zero duplicate
      copies.
- **Known codemod gap:** `types-react-codemod`'s `no-implicit-ref-callback-return`
  transform only matches ref callbacks written inline in JSX. A ref callback first
  assigned to a variable (`const attachInput = (node) => (inputRef.current = node)`,
  then `ref={attachInput}`) is not rewritten, and surfaces as a `tsc` compile error only
  after the React 19 bump. Location in this repo: `src/components/SearchBox.tsx`.
  **Fix:** wrap the callback body in braces so nothing is returned.
- [x] `npx tsc -b` clean after that fix.

## Phase 6 — Per-component fix-and-verify loop

**Entry:** Phase 5 exit green. **Exit:** every pair green in isolation, only
test-driven edits made.

| Component | Test file | Result |
|---|---|---|
| `Counter.tsx` | `Counter.test.tsx` | pass unmodified |
| `NavBar.tsx` | `NavBar.test.tsx` | pass unmodified |
| `TodosGrid.tsx` | `TodosGrid.test.tsx` | pass unmodified |
| `SearchBox.tsx` (+ `TextField.tsx`) | `SearchBox.test.tsx` | pass, no test-file edit needed, once Phase 5 completes |

The `SearchBox.test.tsx` row needs a note: between Phase 2/3 and Phase 5, this test
fails with `act is not a function`. This is expected and temporary — `react@18.3.0`
only exports `unstable_act`, not the stable `act` that `react-19-replace-act-import`
imports from `'react'`; the stable export only exists starting in React 19. Don't
"fix" this by reverting the import — it resolves automatically once Phase 5 lands.

- [x] Full suite (`npm test`) green after all four pairs pass individually: 4 test
      files / 5 tests. The `ReactDOMTestUtils.act` deprecation warning present in the
      Phase 0 baseline is gone entirely once both React and `@testing-library/react`
      are on their React-19-aware versions — no code change required for that.

## Phase 7 — Full verification

1. **Error handling.** `src/components/ErrorBoundary.tsx` (wired into `App.tsx`,
   wrapping the whole route tree) is this repo's render-error monitoring.
   `componentDidCatch` calls `console.error` directly, so it does not depend on React
   19's removed double-logging/re-throw behavior — no change required. No other
   render-error hooks (`window.onerror`, `reportError`, `onCaughtError`,
   `onUncaughtError`, `onRecoverableError`) exist in `src/`.
2. `npm test` — zero `act()`-related console errors.
3. **Manual QA pass**, dev server driven headlessly (a local Playwright script; no
   project-specific run skill exists for this app yet — see `.claude/skills/` if you
   want one generated with `/run-skill-generator`). Exercise, all under `<StrictMode>`:
   - `TodosGrid`: rows render, header-click sort triggers with no console error.
   - `SearchBox`/`TextField`: type into the input (forwardRef → real DOM node), click
     "Focus", confirm `document.activeElement` is the input.
   - `OutsideClick`: confirm `data-measured-width` is set to a real pixel value — proof
     the `findDOMNode` → `ref` migration actually measures the DOM node, not just that
     it doesn't throw.
   - `Counter`: increment, decrement, reset all update the displayed count correctly.
   - `NavBar`/react-router: Home → About → Home, URL and active-link styling correct
     both directions.
   - The legacy imperative `mountReleaseBanner()` widget renders correctly, confirming
     the Phase 2 `createRoot` fix holds at runtime, not just under review.
   - Zero console errors or warnings across the entire sequence.
4. `npm run build` — clean. Compare bundle size against the Phase 0 baseline
   (1,381.91 kB / gzip 397.02 kB); a few percent increase is expected from React 19
   itself being slightly larger, not a regression. The pre-existing "chunk larger than
   500 kB" advisory is unrelated to this migration.

## Known gotchas specific to this stack

- **`react-19-replace-default-props` corrupts trailing syntax.** It deletes the closing
  `)` of a `forwardRef(...)` call and part of a JSX closing tag in the files it touches
  in this repo. Always view the full diff of any file this codemod touches, not just the
  lines it explicitly reports changing.
- **`react-19-replace-act-import` targets the post-React-19 world, not React 18.3.** It
  rewrites `import { act } from 'react-dom/test-utils'` to `import { act } from 'react'`
  — but `react@18.3.0` only exports `unstable_act`, not the stable `act`. Any test file
  it touches fails between Phase 2 and Phase 5. That's expected; it resolves once
  Phase 5 bumps React, and Phase 6 re-verifies it did.
- **`no-implicit-ref-callback-return` only matches inline JSX ref callbacks.** A ref
  callback assigned to a variable first (`const attachInput = (node) => (ref.current =
  node)`, then `ref={attachInput}`) isn't rewritten by the codemod and surfaces as a
  `tsc` error only after the Phase 5 bump. Grep for `=> (.*\.current = ` style
  one-liners near `useRef` to catch this before Phase 5 rather than after.
- **Codemods that need a clean git tree still work with `--allow-dirty`.** Some
  individual codemods (e.g. `react-19-replace-default-props`) refuse to run on an
  uncommitted tree by default. Since this playbook never commits mid-migration, pass
  `--allow-dirty` rather than committing just to satisfy the tool.
- **ag-grid peer dependency trap** (general guidance): if `npm install` ever fails with
  `ERESOLVE` mentioning `ag-grid-react`, the installed ag-grid predates React 19 peer
  support — not an issue at the currently installed `^36.0.0`.
- **react-bootstrap Transition-based components** (`Modal`, `OverlayTrigger`, `Fade`,
  `Collapse`) relied on `findDOMNode` in older majors — current `2.10.x` doesn't.
- **react-router-dom stays as-is** — no need to move to the newer unified `react-router`
  package as part of this migration.
- **Unused `prop-types` dependency.** Once `.defaultProps`/`propTypes` usage is removed
  from `LegacyThemeContext.tsx` and `LegacyTodoList.tsx`, `prop-types` in
  `package.json` has no remaining `src/` imports. Left in place — removing unused
  dependencies is outside this migration's scope, but worth dropping separately if
  desired.

## Rollback plan

Nothing is committed during this migration — every change (codemods, dependency bumps,
manual fixes) sits uncommitted in the working tree. To roll back:

- **Undo everything:** `git checkout -- .` (or `git restore .`) from the repo root, then
  `npm install` to resync `node_modules` back to the committed `package-lock.json`.
- **Undo selectively:** `git diff` to see exactly what changed per file, then
  `git checkout -- <file>` for just the files you want to revert (e.g. keep the
  dependency bumps in `package.json` but revert a specific component fix).
- **Stash instead of discard:** `git stash -u` to set the migration aside temporarily
  without losing the work.
- If you do choose to commit (this playbook doesn't do it for you), commit in the same
  order the phases ran — codemods → grep-sweep fixes → React version bump →
  per-component fixes — so any later step can be `git revert`ed independently if it
  turns out to be the one that caused a regression.

## Final verification checklist

- [x] `npm test` passes with zero `act()`-related console errors
- [x] `npm run build` completes cleanly
- [x] No `findDOMNode`, legacy Context, or string-ref warnings in the dev console
- [x] Per-component matrix (Phase 6) fully green — 4/4 pairs pass, all edits test-driven
- [x] ag-grid: rows render, sort verified manually (Phase 7)
- [x] react-bootstrap: Navbar/NavLink active-state and routing verified manually
      (Phase 7)
- [x] Error monitoring (`ErrorBoundary`) confirmed unaffected by React 19's logging
      change (Phase 7)
- [x] `package.json` shows `react`/`react-dom` at exactly `19.2.7`, `@types/react` at
      `19.2.17`, `@types/react-dom` at `19.2.3`, no duplicate React copies in `npm ls
      react`

**Migration complete.** All changes are on the working tree of the current branch,
uncommitted — review with `git diff` and commit at your own pace.

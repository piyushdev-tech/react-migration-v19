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

**Migration not yet started.** `package.json` still pins `react@18.3.0`, and none of the
source-level fixes below are present in `src/` yet. Checklist items are unchecked until
the corresponding phase is actually executed and verified against the live source.

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

- [x] Working tree on a dedicated branch (`upgrade/react-19`, not `main`).
- [ ] `node_modules` is currently **out of sync** with `package.json`: `npm ls react
      react-dom` reports resolved copies at `19.2.7` marked `invalid: "18.3.0" from the
      root project` (a leftover from the earlier real run, before the reset). Run `npm
      install` first to resync to the committed `18.3.0`, then confirm `npm ls react
      react-dom` shows no `invalid` entries before trusting any baseline captured after
      that.
- [ ] Re-capture the React 18.3.0 baseline: `npm test` and `npm run build`, on a
      resynced `node_modules`, and record the actual output here (test count, build
      size). The counts from the stale revision of this doc (4 test files / 5 tests,
      1,381.91 kB JS) predate the `3c05fde` demo-source commit (which added
      `SearchBox.test.tsx` content and new components) and should not be trusted as-is.
- [ ] Confirm test coverage still exists for the highest-risk areas: `TodosGrid`
      (ag-grid), `NavBar` (react-bootstrap), `Counter` (zustand), `SearchBox`
      (forwardRef + ref callback into `TextField`).

## Phase 1 — Compatibility matrix for this stack (validation-only)

**Entry:** Phase 0 exit is green. **Exit:** the table below is re-verified live, not
assumed from memory.

| Package | Version in this repo | Peer range (live, last checked pre-reset) | Notes |
|---|---|---|---|
| `react` / `react-dom` | 18.3.0 → 19.2.7 | — | — |
| `ag-grid-react` | ^36.0.0 | `^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0` | Already covers 19. Older ag-grid majors cap their peer dep at `^18.0.0`, which is the most common `ERESOLVE` trap when bumping React — not an issue at this version. |
| `react-bootstrap` | ^2.10.10 | `>=16.14.0` (no upper cap) | Older majors called `ReactDOM.findDOMNode` internally in `Modal`/`OverlayTrigger`/transition components; current 2.10.x doesn't. |
| `@testing-library/react` | ^16.0.1 | `^18.0.0 \|\| ^19.0.0` | Clean. |
| `react-router-dom` | ^7.18.1 | `>=18` | No action needed. Not a reason to move to the newer unified `react-router` package as part of this migration. |
| `zustand` | ^5.0.14 | `>=18.0.0` | No code changes required. |
| `@tanstack/react-query` | ^5.101.2 | `^18 \|\| ^19` | No code changes required. |

- [ ] **Re-run** `npm view <pkg> peerDependencies` for each row before trusting this
      table — it was last verified live before the `d7e9b72` reset, and package
      registries change. If all ranges still cover `^19.0.0`, Phase 4 remains a no-op.

## Phase 2 — Mechanical codemods

**Entry:** Phase 1 exit is green. **Exit:** codemods have run and every touched file has
been reviewed.

**Not yet run against the current source.** Expected to touch (based on the patterns
confirmed present via grep in this revision): `SearchBox.test.tsx` (act import),
`hooks/useRenderCount.ts` (`useRef()` missing initial arg), and possibly
`legacy/mountReleaseBanner.tsx` (`ReactDOM.render`/`unmountComponentAtNode`).

```bash
npx codemod run react-19-migration-recipe --target ./src --no-interactive
npx types-react-codemod@latest preset-19 ./src --yes
```

**Known codemod defect to watch for — `mountReleaseBanner.tsx`:** in a prior real run of
this codemod on this codebase, the `ReactDOM.unmountComponentAtNode` →
`root.unmount()` transform created a *second*, unused `createRoot(container)` inside the
returned cleanup function instead of reusing the original `root`. This throws React's
"calling `createRoot()` on a container that already has a root" console error and
leaves the original root's content orphaned. `mountReleaseBanner()` is called from
`main.tsx` on module load, so this would be a functional bug, not cosmetic. **Fix if it
recurs:** call `root.unmount()` directly in the returned cleanup function instead of
creating a new root.

## Phase 3 — Grep sweep for what codemods can't catch (validation-only)

**Entry:** Phase 2 exit is green. **Exit:** every hit fixed or triaged.

**3a — Removed APIs**

```bash
grep -rn "contextTypes\|getChildContext" src/
grep -rn "\.defaultProps" src/
grep -rln "findDOMNode" src/
```

Confirmed present in the current source (checked directly, not from a prior run):

- **Legacy Context API** (`src/legacy/LegacyThemeContext.tsx`) — uses
  `getChildContext`/`childContextTypes`/`contextTypes`. Not covered by
  `react-19-remove-legacy-context` or the bundled recipe. **Fix:** rewrite by hand to
  `createContext` + `useContext`. This file is `@ts-nocheck` and intentionally unwired
  (not imported anywhere) — a grep-sweep/demo target only, doesn't affect the build.
- **`.defaultProps` on function components** — present in `src/components/TextField.tsx`
  (live/wired, inside a `forwardRef` wrapper) and `src/legacy/LegacyTodoList.tsx`
  (unwired demo, `@ts-nocheck`). Not covered by the bundled recipe. **Fix:** run the
  dedicated codemod:
  `npx codemod run react-19-replace-default-props --target ./src --no-interactive --allow-dirty`
  (`--allow-dirty` is required — this codemod refuses to run on an uncommitted tree by
  default, and this playbook never commits mid-migration).
  **Known codemod defect:** in a prior run, this codemod deleted trailing syntax needed
  to close the statement it edits — the closing `)` of the `forwardRef(...)` call in
  `TextField.tsx`, and the remainder of a JSX closing tag in `LegacyTodoList.tsx` —
  leaving syntax errors that `tsc`/esbuild catch immediately. Always review the full
  diff of any file this codemod touches, not just the lines it reports as changed, and
  restore truncated syntax by hand if it recurs.
- **`findDOMNode`** — present in `src/components/OutsideClick.tsx` (live/wired via
  `Home.tsx`, class component). No automated codemod exists for this (context-dependent
  by design). **Fix:** the component already has an unused `wrapperRef` next to the
  `findDOMNode(this)` call — replace `findDOMNode(this)` with `this.wrapperRef.current`
  and drop the `react-dom` import.

**3b — Changed behavior**

```bash
grep -rn "SECRET_INTERNALS" src/
grep -rn "\.ref\b" src/ | grep -v "\.props\.ref\|useRef\|forwardRef\|createRef"
```

- [ ] Re-run and confirm zero hits (matched zero in a prior run; app source hasn't
      grown a new dependency on either surface as far as the demo-source commit shows,
      but re-verify rather than assume).

## Phase 4 — Upgrade flagged third-party packages

**Entry:** Phase 1's matrix. **Exit:** Phase 1 table re-verified; if every installed
package's peer range still includes `^19.0.0`, this phase is a no-op — no `npm install`
needed here.

## Phase 5 — Bump React itself

**Entry:** Phase 4 exit green. **Exit:** `tsc -b` clean on 19.2.7.

```bash
npm install --save-exact react@19.2.7 react-dom@19.2.7
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

- [ ] Not yet run — `package.json` currently pins `react@18.3.0` /
      `react-dom@18.3.0`, `@types/react@18.3.9`, `@types/react-dom@18.3.7`.
- **Known codemod gap to watch for:** `types-react-codemod`'s
  `no-implicit-ref-callback-return` transform only matches ref callbacks written inline
  in JSX. A ref callback first assigned to a variable is **confirmed present** in this
  repo right now:
  ```ts
  // src/components/SearchBox.tsx:15
  const attachInput = (node: HTMLInputElement | null) => (inputRef.current = node)
  ```
  used as `<TextField ref={attachInput} ... />` (line 19). This form is not rewritten by
  the codemod, and surfaces as a `tsc` compile error only after the React 19 bump.
  **Fix:** wrap the callback body in braces so nothing is returned.

## Phase 6 — Per-component fix-and-verify loop

**Entry:** Phase 5 exit green. **Exit:** every pair green in isolation, only
test-driven edits made. **Not yet started** — depends on Phase 5.

Component/test pairs to check once Phase 5 lands:

| Component | Test file |
|---|---|
| `Counter.tsx` | `Counter.test.tsx` |
| `NavBar.tsx` | `NavBar.test.tsx` |
| `TodosGrid.tsx` | `TodosGrid.test.tsx` |
| `SearchBox.tsx` (+ `TextField.tsx`) | `SearchBox.test.tsx` |

Expect `SearchBox.test.tsx` to fail with `act is not a function` between Phase 2 and
Phase 5 if the `react-19-replace-act-import` codemod runs in Phase 2 — `react@18.3.0`
only exports `unstable_act`, not the stable `act` that codemod imports from `'react'`;
the stable export only exists starting in React 19. That's expected and temporary; it
should resolve once Phase 5 lands. Don't "fix" it by reverting the import.

## Phase 7 — Full verification

**Not yet started.**

1. **Error handling.** `src/components/ErrorBoundary.tsx` (wired into `App.tsx`,
   wrapping the whole route tree) is this repo's render-error monitoring.
   `componentDidCatch` calls `console.error` directly, so it should not depend on React
   19's removed double-logging/re-throw behavior — confirm no change required once the
   rest of the migration lands. No other render-error hooks (`window.onerror`,
   `reportError`, `onCaughtError`, `onUncaughtError`, `onRecoverableError`) exist in
   `src/` currently.
2. `npm test` — zero `act()`-related console errors.
3. **Manual QA pass**, dev server driven headlessly, under `<StrictMode>`. Exercise:
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
4. `npm run build` — clean. Compare bundle size against the Phase 0 baseline (once
   re-captured); a few percent increase is expected from React 19 itself being
   slightly larger, not a regression.

## Known gotchas specific to this stack

- **`react-19-replace-default-props` corrupts trailing syntax.** In a prior run it
  deleted the closing `)` of a `forwardRef(...)` call and part of a JSX closing tag in
  the files it touches in this repo. Always view the full diff of any file this codemod
  touches, not just the lines it explicitly reports changing.
- **`react-19-replace-act-import` targets the post-React-19 world, not React 18.3.** It
  rewrites `import { act } from 'react-dom/test-utils'` to `import { act } from 'react'`
  — but `react@18.3.0` only exports `unstable_act`, not the stable `act`. Any test file
  it touches will fail between Phase 2 and Phase 5. That's expected; it resolves once
  Phase 5 bumps React.
- **`no-implicit-ref-callback-return` only matches inline JSX ref callbacks.** A ref
  callback assigned to a variable first (confirmed present at `SearchBox.tsx:15`, see
  Phase 5) isn't rewritten by the codemod and will surface as a `tsc` error only after
  the Phase 5 bump.
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
  `package.json` will have no remaining `src/` imports. Left in place — removing unused
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

- [ ] `npm test` passes with zero `act()`-related console errors
- [ ] `npm run build` completes cleanly
- [ ] No `findDOMNode`, legacy Context, or string-ref warnings in the dev console
- [ ] Per-component matrix (Phase 6) fully green — all pairs pass, all edits test-driven
- [ ] ag-grid: rows render, sort verified manually (Phase 7)
- [ ] react-bootstrap: Navbar/NavLink active-state and routing verified manually
      (Phase 7)
- [ ] Error monitoring (`ErrorBoundary`) confirmed unaffected by React 19's logging
      change (Phase 7)
- [ ] `package.json` shows `react`/`react-dom` at exactly `19.2.7`, `@types/react` at
      `^19`, `@types/react-dom` at `^19`, no duplicate/invalid React copies in `npm ls
      react`

**Migration not started.** Everything above is a plan, not a report — run Phases 0
through 7 to actually execute it, then update this checklist to match reality (avoid
the mistake this revision just corrected: don't mark a phase done until it's been
re-verified against the live source in the same session).

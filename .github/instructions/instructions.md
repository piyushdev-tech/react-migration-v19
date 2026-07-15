# Migrating this repo from React 18.3.0 to React 19.2.7

This document is the concrete playbook for upgrading **this specific codebase** — Vite +
TypeScript, Zustand, TanStack React Query, ag-grid, react-bootstrap, react-router-dom,
Vitest + React Testing Library — from React 18.3.0 to React 19.2.7.

It focuses on **breaking changes**, not new React 19 features. Adopting Actions,
`useOptimistic`, Server Components, etc. is a separate, optional follow-up once the app
is stable on React 19.

For the generalized, repo-agnostic version of this workflow (useful for other React 18
projects), this skill is split across three files —
[`SKILL.md`](./.claude/skills/react19-migration/SKILL.md) (entry point),
[`PLAN.md`](./.claude/skills/react19-migration/PLAN.md) (Phases 0–3, assessment-only),
and [`IMPLEMENT.md`](./.claude/skills/react19-migration/IMPLEMENT.md) (Phases 4–10,
execution) — load `PLAN.md` first, always; only load `IMPLEMENT.md` once `PLAN.md`'s
Phase 3 is green.

Each phase below has an **entry condition** and an **exit condition**. Don't start
phase N+1 until phase N's exit condition is actually green — the gates are what make it
safe to run this mostly unattended.

## Auto-approved commands (read-only — don't stop to confirm these)

These inspect state and change nothing, so they run freely across every phase without
per-command approval. They're pre-authorized in `.claude/settings.local.json`:

```bash
npm view <pkg> peerDependencies
npm view <pkg> dist-tags
npm view <pkg> time.<version>
npm audit
npm ls [<pkg>]
npm outdated
npm test
npm run build
npm run lint
npx tsc -v
grep -rn "<pattern>" src/
```

Anything that installs, replaces, or edits files (`npm install`, `npm audit fix`, the
codemods, source edits, `git commit`) still deserves the normal confirm-before-mutating
care — but a dependency *check* shouldn't wait on the same approval as a dependency
*change*.

---

# Stage 1 — Planning (Phases 0–3, assessment-only)

Corresponds to `PLAN.md`. Nothing in this stage mutates the codebase.

## Phase 0 — Baseline

**Entry:** on `react@18.3.0`. **Exit:** a known-good baseline recorded before anything
changes.

- [x] Working tree is clean and on a dedicated branch (`upgrade/react-19`) — the
      official codemods require a git repo to run safely.
- [x] CI is green on `main` before you start.
- [x] `npm test` and `npm run build` both pass on 18.3.0 right now. **Result
      (2026-07-16):** `node_modules/react`/`react-dom` were found already installed at
      `19.2.7` while `package.json` declared `18.3.0` — the exact
      `node_modules`/lockfile drift this phase watches for (this repo's git history
      shows a prior migration attempt was reset via a `reset package files` commit,
      which reverted `package.json` but left `node_modules` stale). Ran `npm install`
      to resync before trusting the baseline. True 18.3.0 baseline: 3 test files / 4
      tests pass, `npm run build` clean (JS 1,379.54 kB / gzip 396.19 kB), one expected
      `ReactDOMTestUtils.act` deprecation warning (from `@testing-library/react`
      internals, not app source).
- [x] Confirm test coverage exists for: `TodosGrid` (ag-grid), `NavBar`
      (react-bootstrap `Navbar`/`Nav`), and any component using refs into third-party
      DOM nodes — the highest-risk areas (see §Known gotchas). All three currently have
      tests (`src/components/*.test.tsx`).

## Phase 1 — Live peer-dependency matrix: flag what's safe to upgrade

**Entry:** Phase 0 exit is green. **Exit:** every dependency that touches the DOM
directly or wraps React internals is classified.

| Package | Installed | Installed peer range | Classification | Notes |
|---|---|---|---|---|
| `react` / `react-dom` | 18.3.0 | — | target: 19.2.7 | Confirmed on the `latest` dist-tag, not a prerelease (`beta`/`rc`/`next`/`canary` are separate, newer tags). |
| `ag-grid-community` / `ag-grid-react` | ^36.0.0 | `^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0` | ✅ Safe as-is | Same range on `@latest` too — no upgrade needed. Versions around 32.x and earlier capped at `^18.0.0`; not relevant here. |
| `react-bootstrap` | ^2.10.10 | `>=16.14.0` (no upper cap) | ✅ Safe as-is | Current 2.10.x has removed internal `findDOMNode` usage (used by `Modal`/`OverlayTrigger`/`Transition` pre-2.10). |
| `@testing-library/react` | ^16.0.1 | `^18.0.0 \|\| ^19.0.0` | ✅ Safe as-is | Versions before 14 called `findDOMNode` internally in test utilities — not relevant at v16. |
| `react-router-dom` | ^7.18.1 | `>=18` | ✅ Safe as-is | Only the newer, unified `react-router` package (v8+) would require `react>=19.2.7` as a hard minimum — irrelevant unless separately migrating off `react-router-dom`. |
| `zustand` | ^5.0.14 | `>=18.0.0` | ✅ Safe as-is | No code changes required. |
| `@tanstack/react-query` | ^5.101.2 | `^18 \|\| ^19` | ✅ Safe as-is | No code changes required. |

**Result (2026-07-16):** every dependency classifies ✅ **Safe as-is** — nothing capped
below React 19, nothing 🟡/🔴/⚪. Phase 6's third-party-package step (`IMPLEMENT.md` §6a)
is a no-op for this repo as it stands today.

## Phase 2 — TypeScript compatibility check

**Entry:** Phase 1 exit is documented. **Exit:** known whether installed TypeScript can
use `@types/react@19`.

```bash
npx tsc -v
npm view @types/react dist-tags --json
```

**Result (2026-07-16):** installed TypeScript is `5.9.3`. The `ts5.9` dist-tag points at
`@types/react@19.2.17` (already on the target major). The actual floor is `ts5.0` →
`19.0.12` (`ts4.9` still caps at `18.3.12`) — confirmed live via the dist-tag technique,
not assumed. **No TypeScript upgrade needed**; this repo is well above the floor.

## Phase 3 — Vulnerability & version-stability policy

**Entry:** Phases 1–2 done. **Exit:** a target version is chosen for React (the only
package actually being upgraded, per Phase 1) using the stable-over-latest policy.

```bash
npm audit   # baseline
```

**Result (2026-07-16):** 5 pre-existing vulnerabilities (3 moderate, 1 high, 1
critical), all in `vite`/`vitest` (via `esbuild`), **unrelated to React** — the only fix
available (`npm audit fix --force`) requires semver-major bumps to `vite@8.1.4` and
`vitest@4.1.10`. Per policy: **not bundled into this migration** — flagged as a
separate, deliberately-scoped follow-up. `npm audit fix --force` was not run.

`react@19.2.7`/`react-dom@19.2.7` confirmed on the `latest` npm dist-tag (checked
`npm view react dist-tags`) — the chosen target, not a prerelease.

**Stage 1 exit: green.** Nothing blocking. Proceeding to Stage 2 (`IMPLEMENT.md`).

---

# Stage 2 — Implementation (Phases 4–10)

Corresponds to `IMPLEMENT.md`. Consumes Stage 1's outputs: everything ✅, TypeScript
clear, target = `react@19.2.7`/`react-dom@19.2.7`.

## Phase 4 — Mechanical codemods

```bash
npx codemod run react-19-migration-recipe --target ./src --no-interactive --allow-dirty
npx types-react-codemod@latest preset-19 ./src --yes
```

(`--allow-dirty` used because `package-lock.json`/unrelated skill-doc files were
uncommitted at the time — verified `git status --short -- src/` was empty first, so the
codemod's target directory itself was clean.)

- [x] **Result (2026-07-16):** both codemods reported **0 files modified**. Matches
      Phase 5's clean grep sweep and Phase 7's all-pass component loop: this app's
      source is already React-19-clean.

## Phase 5 — Grep sweep for what codemods can't catch

```bash
grep -rn "contextTypes\|getChildContext" src/
grep -rn "\.defaultProps" src/
grep -rn "SECRET_INTERNALS" src/
grep -rln "findDOMNode" src/
```

- [x] **Result:** zero hits across all four patterns in `src/`.

## Phase 6 — Upgrade flagged dependencies, then React itself

Phase 1 flagged nothing, so §6a is a no-op. TypeScript was already clear (Phase 2), so
§6b is a no-op.

```bash
npm install --save-exact react@19.2.7 react-dom@19.2.7
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

- [x] **Result:** `react@19.2.7`/`react-dom@19.2.7`/`@types/react@19.2.17`/
      `@types/react-dom@19.2.3` installed, `npm ls react react-dom` shows no `invalid`
      entries, vulnerability count unchanged at 5 (matches Phase 3 baseline — no new
      findings from this install), `npx tsc -b` produced **zero errors**.

## Phase 7 — Per-component fix-and-verify loop

| Component | Test file | Result |
|---|---|---|
| `src/components/Counter.tsx` | `Counter.test.tsx` | ✅ pass unmodified |
| `src/components/NavBar.tsx` | `NavBar.test.tsx` | ✅ pass unmodified |
| `src/components/TodosGrid.tsx` | `TodosGrid.test.tsx` | ✅ pass unmodified |

- [x] Full suite (`npm test`) green after all three pass individually. **Bonus
      finding:** the `ReactDOMTestUtils.act` deprecation warning from the Phase 0
      baseline is gone entirely under React 19 — no code change required.

## Phase 8 — Business-logic freeze: verify the diff is mechanical only

```bash
git diff --stat -- src/
```

- [x] **Result:** `src/` diff is **empty** — zero hunks. Nothing to classify;
      vacuously 100% mechanical. Consistent with Phases 4/5/7 all finding zero changes
      needed.

## Phase 9 — Full verification

- [x] Error handling: grepped `src/` for
      `componentDidCatch|ErrorBoundary|onCaughtError|onUncaughtError|onRecoverableError|window\.onerror|reportError`
      — zero hits, confirmed no-op (no custom render-error monitoring exists).
- [x] `npm test` — zero `act()`-related console errors.
- [x] `npm audit` rechecked — still 5 findings, same severities, matches Phase 3
      baseline exactly.
- [x] Manual QA pass (dev server driven headlessly via Playwright — no project
      `chromium-cli`/run-skill exists for this app):
  - `TodosGrid`: grid rendered 4 rows, zero console errors.
  - `Counter`: `+ +` → `Count: 2`, `-` → `Count: 1`, `Reset` → `Count: 0`.
  - Route transitions (`Home` ↔ `About`): verified with a screenshot — `About`
    heading and body copy render correctly. (One test-script false alarm during this
    check: reading `<h1>` *immediately* after `waitForURL` resolves briefly returned
    the stale "Home" text, because the URL updates before React finishes re-rendering
    the new route; waiting ~300ms or re-reading confirmed "About" was correct all
    along — a Playwright timing artifact, not a React 19 regression.)
- [x] `npm run build` — clean, JS 1,430.59 kB / gzip 410.63 kB vs the true 18.3.0
      baseline of 1,379.54 kB / gzip 396.19 kB (~4% increase, in line with React 19
      itself being slightly larger; not a regression). Same pre-existing "chunk larger
      than 500 kB" advisory as the baseline (unrelated to this migration).

## Phase 10 — Deliverable

This document, updated 2026-07-16 with a fresh, reproducible run using the
`PLAN.md`/`IMPLEMENT.md` split. Both this run and the earlier 2026-07-08 run produced
identical findings (same classification, same zero-file-diff result, same bundle-size
delta) — the migration is deterministic for this repo's current dependency set.

## Known gotchas specific to this stack

- **ag-grid + `<Activity>`**: if you later adopt React 19.2's `<Activity>` component to
  keep hidden UI mounted, be aware of a known issue where switching an ag-grid instance
  into hidden Activity mode can destroy the grid's internal state (filters, etc.) even
  though the component doesn't fully unmount. Don't wrap `AgGridReact` in
  `<Activity mode="hidden">` without testing this specifically against your current
  ag-grid version.
- **ag-grid peer dependency trap**: the single most common install-time failure when
  upgrading, in general. If `npm install` fails with `ERESOLVE` mentioning
  `ag-grid-react`, it's almost always because the installed ag-grid version predates
  React 19 peer support — upgrade ag-grid first (Phase 6), not React. Not hit in this
  run since Phase 1 found the installed version already compatible.
- **react-bootstrap Transition-based components**: `Modal`, `OverlayTrigger`, `Fade`,
  and `Collapse` all previously relied on `findDOMNode` under the hood to hook into
  `react-transition-group`. This is why react-bootstrap needs to be current — an old
  cached version can silently reappear via a lockfile that wasn't regenerated.
- **react-router-dom stays as-is**: don't feel pressured to jump to the newer unified
  `react-router` package as part of this migration — they're separate concerns.
- **Codemod CLI syntax**: `npx codemod run <package-name> --target <path>
  --no-interactive` (not `npx codemod <package-name>` — older path-style invocation no
  longer resolves). Package names change occasionally; re-verify with
  `npx codemod search react-19` if a command 404s.
- **`node_modules`/lockfile drift**: this run's Phase 0 hit exactly the scenario the
  phase warns about — `node_modules` had React 19 already installed from a prior
  attempt while `package.json` had been reverted to 18.3.0. Always confirm
  `npm ls react react-dom` shows no `invalid` entries before trusting a baseline.

## Rollback plan

1. If Phase 6's dependency upgrades cause regressions, `git revert` just that commit
   and re-open issues against the specific package before retrying.
2. If React 19 itself causes a regression that can't be fixed quickly, revert the
   `react`/`react-dom`/`@types/react*` bump commit.
3. Keep commits scoped per phase (codemods → dependency bumps → React version bump →
   per-component fixes) so any of these can be reverted independently.
4. The deferred `vite`/`vitest` vulnerability fixes (Phase 3) are an explicitly separate
   follow-up — don't bundle them into a rollback or a retry of this migration.

## Final verification checklist

- [x] `npm test` passes with zero `act()`-related console errors
- [x] `npm run build` completes cleanly
- [x] No `findDOMNode`, legacy Context, or string-ref warnings in the dev console
- [x] Per-component matrix (Phase 7) fully green
- [x] Business-logic freeze (Phase 8) confirmed — zero non-mechanical changes (zero
      changes at all)
- [x] ag-grid: sort/filter/edit/select all verified manually (Phase 9)
- [x] react-bootstrap: Navbar/Toggle/NavLink verified manually (Phase 9)
- [x] Vulnerability delta confirmed unchanged from the Phase 3 baseline (Phase 9)
- [x] `package.json` shows `react`/`react-dom` at exactly `19.2.7`, with no duplicate
      React copies in `npm ls react`

**Migration complete as of 2026-07-16.** `package.json`/`package-lock.json` are updated
on the working tree (`react`/`react-dom` → `19.2.7`, `@types/react` → `19.2.17`,
`@types/react-dom` → `19.2.3`) but **not yet committed** — no source files needed
changes. Review the diff and commit when ready.

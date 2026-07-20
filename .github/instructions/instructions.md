# Migrating this repo from React 18.3.0 to React 19.2.7

This document is the concrete playbook for upgrading **this specific codebase** — Vite +
TypeScript, Zustand, TanStack React Query, ag-grid, react-bootstrap, react-router-dom,
Vitest + React Testing Library — from React 18.3.0 to React 19.2.7.

It focuses on **breaking changes**, not new React 19 features. Adopting Actions,
`useOptimistic`, Server Components, etc. is a separate, optional follow-up once the app
is stable on React 19.

This skill is split across three files —
[`SKILL.md`](./.claude/skills/react19-migration/SKILL.md) (entry point),
[`PLAN.md`](./.claude/skills/react19-migration/PLAN.md) (Phases 0–3, assessment-only),
and [`IMPLEMENT.md`](./.claude/skills/react19-migration/IMPLEMENT.md) (Phases 4–10,
execution) — load `PLAN.md` first, always; only load `IMPLEMENT.md` once `PLAN.md`'s
Phase 3 is green.

Each phase below has an **entry condition** and an **exit condition**. Don't start
phase N+1 until phase N's exit condition is actually green — the gates are what make it
safe to run this mostly unattended. Re-verify every live check below on each run rather
than trusting a prior run's findings — package versions, peer ranges, and the state of
`src/` can all have changed since.

**Migration scope:** by default this covers the whole `src/` tree. A run can instead be
scoped to specific folders/files — see `PLAN.md` Phase 0 and
`references/migration-history.md`'s "Migration scope" section for how that's decided
and recorded. One thing scope never changes: Phase 6's React version bump always
applies to the whole repo, since an app can't run two React majors at once.

**Cross-session progress:** `migrationHistory.json` at the repo root tracks which phase
was last completed, so a run can be resumed later — by the same person, a colleague, or
a different machine — without starting over. See
`references/migration-history.md` for the protocol. This document (`instructions.md`)
stays a generic, durable playbook; per-run results live in `migrationHistory.json`, not
here.

## Auto-approved commands (read-only — don't stop to confirm these)

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

---

# Stage 1 — Planning (Phases 0–3, assessment-only)

Corresponds to `PLAN.md`. Nothing in this stage mutates the codebase.

## Phase 0 — Baseline

**Entry:** on `react@18.3.0`. **Exit:** a known-good baseline recorded before anything
changes, and a migration scope decided.

- [ ] Determine migration scope (whole `src/` tree, or specific folders/files) and
      record it — see `PLAN.md` Phase 0.
- [ ] Working tree is clean and on a dedicated branch (`upgrade/react-19`) — the
      official codemods require a git repo to run safely.
- [ ] CI is green on `main` before you start.
- [ ] `npm test` and `npm run build` both pass on 18.3.0 right now. Before trusting the
      result, confirm there's no drift to resolve first:
  - `npm ls react react-dom` shows no `invalid` entries (i.e. `node_modules` actually
    matches what `package.json`/the lockfile declare).
  - `package.json`'s own dependency groups agree with each other — specifically that
    `devDependencies['@types/react']`/`['@types/react-dom']` are still on the 18.x line
    matching `dependencies.react`/`react-dom`, not already bumped ahead of the runtime.
    A types/runtime mismatch will break `tsc` before any migration work has started, and
    looks like a batch of migration-relevant compile errors even though nothing has
    changed yet — resolve it (`npm install`, or realign the mismatched package) before
    treating the result as a valid baseline.
- [ ] Confirm test coverage exists for the highest-risk areas: any component wrapping
      ag-grid, any react-bootstrap `Modal`/`Overlay`/`Transition`-based component, and
      any component using refs into third-party DOM nodes. Don't add coverage
      speculatively — just confirm it exists, and note anything untested; Phase 7's
      test-driven loop can't tell you a component is fine if it has no test to fail.

## Phase 1 — Live peer-dependency matrix: flag what's safe to upgrade

**Entry:** Phase 0 exit is green. **Exit:** every dependency that touches the DOM
directly or wraps React internals is classified.

Check the **current, real** peer range of each — installed version first, then
`latest` — rather than assuming from memory:

```bash
npm view <package> peerDependencies
npm view <package>@latest peerDependencies
```

| Package | Role | What to check |
|---|---|---|
| `react-router-dom` | routing | Peer range covering React 19; the newer unified `react-router` package (v8+) is a separate, optional concern. |
| `react-bootstrap` | UI kit | Older majors called `ReactDOM.findDOMNode` internally in `Modal`/`OverlayTrigger`/`Transition` — confirm the installed version has removed that, or that this app doesn't use those specific sub-components. |
| `ag-grid-community` / `ag-grid-react` | data grid | The single most common install-time failure when upgrading React — older majors cap their peer range at `^18.0.0`, which hard-fails `npm install` with `ERESOLVE` the moment React is bumped. |
| `zustand` | state | Peer range covering React 19. |
| `@tanstack/react-query` | data fetching | Peer range covering React 19. |
| `@testing-library/react` | testing | Versions before 14 called `findDOMNode` internally in test utilities. |

Classify each dependency:

| State | Condition | Action |
|---|---|---|
| ✅ **Safe as-is** | Installed version's peer range already includes React 19 | No action — re-verify after Phase 6's React bump, don't just assume it holds. |
| 🟡 **Safe to upgrade** | Installed version's peer range caps below 19, but a released (non-prerelease) version supports it | Upgrade in Phase 6, per the Phase 3 stability policy. |
| 🔴 **Blocked** | No released version supports React 19 yet | Stop — surface this explicitly rather than force-installing with `--legacy-peer-deps`/`--force`. |
| ⚪ **Unknown** | No `peerDependencies` declared at all | Check the README/CHANGELOG or grep its installed source for removed APIs; treat as 🔴 if you can't confirm. |

Produce a live table (package / installed version / installed peer range /
classification / minimum version that flips it to ✅ or 🟡) and record it in
`migrationHistory.json`'s `findings.dependencyClassification` — not in this file.

## Phase 2 — TypeScript compatibility check

**Entry:** Phase 1 exit is documented. **Exit:** known whether the installed
TypeScript version can use `@types/react@19`.

```bash
npx tsc -v
npm view @types/react dist-tags --json
```

The dist-tags map (`{ "ts5.0": "19.0.12", "ts4.9": "18.3.12", ... }`) shows which
`@types/react` version each TypeScript release can use — find the tag matching the
installed TypeScript version and see whether it's already on the React 19 line. If not,
TypeScript needs upgrading first, through the Phase 3 policy, before the React types
will typecheck. Don't assume a specific TypeScript floor from memory — it shifts across
React majors; this dist-tag check is the live source of truth every time.

## Phase 3 — Vulnerability & version-stability policy

**Entry:** Phases 1–2 done. **Exit:** a target version is chosen for every package that
needs one.

```bash
npm audit   # baseline — record counts by severity before touching anything
```

For each package getting a new version:

1. Prefer the lowest version that clears the compatibility bar, not necessarily
   `@latest`.
2. Confirm via `npm view <pkg> dist-tags` that the chosen version isn't a prerelease
   (`next`/`rc`/`beta`/`alpha`/`canary`).
3. Re-check `npm audit` after each install. If a finding requires a semver-major bump to
   a package unrelated to the React 19 requirement, don't fold that fix into this
   migration — record it as a separate follow-up.
4. Never run `npm audit fix --force` as part of this workflow.

**Stage 1 exit: green** once every dependency is classified, the TypeScript floor is
known, and target versions are chosen with no new unresolved vulnerabilities.

---

# Stage 2 — Implementation (Phases 4–10)

Corresponds to `IMPLEMENT.md`. Consumes Stage 1's outputs.

## Phase 4 — Mechanical codemods

Run on the branch from Phase 0 (required — codemods commit as they go), against the
scope decided in Phase 0:

```bash
npx codemod run react-19-migration-recipe --target ./src --no-interactive
npx types-react-codemod@latest preset-19 ./src --yes
```

Individual codemods exist for changes the bundled recipe doesn't cover (see
`references/breaking-changes.md` for the full list) — `defaultProps` removal,
`forwardRef` removal, and legacy Context removal are common examples that need a
separate, targeted codemod run.

**Review every file every codemod touches — don't trust a clean exit code.** Codemods
can produce output that's syntactically broken (a dropped brace, a merged statement) or
subtly wrong (a resource-cleanup closure referencing the wrong instance, a mistyped ref
prop with a missing import) even when they report success. They also don't catch
everything: an inline `ref={(node) => ...}` callback in JSX is a different pattern from
the same logic assigned to a named `const` first, and only one of those is reliably
rewritten by the standard ref-callback codemod. `findDOMNode` has no automated
replacement at all — it's always a manual fix, tailored to whatever DOM node the code
actually needs. Legacy Context removal codemods can also simply not match a given
`getChildContext`/`childContextTypes` shape and make zero changes — verify with the
grep sweep (Phase 5) that a "0 files modified" result was actually correct rather than
a miss.

## Phase 5 — Grep sweep for what codemods can't catch

```bash
grep -rn "contextTypes\|getChildContext" src/       # legacy Context API
grep -rn "\.defaultProps" src/                       # removed for function components
grep -rn "SECRET_INTERNALS" src/                     # renamed in React 19
grep -rln "findDOMNode" src/                         # removed entirely, throws now
```

Every hit gets fixed or consciously triaged before moving on. A hit inside a comment
(explaining what used to be there, or referencing this very playbook) doesn't count —
only hits in actual code matter.

## Phase 6 — Upgrade flagged dependencies, then React itself

```bash
npm install <pkg>@<version-chosen-in-phase-3>   # for each 🟡 dependency from Phase 1
npm test && npm run build                        # still on React 18 — isolate this step's regressions

npm install --save-exact react@19.2.7 react-dom@19.2.7
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

This step always applies to the whole repo, regardless of any scope chosen in Phase 0.

Fix TypeScript compile errors before moving on — `useRef()` requiring an initial value,
ref callback implicit returns, JSX namespace scoping, `useReducer` type params (see
`references/breaking-changes.md`). Don't proceed to Phase 7 with a red `tsc` build; a
compile error here will look like a component bug in the next phase and waste time
chasing the wrong cause.

## Phase 7 — Per-component fix-and-verify loop

For every component **within the chosen scope** that has a test file, run that test in
isolation, and touch the component file **only if its own test fails**:

```bash
npx vitest run <path-to-Component.test.tsx>
```

- **Pass:** move on, don't edit.
- **Fail:** read the failure, fix the minimal thing required, re-run until green.

Once every pair passes individually, run the full suite once more to catch
cross-component regressions the isolated runs couldn't see.

For components with **no test file**, "nothing failed" isn't proof of correctness —
review them directly against `references/breaking-changes.md`, and where possible get
runtime verification a different way (the manual QA pass in Phase 9, if the component is
actually wired into the running app).

## Phase 8 — Business-logic freeze: verify the diff is mechanical only

```bash
git diff <phase-0-branch-point>..HEAD -- src/
```

Walk every hunk. **Allowed:** import path changes, ref typing/callback signature
changes, `defaultProps` → default parameters using the *exact same default values*,
`ReactDOM.render`/`hydrate` → `createRoot`/`hydrateRoot`, PropTypes → TS types with the
same shape, legacy Context → `createContext`/`useContext`/`contextType` preserving the
same value shape, error-handler wiring that doesn't change what's reported. **Not
allowed without explicit sign-off:** changed conditionals, changed calculations, changed
default *values*, changed data-shaping, changed API parameters, unrelated cleanup or
renames.

If a hunk doesn't map cleanly to the allowed bucket, flag it by file and line rather
than silently applying or reverting it. If a fix touches something outside `src/` logic
entirely — e.g. user-visible copy that's now factually stale after the change — that's
also outside the mechanical scope of this migration; flag it, don't rewrite it
unprompted.

## Phase 9 — Full verification

1. Check whether custom render-error monitoring (an Error Boundary's
   `componentDidCatch`, or similar) depends on errors being re-thrown/double-logged —
   React 19 changed this. If it depends on that old behavior, move it to
   `onCaughtError`/`onUncaughtError`/`onRecoverableError`; if it already reports errors
   itself independent of that behavior, no change is needed — verify by reading the
   code, don't assume either way.
2. `npm test` — the **whole suite**, not just the scoped folders (zero `act()`-related
   console errors). React itself changed for the entire app regardless of scope.
3. Manual QA pass in the running app, under `<StrictMode>`, exercising every area
   touched by a Phase 6 dependency upgrade — including areas outside the migration
   scope, since they now run on React 19 too. If something out-of-scope actually
   breaks, that's a shipping blocker for this run, not a footnote — escalate to the
   user rather than silently patching or silently shipping it.
4. `npm run build` — completes cleanly, no unexpected bundle-size jump.
5. `npm audit` once more — confirm the vulnerability delta matches the Phase 3 baseline.

## Phase 10 — Deliverable

Keep this document current after each run in a **generic** way: the dependency-role
table (Phase 1), the TypeScript-floor check method (Phase 2), and the
known-gotchas/rollback sections below are durable and worth maintaining as the stack
evolves. **Do not** add dated "result of the last run" sections, per-component result
tables, status banners, or checked-off checklists here — that's exactly the kind of
run-specific detail that belongs in `migrationHistory.json` (machine-readable,
resumable) or a PR description/commit message (human narrative), not in this standing
playbook. A future reader opening this file should see a reusable procedure, not a
transcript of one past execution.

## Known gotchas specific to this stack

- **ag-grid peer dependency trap**: the single most common install-time failure when
  upgrading. If `npm install` fails with `ERESOLVE` mentioning `ag-grid-react`, it's
  almost always because the installed ag-grid version predates React 19 peer support —
  upgrade ag-grid first (Phase 6), not React.
- **ag-grid + `<Activity>`**: if you later adopt React 19.2's `<Activity>` component to
  keep hidden UI mounted, be aware of a known issue where switching an ag-grid instance
  into hidden Activity mode can destroy the grid's internal state even though the
  component doesn't fully unmount.
- **react-bootstrap Transition-based components**: `Modal`, `OverlayTrigger`, `Fade`,
  and `Collapse` all previously relied on `findDOMNode` under the hood (some versions
  still keep a fallback path for class-component refs). An old cached version can
  silently reappear via a lockfile that wasn't regenerated — check which of these
  sub-components the app actually uses before assuming the risk applies.
- **react-router-dom stays as-is**: don't feel pressured to jump to the newer unified
  `react-router` package as part of this migration — separate concern.
- **Codemod CLI syntax**: `npx codemod run <package-name> --target <path>
  --no-interactive` (not `npx codemod <package-name>` — the older path-style invocation
  no longer resolves). Re-verify package names with `npx codemod search react-19` if a
  command 404s — the registry changes.
- **`node_modules`/lockfile/`package.json` drift**: always confirm `npm ls react
  react-dom` shows no `invalid` entries, and that `package.json`'s own dependency groups
  agree with each other, before trusting a baseline (see Phase 0).
- **Codemods aren't infallible**: review every file they touch. They can produce
  output that's syntactically broken or subtly behavior-changing even when they report
  success, and they don't cover every syntactic variant of a pattern (e.g. an inline
  JSX ref callback vs. the same logic assigned to a named variable first, or a
  `forwardRef`-removal codemod mistyping the new plain `ref` prop).

## Rollback plan

1. If Phase 6's dependency upgrades cause regressions, revert just that commit and
   re-open issues against the specific package before retrying.
2. If React 19 itself causes a regression that can't be fixed quickly, revert the
   `react`/`react-dom`/`@types/react*` bump commit — check whether the Phase 4–7
   source-level fixes are backward-compatible with React 18 as written before assuming
   a clean revert of everything else.
3. Keep commits scoped per phase (codemods → dependency bumps → React version bump →
   per-component fixes) so any of these can be reverted independently.
4. Deferred vulnerability fixes (Phase 3) are an explicitly separate follow-up — don't
   bundle them into a rollback or a retry of this migration.

## Final verification checklist

- [ ] `npm test` passes with zero `act()`-related console errors
- [ ] `npm run build` completes cleanly
- [ ] No `findDOMNode`, legacy Context, or string-ref usage remaining in `src/` (comment
      mentions only)
- [ ] Per-component matrix (Phase 7) fully green, including manual review of any
      untested files
- [ ] Business-logic freeze (Phase 8) confirmed — every changed hunk reviewed and
      mechanical
- [ ] Error-handling change (Phase 9) assessed, not assumed
- [ ] Vulnerability delta confirmed unchanged from the Phase 3 baseline
- [ ] `package.json` shows `react`/`react-dom` at exactly `19.2.7`, with no duplicate
      React copies in `npm ls react`

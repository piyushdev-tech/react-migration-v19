# react19-migration — Implementation stage (Phases 4–10)

Loaded from `SKILL.md`, after `PLAN.md`'s Phase 3 exit is green. **Don't read this file
before that** — its steps consume Phase 1–3 outputs (the peer-dependency classification
table, the TypeScript floor finding, chosen target versions) and assume they already
exist. If you don't have those yet, go read `PLAN.md` first.

Each phase has an **entry condition** and an **exit condition**. Don't start phase N+1
until phase N's exit condition is actually green — the gates are what make it safe to
run this mostly unattended.

**After each phase's exit condition goes green, update `migrationHistory.json` before
moving to the next phase** — same file, same protocol as `PLAN.md` used for Phases
0–3 (see `references/migration-history.md`). If you're picking this file up because
`migrationHistory.json` says Stage 1 is already complete, trust its recorded
`findings` rather than re-deriving them, per that doc's guidance.

## Phase 4 — Mechanical codemods

**Entry:** `PLAN.md` Phases 1–3 are documented. **Exit:** codemods have run and every
touched file has been reviewed.

Run the official codemods before any manual edits, on the branch from Phase 0 (required
— they commit as they go):

```bash
# Package is "react-19-migration-recipe" (verify with `npx codemod search react` — the
# registry and CLI syntax have changed before). --no-interactive is required outside a TTY.
npx codemod run react-19-migration-recipe --target ./src --no-interactive

# --yes auto-accepts all transforms in the picker; required outside a TTY.
npx types-react-codemod@latest preset-19 ./src --yes
```

Individual codemods exist if only one change is needed — see
`references/breaking-changes.md` for the full list with exact commands. Review every
file the codemods touch; they're reliable but not infallible, particularly around ref
callbacks. Every codemod-produced hunk should be explainable purely as a React-19
API-shape change — see Phase 8's business-logic-freeze rule, which applies from this
phase onward.

## Phase 5 — Grep sweep for what codemods can't catch (validation-only)

**Entry:** Phase 4 exit is green. **Exit:** every hit below is either fixed or
consciously triaged (e.g. it's inside a third-party package, not app source).

```bash
grep -rn "contextTypes\|getChildContext" <src>      # legacy Context API, removed
grep -rn "\.defaultProps" <src>                      # removed for function components
grep -rn "SECRET_INTERNALS" <src>                    # renamed in React 19
grep -rln "findDOMNode" <src>                        # removed entirely, throws now
```

## Phase 6 — Upgrade flagged dependencies, then React itself

**Entry:** Phase 5 exit is green. **Exit:** every 🟡 dependency from `PLAN.md` Phase 1
now shows ✅, TypeScript clears the Phase 2 floor if applicable, and `react`/`react-dom`/
`@types/react*` resolve to the chosen target version with no duplicate React copies
(`npm ls react`).

```bash
# 6a — flagged third-party packages, one at a time, using the versions chosen in PLAN.md Phase 3
npm install <pkg>@<chosen-version>
npm test && npm run build           # still on React 18 — isolate this step's regressions

# 6b — TypeScript, only if PLAN.md Phase 2 found it below the floor
npm install -D typescript@<chosen-version>
npx tsc -b                          # against the OLD @types/react — confirm the TS bump alone is clean

# 6c — React itself, exact version chosen per PLAN.md Phase 3
npm install --save-exact react@<target> react-dom@<target>
npm install --save-exact -D @types/react@^<major> @types/react-dom@^<major>
```

Don't re-decide versions here — install what `PLAN.md` Phase 3 already chose.

Fix TypeScript compile errors before moving on (see `references/breaking-changes.md` —
`useRef` requiring an argument, ref callback implicit returns, JSX namespace scoping,
`useReducer` type params). Do not proceed to Phase 7 with a red `tsc` build; a compile
error here will masquerade as a component bug in the next phase. As in Phase 4, every
fix here must be a mechanical type-level change — see Phase 8.

## Phase 7 — Per-component fix-and-verify loop

**Entry:** Phase 6 exit is green (compiles clean). **Exit:** every component's own test
file passes in isolation, and only the component(s) whose test failed were edited.

This is the phase where component files actually change, and it's structured so that
**a component is only touched because its own test told you to** — not as a blanket
sweep. Don't batch-edit every component up front; let the failing test point at the
file.

1. Enumerate component/test pairs: every component file that has a sibling test file
   (`*.test.tsx`/`.spec.tsx` or the project's equivalent convention).
2. For each pair, in isolation:
   ```bash
   npx vitest run <path-to-Component.test.tsx>   # (or the project's test runner equivalent)
   ```
   - **Pass:** move to the next pair. Do not edit this component.
   - **Fail:** read the failure, open only *that* component file (and, if the failure
     traces into a hook/store/context it consumes, that supporting file too), make the
     minimal fix, re-run that single test file until green.
3. Common failure → fix mappings to check first, before assuming something novel:
   - Ref-forwarding components from a UI kit (polymorphic `as={...}` props, `Transition`
     wrappers) failing after a Phase 6 UI-kit bump → the kit version is still using
     `findDOMNode` under the hood; re-check its release notes, don't patch app code
     around it.
   - A component that renders twice or logs duplicate side effects under
     `<StrictMode>` → expected in dev for effects; only a real bug if the *test*
     assertion fails, not just extra console noise.
   - A grid/table component losing state or throwing on mount/unmount → check whether
     the surrounding test wraps it in `act()` correctly and whether the grid library's
     React 19 release notes mention a required prop/initialization change.
   - A component using `useRef()` with no generic argument, or a ref callback with an
     implicit return → TypeScript changes from Phase 6 that weren't fully resolved; fix
     at the type level, not by suppressing the error.
4. Once every pair is green individually, run the full suite once more
   (`npm test`) to catch cross-component regressions the isolated runs couldn't see.
5. Record the pass/fail-then-fixed status of each pair — this becomes the per-component
   matrix in the project's `instructions.md`, so a future re-run of the migration (or a
   reviewer) can see which components actually needed changes and why.

## Phase 8 — Business-logic freeze: verify the diff is mechanical only

**Entry:** Phases 4–7 have produced a diff. **Exit:** every hunk in that diff is
explainable as a React-19 API-shape change, with nothing else riding along.

This gate applies retroactively to every file touched in Phases 4–7. A React version
migration should never be the vehicle for an unrelated behavior change — even a
"harmless-looking" one — because it makes the diff impossible to review for migration
risk alone, and any regression becomes ambiguous (was it React 19, or the drive-by
tweak?).

```bash
git diff <phase-0-branch-point>..HEAD -- <src-dir>
```

Walk every hunk and sort it into one of two buckets:

- **Allowed (mechanical, React-API-shape only):** import path/source changes (e.g. `act`
  from `react` instead of `react-dom/test-utils`); ref typing and callback signatures;
  `defaultProps` → default-parameter syntax *using the exact same default values*;
  `ReactDOM.render`/`hydrate` → `createRoot`/`hydrateRoot`; PropTypes → TS type
  conversion with the same shape; JSX namespace augmentation relocation; wiring existing
  error-reporting calls into `onCaughtError`/`onUncaughtError`/`onRecoverableError`
  without changing what they report.
- **Not allowed without separate, explicit sign-off:** changed conditionals or branching;
  changed calculations or computed values; changed default *values* (not just the syntax
  that expresses them); changed data-shaping/transform logic; changed API call
  parameters or endpoints; state/effect reordering that alters runtime behavior beyond
  what the API change mechanically required; renames, reformatting, or "while I'm in
  here" cleanups unrelated to the migration.

If a hunk doesn't map cleanly to the allowed bucket, stop and flag it to the user by
name (file, line, what changed, why it doesn't look mechanical) rather than folding it
in silently or reverting it unilaterally — the user may know context you don't (e.g. it
really is required), but it must be a deliberate, visible decision, not a side effect of
"fixing the test."

## Phase 9 — Full verification

**Entry:** Phase 8 exit is green (diff reviewed as mechanical-only). **Exit:** the
checklist below is fully checked.

1. Check whether custom render-error monitoring depends on errors being
   re-thrown/double-logged — React 19 changed this (see reference doc); move it to
   `onCaughtError`/`onUncaughtError`/`onRecoverableError` if so (this is itself a
   mechanical, Phase-8-allowed change).
2. `npm test` — zero `act()`-related console errors.
3. Manual QA pass in the running app, still under `<StrictMode>`, exercising every area
   touched by a Phase 6 dependency upgrade.
4. `npm run build` — completes cleanly, no unexpected bundle-size jump.
5. `npm audit` once more — confirm the vulnerability delta matches what `PLAN.md` Phase
   3 recorded (no surprise new findings from the final dependency graph).

## Phase 10 — Deliverable

If the user wants a document out of this (not just live edits to their repo), write or
update `instructions.md` in their repo root following the structure of this skill's own
example at the bottom of `references/breaking-changes.md` — i.e., a compatibility
matrix specific to *their* packages with the `PLAN.md` Phase 1 classification and Phase
2 TypeScript floor finding, the Phase 3 vulnerability delta, the phase sequence with
gates, the per-component matrix from Phase 7, a note confirming the Phase 8
business-logic-freeze review, a stack-specific gotchas section, and a rollback plan.
Don't hand back a generic "here's what changed in React 19" essay; it should read like
an internal runbook for their exact codebase.

## What NOT to do in this stage

- Don't bump the React version before every 🔴-classified dependency (from `PLAN.md`
  Phase 1) has been resolved — this is the most common cause of a broken migration
  attempt.
- Don't re-decide package versions in Phase 6 — install what `PLAN.md` Phase 3 chose.
- Don't skip the git-branch requirement before running codemods.
- Don't edit a component file in Phase 7 unless its own test (or a test that exercises
  it) actually failed — that phase is test-driven on purpose, not a rewrite pass.
- Don't let a business-logic change ride along with a mechanical migration edit — every
  changed hunk must be traceable to a React-19 API-shape change (Phase 8). If it isn't,
  flag it instead of applying or discarding it unilaterally.
- Don't call the migration done without Phase 9's `npm audit` recheck against the
  `PLAN.md` Phase 3 baseline.

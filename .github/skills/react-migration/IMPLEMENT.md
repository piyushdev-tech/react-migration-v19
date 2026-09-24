# react-migration — Implementation stage (Phases 4–10)

**Which breaking-change list applies:** Phases 4 and 5 below are split into
per-`targetMajor` subsections, because 16→17 and 17→18 have far less local breaking-
change surface than 18→19. Read `migrationHistory.json`'s `findings.phase0Brief.targetMajor`
(set in `PLAN.md` Phase 0) and use only the subsection matching it — the others exist for
when a later hop reads this same file, not as extra work for this hop.

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

**Scope:** every `<src>`/`./src` placeholder below means the folders/files recorded in
`migrationHistory.json`'s `scope` (`PLAN.md` Phase 0 decided this — don't re-ask or
re-decide it here). If `scope.mode` is `"custom"`, run the Phase 4/5/8 commands once
per path in `scope.paths` rather than against the whole tree. **Phase 6 is the one
exception** — the React version bump always applies to the whole repo regardless of
scope, and Phase 9's full-suite verification runs against the whole app, not just the
scoped folders, since the runtime is shared either way.

## Phase 4 — Grep sweep + manual fixes for this hop's breaking changes

**Entry:** `PLAN.md` Phases 1–3 are documented. **Exit:** every hit below (from the
subsection matching this run's `targetMajor`) is fixed or consciously triaged (e.g. it's
inside a third-party package, not app source), with each fix matching the exact
replacement `references/breaking-changes.md` documents.

Every fix in this workflow is applied by hand — no automated rewrite tool is used or
depended on, so there's no third-party registry availability to worry about. Work on the
branch from Phase 0 (still required — commit as you go so each fix is independently
revertable).

### If `targetMajor` is 17 (16→17 hop)

```bash
grep -rn "\.persist()" <src>                                 # event pooling removed; persist() is now a no-op — safe to delete the call
grep -rln "onScroll" <src>                                    # bubbling-dependent onScroll handlers no longer bubble
grep -rln "unstable_createPortal" <src>                       # removed; replace with the stable createPortal export
grep -rn "document\.addEventListener\|document\.removeEventListener" <src>  # root-level event delegation change — review interop
```

This hop is deliberately small — React 17 is an intentionally low-risk "stepping stone"
release with no new features and very little removed. Cross-check each hit against
`references/breaking-changes.md`'s `## React 16 → React 17` section and the official
guide it links to before writing a fix; most hits here are behavior nuances to review,
not hard compile/runtime failures.

### If `targetMajor` is 18 (17→18 hop)

```bash
grep -rln "ReactDOM\.render\|ReactDOM\.hydrate" <src>          # still works, now deprecated — migrate to createRoot/hydrateRoot from react-dom/client
grep -rn "flushSync" <src>                                     # re-verify call sites now that updates batch automatically by default
```

`ReactDOM.render`/`hydrate` are **deprecated, not removed,** in React 18 (they're fully
removed only in the 18→19 hop) — moving to `createRoot`/`hydrateRoot` now is still the
right fix, since it's required eventually and is a mechanical, Phase-8-allowed change.
Cross-check against `references/breaking-changes.md`'s `## React 17 → React 18` section
and the official guide it links to.

### If `targetMajor` is 19 (18→19 hop)

```bash
grep -rn "contextTypes\|getChildContext" <src>              # legacy Context API, removed
grep -rn "\.defaultProps" <src>                              # removed for function components
grep -rn "SECRET_INTERNALS" <src>                            # renamed in React 19
grep -rln "findDOMNode" <src>                                # removed entirely, throws now
grep -rln "ReactDOM\.render\|ReactDOM\.hydrate\|unmountComponentAtNode" <src>
grep -rln "react-dom/test-utils" <src>                       # only `act` survives; everything else removed
grep -rn 'ref="' <src>                                       # string refs, removed
grep -rln "createFactory\|useFormState" <src>
```

For every hit: open the file, look up the exact replacement in
`references/breaking-changes.md`'s `## React 18 → React 19` section's Removed APIs
table, and apply it there — a `ReactDOM.render`/`hydrate` call becomes
`createRoot(...).render(...)`/`hydrateRoot(...)`, a string ref becomes a callback ref or
`useRef`, `defaultProps` becomes an ES6 default parameter with the *identical* default
value, and so on.

### For every hit, in any of the above

A hit inside a comment (explaining what used to be there, or referencing this playbook)
doesn't count — only hits in actual code matter. Every fix should be explainable purely
as a React-`<targetMajor>` API-shape change — see Phase 8's business-logic-freeze rule,
which applies from this phase onward.

## Phase 5 — TypeScript-specific fixes

**Entry:** Phase 4 exit is green. **Exit:** the TypeScript-only changes for this hop's
`targetMajor` are fixed and `npx tsc -b` is clean against the *current* React types
(before Phase 6 bumps them — this phase only fixes the parts of the codebase that are
wrong regardless of React version, e.g. `useRef()` with no initial value).

Applied by hand, the same way as Phase 4:

### If `targetMajor` is 17

No dedicated TypeScript-only changes are documented for this hop — React 17's type
surface is close to 16's. If `npx tsc -b` is already clean after Phase 4, skip to Phase
6.

### If `targetMajor` is 18

```bash
grep -rn "ReactChild\b\|ReactFragment\b\|ReactNodeArray\b\|ReactText\b" <src>   # deprecated TS type aliases; replace with ReactNode
grep -rln "children" <src>                                      # implicit-children component typing tightened; may need an explicit `children?: ReactNode`
```

### If `targetMajor` is 19

```bash
grep -rn "useRef<[^>]*>()" <src>                              # useRef() now requires an argument
grep -rn "ref={.*=>.*=.*}" <src>                              # ref callbacks with an implicit return
grep -rn "React\.Reducer<\|useReducer<React" <src>            # old single-type-parameter useReducer usage
grep -rln "declare global" <src>                              # check for bare `namespace JSX` augmentations
```

Walk `references/breaking-changes.md`'s `## React 18 → React 19` section's TypeScript-
only changes for the exact fix per pattern.

### For every hit, in any of the above

None of these greps are perfectly precise (regex over JSX/TS syntax rarely is) — treat
hits as candidates to inspect, not a final list, and cross-check against a red
`npx tsc -b` for anything the greps miss. Every fix here should be explainable purely as
a React-`<targetMajor>` API-shape change — see Phase 8.

## Phase 6 — Upgrade flagged dependencies, then React itself

**Entry:** Phase 5 exit is green. **Exit:** every 🟡 dependency from `PLAN.md` Phase 1
now shows ✅, TypeScript clears the Phase 2 floor if applicable, and `react`/`react-dom`/
`@types/react*` resolve to the chosen target version with no duplicate React copies
(`npm ls react`).

```bash
# 6a — flagged third-party packages, one at a time, using the versions chosen in PLAN.md Phase 3
npm install <pkg>@<chosen-version>
npm test && npm run build           # still on installedMajor — isolate this step's regressions

# 6b — TypeScript, only if PLAN.md Phase 2 found it below the floor
npm install -D typescript@<chosen-version>
npx tsc -b                          # against the OLD @types/react — confirm the TS bump alone is clean

# 6c — React itself, exact version chosen per PLAN.md Phase 3
npm install --save-exact react@<target> react-dom@<target>
npm install --save-exact -D @types/react@^<targetMajor> @types/react-dom@^<targetMajor>   # only if the project uses TypeScript
```

Don't re-decide versions here — install what `PLAN.md` Phase 3 already chose.

Fix TypeScript compile errors before moving on — see `references/breaking-changes.md`'s
section matching `targetMajor` (Phase 5 above already walked the ones fixable before
this install; this step catches whatever only surfaces once the new `@types/react*` is
actually installed). Do not proceed to Phase 7 with a red `tsc` build; a compile error
here will masquerade as a component bug in the next phase. As in Phase 4, every fix here
must be a mechanical type-level change — see Phase 8.

## Phase 7 — Per-component fix-and-verify loop

**Entry:** Phase 6 exit is green (compiles clean). **Exit:** every component's own test
file passes in isolation, and only the component(s) whose test failed were edited.

This is the phase where component files actually change, and it's structured so that
**a component is only touched because its own test told you to** — not as a blanket
sweep. Don't batch-edit every component up front; let the failing test point at the
file.

1. Enumerate component/test pairs **within the recorded scope**: every component file
   under `scope.paths` that has a sibling test file (`*.test.tsx`/`.spec.tsx` or the
   project's equivalent convention).
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
     release notes for `targetMajor` mention a required prop/initialization change.
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
explainable as a React-`<targetMajor>` API-shape change, with nothing else riding along.

This gate applies retroactively to every file touched in Phases 4–7. A React version
migration should never be the vehicle for an unrelated behavior change — even a
"harmless-looking" one — because it makes the diff impossible to review for migration
risk alone, and any regression becomes ambiguous (was it the version bump, or the
drive-by tweak?).

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

1. If `targetMajor` is 19: check whether custom render-error monitoring depends on
   errors being re-thrown/double-logged — React 19 changed this (see
   `references/breaking-changes.md`'s `## React 18 → React 19` section); move it to
   `onCaughtError`/`onUncaughtError`/`onRecoverableError` if so (this is itself a
   mechanical, Phase-8-allowed change). Not applicable to the 17 or 18 targets.
2. `npm test` — the **whole suite**, not just the scoped folders (zero `act()`-related
   console errors). React itself changed for the entire app regardless of scope.
3. Manual QA pass in the running app, still under `<StrictMode>`, exercising every area
   touched by a Phase 6 dependency upgrade — including areas **outside** the migration
   scope, since they now run on `targetMajor` too even though they weren't proactively
   fixed. If something outside scope actually breaks (build failure, runtime throw,
   failing test), that's not a minor note — it means this scoped migration isn't
   shippable as-is. Stop and put the decision to the user explicitly: expand scope to
   fix it now, or hold the React bump until it's addressed separately. Don't silently
   fix it yourself (that's unplanned scope creep) and don't silently ship it broken.
4. `npm run build` — completes cleanly, no unexpected bundle-size jump.
5. `npm audit` once more — confirm the vulnerability delta matches what `PLAN.md` Phase
   3 recorded (no surprise new findings from the final dependency graph).

## Phase 10 — Deliverable

Two different documents serve two different purposes here — don't blend them:

- **`instructions.md`** (repo root) is a **generic, durable playbook** — a compatibility
  matrix keyed to *categories* of packages this project depends on (routing, UI kit,
  data grid, testing stack — not "as of 2026-07-19, react-bootstrap@2.10.10 is ✅"), the
  phase sequence with gates, a stack-specific gotchas section, and a rollback plan. If
  it doesn't exist yet, write it following the structure of this skill's own example at
  the bottom of `references/breaking-changes.md`. If it already exists, **do not** add
  dated "result of this run" sections, per-component result tables, status banners, or
  checked-off checklists to it — that turns a reusable runbook into a transcript of one
  execution, which is exactly what confuses the *next* run. Checklists in
  `instructions.md` stay unchecked, as a template.
- **`migrationHistory.json`** is where this run's actual findings live — the live
  dependency classification, the TypeScript floor result, the vulnerability delta, the
  per-component pass/fail/fixed matrix from Phase 7, and (if `scope.mode` was
  `"custom"`) which folders were migrated and which were explicitly left out. It's
  already being kept current per-phase (Step 3 above) — Phase 10 doesn't add new
  reporting duty here, just confirm it's complete and accurate as the final record.

If the user wants a narrative summary beyond what's in `migrationHistory.json` (e.g. for
a PR description), write that directly in your response to them — not into
`instructions.md`.

## What NOT to do in this stage

- Don't bump the React version before every 🔴-classified dependency (from `PLAN.md`
  Phase 1) has been resolved — this is the most common cause of a broken migration
  attempt.
- Don't re-decide package versions in Phase 6 — install what `PLAN.md` Phase 3 chose.
- Don't skip the git-branch requirement before making Phase 4/5 fixes.
- Don't edit a component file in Phase 7 unless its own test (or a test that exercises
  it) actually failed — that phase is test-driven on purpose, not a rewrite pass.
- Don't let a business-logic change ride along with a mechanical migration edit — every
  changed hunk must be traceable to a React-`<targetMajor>` API-shape change (Phase 8).
  If it isn't, flag it instead of applying or discarding it unilaterally.
- Don't apply another hop's grep patterns or fixes from Phase 4/5 — only the subsection
  matching this run's `targetMajor` is relevant; the others are there for a future run.
- Don't call the migration done without Phase 9's `npm audit` recheck against the
  `PLAN.md` Phase 3 baseline.
- Don't let a scoped run imply the rest of the repo is safe — Phase 6's React bump is
  whole-repo regardless of `scope`; say explicitly what wasn't fixed, and escalate
  (don't quietly patch or quietly ignore) if something out-of-scope actually breaks in
  Phase 9.

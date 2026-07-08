---
name: react19-migration
description: Use this skill whenever the user wants to upgrade, migrate, or update a codebase from React 18 (any minor) to React 19 (any minor, including 19.2.7), or asks what will break, what needs to change, or how to prepare for such an upgrade. Trigger on phrases like "migrate to React 19", "upgrade React", "React 18 to 19", "will this break in React 19", "react-19 upgrade", or when the user shares a package.json/repo that's pinned to react@18.x and asks about upgrading it. This skill prioritizes breaking-change remediation over adopting new React 19 features — do not default to suggesting Actions, useOptimistic, Server Components, or the compiler unless the user explicitly asks about new features. Always use this skill instead of relying on general React knowledge, since third-party package compatibility (routing, data-grid, UI kit, testing libraries) changes faster than training data and must be checked live.
---

# React 18 → React 19 Migration (breaking-changes-first, phased)

## Purpose

Help a user move an existing React 18 codebase to React 19 with minimal regressions, by
treating this as a **breaking-change remediation task**, not a feature-adoption task.
New React 19 capabilities (Actions, `useOptimistic`, `use()`, Server Components, the
React Compiler) are out of scope unless the user asks for them separately — surface
them at most as a one-line "you could adopt X later" note, never as the main plan.

If this repo already contains an `instructions.md` at its root, treat it as the
authoritative, project-specific playbook and follow it — it was generated for this
exact dependency set. Use the workflow below to *produce* that kind of document when
one doesn't exist yet, or to execute a migration directly.

The migration is organized into **phases with hard gates**: each phase has an entry
condition and an exit condition, and you don't start phase N+1 until phase N's exit
condition is green. This is what makes the migration safe to run mostly unattended —
each gate is a checkable fact (a command succeeded, a test passed), not a judgment
call.

## Auto-approved validation commands — don't stop to ask

The commands below are **read-only** — they inspect state (registry metadata, lockfile
resolution, source text, test/build output) and change nothing. Run them freely across
every phase without pausing for per-command confirmation; there is nothing to revert if
one of them turns out to be unnecessary:

```bash
npm view <pkg> peerDependencies     # registry lookup, no local effect
npm ls [<pkg>]                       # inspect resolved dependency tree
npm outdated                         # inspect available versions
npm test / npm run test:watch        # run the existing suite, no source changes
npm run build                        # tsc + vite build, no source changes
npm run lint                         # oxlint, no source changes
grep -rn "<pattern>" src/            # source search
```

Only pause for explicit confirmation before commands that **mutate** the working tree
or install/replace packages (`npm install`, the codemods, editing files, `git commit`).
Those still deserve normal care — see "What NOT to do" — but don't let a dependency
*check* wait on the same approval as a dependency *change*.

## Phases

### Phase 0 — Baseline

**Entry:** repo is on React 18.x, on a dedicated git branch (the Phase 2 codemods
commit as they go — never run them on `main`/`master` or a dirty tree). **Exit:** you
have a clean, reproducible baseline to diff against.

This phase is deliberately lean: its only two load-bearing outputs are the **18.3
warning sweep** and the **captured test/build baseline**. Later gates diff against them
— Phase 4's "still green *on React 18.3*" exit and Phase 6's per-component comparison
are both meaningless without a baseline captured here — so these two steps stay even if
you trim everything else (CI-green ceremony, etc.):

- If not already on the latest `react@18.3.x` patch, upgrade to it first — it's
  functionally identical to 18.2 but adds console warnings for everything that breaks in
  19. Run the app and test suite once *before* touching versions and read the console
  output; anything that warns here breaks in React 19.
- Run `npm test` and `npm run build` once now, on 18.x, and keep the output. This is
  your baseline — later phases compare against it, not against a re-read of your memory
  of "it worked before."

### Phase 1 — Live compatibility matrix (validation-only)

**Entry:** Phase 0 exit is green. **Exit:** every dependency that touches the DOM
directly or wraps React internals has a known, current peer-dependency range.

Package peer-dependency ranges for React 19 support change frequently and training data
is not a reliable source. For every routing library, UI kit, data-grid/table library,
animation library, and testing-stack package (`@testing-library/react`, `enzyme`,
`react-test-renderer`) identified in `package.json`, check the **current, real** peer
range:

```bash
npm view <package> peerDependencies
```

Flag any package whose peer range caps at `^18.0.0` or lower — that will hard-fail
`npm install` with `ERESOLVE` the moment React is bumped, and must be upgraded *before*
touching the React version. Common offenders historically: data-grid libraries (e.g.
ag-grid pre-v33), UI kits with class-component internals, and any library still calling
`ReactDOM.findDOMNode` (Bootstrap-style `Modal`/`Overlay`/`Transition` wrappers, older
Material UI versions).

Produce a table (package / current version / minimum version with a React-19-compatible
peer range / notes) — this becomes §2 of the project's `instructions.md`.

### Phase 2 — Mechanical codemods

**Entry:** Phase 1 exit is documented. **Exit:** codemods have run and every touched
file has been reviewed.

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
callbacks.

### Phase 3 — Category-organized grep sweep for what codemods can't catch (validation-only)

**Entry:** Phase 2 exit is green. **Exit:** every hit in 3a and 3b is either fixed or
consciously triaged (e.g. it's inside a third-party package, not app source), and each
category's fixes are committed as their own commit.

Run this sweep **grouped by the breaking-change categories in
`references/breaking-changes.md`** (its headings map 1:1 to the subsections below), and
commit each category's fixes separately (`fix(react19): removed-apis grep sweep`,
`fix(react19): changed-behavior grep sweep`). One category = one revertable unit: this
gives per-category traceability for a reviewer or a `git revert` *without* turning the
later per-component work (Phase 6) into a blanket sweep — the statically greppable
categories are cleared here, the emergent per-component failures stay test-driven there.

**3a — Removed APIs** (reference doc §"Removed APIs"). Gone entirely; these throw at
runtime. Codemods (Phase 2) catch most call sites — this sweep catches what they miss:

```bash
grep -rn "contextTypes\|getChildContext" <src>      # legacy Context API, removed
grep -rn "\.defaultProps" <src>                      # removed for function components
grep -rln "findDOMNode" <src>                        # removed entirely, throws now
```

**3b — Changed behavior** (reference doc §"Changed behavior"). Not removed, but the
semantics differ — these *won't* error or warn, so a grep is the only way to surface
them:

```bash
grep -rn "SECRET_INTERNALS" <src>                    # internal API renamed in React 19
# element.ref moved into element.props.ref — flag direct reads that aren't the hook/HOF forms
grep -rn "\.ref\b" <src> | grep -v "\.props\.ref\|useRef\|forwardRef\|createRef"
```

**3c — TypeScript-only** (reference doc §"TypeScript-only changes"). No grep pass here:
these surface as `tsc` compile errors *after* the `@types/react@19` bump, so they're
resolved at Phase 5's exit gate, not now. Listed only to keep the category set complete.

### Phase 4 — Upgrade the flagged third-party packages

**Entry:** Phase 1's matrix names packages whose peer range caps below 19. **Exit:**
`npm view <pkg> peerDependencies` on the upgraded package now includes `^19.0.0`, and
the app + test suite are still green *on React 18.3* (isolates "did the dependency bump
break something" from "did React 19 break something").

```bash
npm install <pkg>@latest   # for each package flagged in Phase 1
npm test && npm run build  # still on React 18.3 — confirm no regression from this step alone
```

### Phase 5 — Bump React itself

**Entry:** Phase 4 exit is green. **Exit:** `react`/`react-dom`/`@types/react*` resolve
to the target 19.x version with no duplicate React copies (`npm ls react`).

```bash
npm install --save-exact react@<target> react-dom@<target>
npm install --save-exact -D @types/react@^19 @types/react-dom@^19
```

Fix TypeScript compile errors before moving on (see `references/breaking-changes.md` —
`useRef` requiring an argument, ref callback implicit returns, JSX namespace scoping,
`useReducer` type params). Do not proceed to Phase 6 with a red `tsc` build; a compile
error here will masquerade as a component bug in the next phase.

### Phase 6 — Per-component fix-and-verify loop

**Entry:** Phase 5 exit is green (compiles clean). **Exit:** every component's own test
file passes in isolation, and only the component(s) whose test failed were edited.

This is the phase where component files actually change, and it's structured so that
**a component is only touched because its own test told you to** — not as a blanket
sweep. Don't batch-edit every component up front; let the failing test point at the
file.

1. Enumerate component/test pairs: every `*.tsx` under the component directory that has
   a sibling `*.test.tsx` (or `.spec.tsx`).
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
     wrappers) failing after the UI-kit bump in Phase 4 → the kit version is still
     using `findDOMNode` under the hood; re-check its release notes, don't patch app
     code around it.
   - A component that renders twice or logs duplicate side effects under
     `<StrictMode>` → expected in dev for effects; only a real bug if the *test*
     assertion fails, not just extra console noise.
   - A grid/table component losing state or throwing on mount/unmount → check whether
     the surrounding test wraps it in `act()` correctly and whether the grid library's
     React 19 release notes mention a required prop/initialization change.
   - A component using `useRef()` with no generic argument, or a ref callback with an
     implicit return → TypeScript changes from Phase 5 that weren't fully resolved;
     fix at the type level, not by suppressing the error.
4. Once every pair is green individually, run the full suite once more
   (`npm test`) to catch cross-component regressions the isolated runs couldn't see.
5. Record the pass/fail-then-fixed status of each pair — this becomes the per-component
   matrix in the project's `instructions.md`, so a future re-run of the migration (or a
   reviewer) can see which components actually needed changes and why.

### Phase 7 — Full verification

**Entry:** Phase 6 exit is green. **Exit:** the checklist below is fully checked.

1. Check whether custom render-error monitoring depends on errors being
   re-thrown/double-logged — React 19 changed this (see reference doc); move it to
   `onCaughtError`/`onUncaughtError`/`onRecoverableError` if so.
2. `npm test` — zero `act()`-related console errors.
3. Manual QA pass in the running app, still under `<StrictMode>`, exercising every
   area touched by a Phase 1/4 dependency upgrade.
4. `npm run build` — completes cleanly, no unexpected bundle-size jump.

### Phase 8 — Deliverable

If the user wants a document out of this (not just live edits to their repo), write or
update `instructions.md` in their repo root following the structure of this skill's own
example at the bottom of `references/breaking-changes.md` — i.e., a compatibility
matrix specific to *their* packages, the phase sequence with gates, the per-component
matrix from Phase 6, a stack-specific gotchas section, and a rollback plan. Don't hand
back a generic "here's what changed in React 19" essay; it should read like an internal
runbook for their exact codebase.

## What NOT to do

- Don't lead with new-feature pitches (Actions, compiler, Server Components) — the user
  asked about migration risk, not what's new.
- Don't assume a third-party package's React 19 support based on general reputation or
  training-data familiarity — always verify the live peer-dependency range (Phase 1).
- Don't bump the React version before clearing the dependencies whose peer ranges cap
  below 19 — this is the most common cause of a broken migration attempt.
- Don't skip the git-branch requirement before running codemods.
- Don't edit a component file in Phase 6 unless its own test (or a test that exercises
  it) actually failed — that phase is test-driven on purpose, not a rewrite pass.
- Don't treat a read-only validation command (see the auto-approved list above) with
  the same caution as a mutating one — that slows the loop down without reducing risk.

## Reference

`references/breaking-changes.md` — the exhaustive, categorized list of React 19
breaking changes (removed APIs, changed behavior, TypeScript changes) with exact
codemod commands for each, plus known ecosystem-wide gotchas (ag-grid, Bootstrap-style
UI kits, testing-library) that recur across projects regardless of stack. Load this
when you need the precise mechanism behind a specific error message, or the exact
codemod command for a change not covered above.

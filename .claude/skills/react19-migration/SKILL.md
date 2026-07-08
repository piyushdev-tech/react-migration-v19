---
name: react19-migration
description: Use this skill whenever the user wants to upgrade, migrate, or update a codebase from React 18 (any minor) to React 19 (any minor, including 19.2.7), or asks what will break, what needs to change, or how to prepare for such an upgrade. Trigger on phrases like "migrate to React 19", "upgrade React", "React 18 to 19", "will this break in React 19", "react-19 upgrade", or when the user shares a package.json/repo that's pinned to react@18.x and asks about upgrading it. This skill prioritizes breaking-change remediation over adopting new React 19 features — do not default to suggesting Actions, useOptimistic, Server Components, or the compiler unless the user explicitly asks about new features. Always use this skill instead of relying on general React knowledge, since third-party package compatibility (routing, data-grid, UI kit, testing libraries) changes faster than training data and must be checked live.
---

# React 18 → React 19 Migration (breaking-changes-first)

## Purpose

Help a user move an existing React 18 codebase to React 19 with minimal regressions,
by treating this as a **breaking-change remediation task**, not a feature-adoption
task. New React 19 capabilities (Actions, `useOptimistic`, `use()`, Server Components,
the React Compiler) are out of scope unless the user asks for them separately — surface
them at most as a one-line "you could adopt X later" note, never as the main plan.

If this repo already contains an `instructions.md` at its root, treat it as the
authoritative, project-specific playbook and follow it — it was generated for this
exact dependency set. Use the workflow below to *produce* that kind of document when
one doesn't exist yet, or to execute a migration directly.

## Workflow

### 1. Establish the current state

Read `package.json` (and lockfile if present) to determine:
- Exact `react` / `react-dom` version and whether it's already on the latest 18.3.x
  patch (if not, upgrading to 18.3.x first is free and surfaces React-19-relevant
  deprecation warnings before any breaking change actually lands).
- Every dependency that touches the DOM directly or wraps React internals: routing
  library, UI kit, data grid / table library, animation library, and the testing stack
  (`@testing-library/react`, `enzyme`, `react-test-renderer`).

### 2. Build a live compatibility matrix — do not rely on memory

Package peer-dependency ranges for React 19 support change frequently and training
data is not a reliable source here. For each dependency identified in step 1, check
its **current, real** peer dependency range:

```bash
npm view <package> peerDependencies
```

or fetch its npm registry page / GitHub releases if `npm view` isn't available. Flag
any package whose peer range caps at `^18.0.0` or lower — that will hard-fail
`npm install` with `ERESOLVE` the moment React is bumped, and needs to be upgraded
*before* touching the React version. Common offenders historically: data-grid
libraries (e.g. ag-grid pre-v33), UI kits with class-component internals, and any
library still calling `ReactDOM.findDOMNode` (Bootstrap-style `Modal`/`Overlay`/
`Transition` wrappers, older Material UI versions).

### 3. Run the official codemods before manual edits

The React team + codemod.com publish codemods that mechanically fix most breaking
changes. Always try these first, on a clean git branch (required — the codemods commit
as they go):

```bash
npx codemod react/19/migration-recipe          # ReactDOM.render, string refs, act imports, useFormState
npx types-react-codemod@latest preset-19 ./src # TS-specific type migrations
```

Individual codemods exist if only one change is needed (see `references/breaking-changes.md`
for the full list with exact commands).

### 4. Grep for what codemods can't catch

```bash
grep -rn "contextTypes\|getChildContext" <src>      # legacy Context API, removed
grep -rn "\.defaultProps" <src>                      # removed for function components
grep -rn "SECRET_INTERNALS" <src>                    # renamed in React 19
grep -rln "findDOMNode" <src>                        # removed entirely, throws now
```

### 5. Sequence the actual upgrade

1. Upgrade flagged third-party packages (step 2) to versions with React 19 peer
   support — verify with `npm view <pkg> peerDependencies` again after.
2. Run the test suite and app on React 18.3 once more to confirm those upgrades alone
   didn't regress anything.
3. `npm install --save-exact react@<target> react-dom@<target>` and matching
   `@types/react`/`@types/react-dom`.
4. Fix TypeScript errors (see `references/breaking-changes.md` — `useRef` requiring an
   argument, ref callback implicit returns, JSX namespace scoping, `useReducer` type
   params).
5. Fix runtime errors (`findDOMNode`, `ReactDOM.render`/`hydrate`, `act` import path,
   string refs).
6. If the user has custom render-error monitoring, check whether it depends on errors
   being re-thrown/double-logged — React 19 changed this (see reference doc) and it
   needs to move to `onCaughtError`/`onUncaughtError`/`onRecoverableError`.
7. Run tests, run the app manually under `<StrictMode>`, run a production build.

### 6. Produce or update the deliverable

If the user wants a document out of this (not just live edits to their repo), write an
`instructions.md` in their repo root following the structure of this skill's own
example at the bottom of `references/breaking-changes.md` — i.e., a compatibility
matrix specific to *their* packages, a step-by-step sequence, a stack-specific gotchas
section, and a rollback plan. Don't hand back a generic "here's what changed in React
19" essay; it should read like an internal runbook for their exact codebase.

## What NOT to do

- Don't lead with new-feature pitches (Actions, compiler, Server Components) — the
  user asked about migration risk, not what's new.
- Don't assume a third-party package's React 19 support based on general reputation or
  training-data familiarity — always verify the live peer-dependency range.
- Don't bump the React version before clearing the dependencies whose peer ranges cap
  below 19 — this is the most common cause of a broken migration attempt.
- Don't skip the git-branch requirement before running codemods.

## Reference

`references/breaking-changes.md` — the exhaustive, categorized list of React 19
breaking changes (removed APIs, changed behavior, TypeScript changes) with exact
codemod commands for each, plus known ecosystem-wide gotchas (ag-grid, Bootstrap-style
UI kits, testing-library) that recur across projects regardless of stack. Load this
when you need the precise mechanism behind a specific error message, or the exact
codemod command for a change not covered above.

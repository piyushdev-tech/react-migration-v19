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

This skill is written to be **repo-agnostic** — every check is a live command against
*this* project's actual `package.json`/registry state, never a hardcoded version
number. Re-run the checks fresh on every repo; don't reuse findings from a previous
migration.

## Resuming across sessions, machines, or people

A migration can get interrupted partway through — a token/time budget runs out, or the
work needs to be handed off (e.g. pushed to a feature branch for a colleague to
finish). `migrationHistory.json` at the repo root exists for exactly this: it records
which phase was last completed, so a later invocation of this skill — by anyone, on
any machine — resumes instead of starting over. Check for it before Phase 0, and
update it after every phase's exit condition goes green. Full protocol and schema:
`references/migration-history.md` — read it before touching this file for the first
time in a session.

The `react19-migration-agent` custom agent (`.claude/agents/react19-migration-agent.md`)
wraps this entire skill plus the checkpoint protocol into a single delegatable unit —
use it (or its instructions as a model) when you want the whole plan-and-implement
workflow driven end to end, including automatic resumption.

## Migration scope: whole repo, or specific folders

By default this migrates the whole source tree. The user can instead ask to scope it to
specific folders/files (e.g. "just migrate `src/checkout` for now"). `PLAN.md` Phase 0
is where this gets decided and recorded — see `references/migration-history.md`'s
"Migration scope" section for the full protocol, and the one thing scope can *not*
change: the React version bump itself (`IMPLEMENT.md` Phase 6) always applies to the
whole repo, since a single app can't run two React majors at once.

## Two stages, two files — load only the one you need

The phases are split across two files under this skill's directory so you don't pay to
load implementation detail when the task only calls for an assessment, or vice versa:

- **`PLAN.md` — Phases 0–3 (assessment, read-only).** Baseline, live peer-dependency
  classification, TypeScript-floor check, vulnerability & stable-version policy. Nothing
  in this stage mutates the codebase. **Read this first, always** — it's the entry point
  for every request this skill handles, including "is it safe to upgrade" /
  "what would break" questions that never intend to touch code.
- **`IMPLEMENT.md` — Phases 4–10 (execution).** Codemods, dependency + React installs,
  per-component fixes, the business-logic-freeze review, full verification, and the
  deliverable. **Only read this once `PLAN.md`'s Phase 3 exit is green** — its steps
  consume Phase 1–3's outputs (the classification table, the TypeScript floor finding,
  chosen target versions) and assume they already exist.

If the user's request clearly wants the full migration performed, you'll end up reading
both files in sequence — that's expected, not wasteful. The point isn't to avoid ever
loading `IMPLEMENT.md`, it's to avoid loading it for requests that never needed it (a
pure compatibility check, a "what's blocking us" question, planning work done well
before anyone's ready to touch `package.json`).

## Auto-approved validation commands — don't stop to ask

The commands below are **read-only** — they inspect state (registry metadata, lockfile
resolution, source text, test/build output) and change nothing. Run them freely across
every phase, in both stages, without pausing for per-command confirmation; there is
nothing to revert if one of them turns out to be unnecessary:

```bash
npm view <pkg> peerDependencies     # registry lookup, no local effect
npm view <pkg> dist-tags            # registry lookup — which tag points at which version
npm view <pkg> time.<version>       # registry lookup — how old a release is
npm audit                           # vulnerability scan, no local effect (never `npm audit fix`)
npm ls [<pkg>]                       # inspect resolved dependency tree
npm outdated                         # inspect available versions
npm test / npm run test:watch        # run the existing suite, no source changes
npm run build                        # tsc + vite build, no source changes
npm run lint                         # oxlint, no source changes
npx tsc -v                           # installed TypeScript version, no local effect
grep -rn "<pattern>" src/            # source search
```

Only pause for explicit confirmation before commands that **mutate** the working tree
or install/replace packages (`npm install`, `npm audit fix`, the codemods, editing
files, `git commit`). Those still deserve normal care — but don't let a dependency
*check* wait on the same approval as a dependency *change*.

## What NOT to do (applies across both stages)

- Don't lead with new-feature pitches (Actions, compiler, Server Components) — the user
  asked about migration risk, not what's new.
- Don't skip straight to `IMPLEMENT.md` because the migration "looks simple" — Phases
  0–3 in `PLAN.md` are what tell you whether it actually is.
- Don't treat a read-only validation command (see the list above) with the same caution
  as a mutating one — that slows the loop down without reducing risk.
- Stage-specific rules (what not to do within planning vs. within implementation) live
  in each stage's own file — read them there, don't assume this list is exhaustive.

## Reference

- `PLAN.md` — Phases 0–3, read first, always.
- `IMPLEMENT.md` — Phases 4–10, read once `PLAN.md` is green.
- `references/breaking-changes.md` — the exhaustive, categorized list of React 19
  breaking changes (removed APIs, changed behavior, TypeScript changes) with exact
  codemod commands for each, plus known ecosystem-wide gotchas (ag-grid, Bootstrap-style
  UI kits, testing-library) that recur across projects regardless of stack. Load this
  when you need the precise mechanism behind a specific error message, or the exact
  codemod command for a change not covered in `IMPLEMENT.md`.

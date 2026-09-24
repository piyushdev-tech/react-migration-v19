---
name: react-migration
description: Use this skill whenever the user wants to upgrade, migrate, or update a codebase between React major versions anywhere in the 16→19 range (e.g. React 16→17, 17→18, or 18→19), or asks what will break, what needs to change, or how to prepare for such an upgrade — including when they name a distant final target like "migrate from React 16 to React 19," since this skill enforces exactly one major-version hop per run and determines the correct next hop itself. Trigger on phrases like "migrate to React 19", "upgrade React", "React 18 to 19", "React 16 to 17", "will this break in React 18", "react major upgrade", or when the user shares a package.json/repo pinned to react@16.x/17.x/18.x and asks about upgrading it. This skill prioritizes breaking-change remediation over adopting new-version features — do not default to suggesting Actions, useOptimistic, Server Components, concurrent-mode features, or the compiler unless the user explicitly asks about new features. Always use this skill instead of relying on general React knowledge, since third-party package compatibility (routing, data-grid, UI kit, testing libraries) changes faster than training data and must be checked live.
---

# React major-version migration (breaking-changes-first, phased, one major at a time)

## Purpose

Help a user move an existing React codebase forward by **exactly one major version per
run** — 16→17, 17→18, or 18→19 — treating each hop as a **breaking-change remediation
task**, not a feature-adoption task. New capabilities introduced by the target version
(Actions, `useOptimistic`, `use()`, Server Components, the React Compiler, concurrent
features, etc.) are out of scope unless the user asks for them separately — surface them
at most as a one-line "you could adopt X later" note, never as the main plan.

If the user names a final target more than one major away from what's currently
installed (e.g. "get us from React 16 to React 19"), do not attempt it in one pass —
this skill has no concept of a multi-major jump. Say plainly that the upgrade path is a
sequence of hops (16→17, then 17→18, then 18→19), that this run will only perform the
first one, and that the rest requires re-invoking the skill after each hop lands. See
"Version scope" below for how the current-hop target is determined and how a
multi-run chain is tracked.

If this repo already contains an `instructions.md` at its root, treat it as the
authoritative, project-specific playbook and follow it — it was generated for this
exact dependency set. Use the workflow below to *produce* that kind of document when
one doesn't exist yet, or to execute a migration directly.

This skill is written to be **repo-agnostic** — every check is a live command against
*this* project's actual `package.json`/registry state, never a hardcoded version
number. Re-run the checks fresh on every repo; don't reuse findings from a previous
migration.

## Version scope: exactly one major version per run

**Phase 0 of `PLAN.md` always determines this run's target by reading the installed
React version out of `package.json` and adding exactly 1 to its major** — it never
trusts a user-requested target directly. If the user asks for a jump of more than one
major, Phase 0 clamps the request to `installedMajor + 1` and reports the clamp
explicitly rather than silently complying or silently ignoring the extra distance.

This applies whether the request came from a live conversation or a task description
handed to `react-migration-agent` — the agent doesn't get to skip the clamp either.

A user's stated *final* destination (e.g. "eventually I want 19") is still worth
recording — it lets each hop's report tell the user how many more runs remain — but it
never changes what a single run actually does. See `references/migration-history.md`'s
"Multi-hop chaining" section for exactly how this is tracked across repeated
invocations, including what happens to `migrationHistory.json` when one hop finishes
and the next one starts.

Supported starting points are React 16, 17, or 18 (targeting 17, 18, or 19
respectively). A repo already on 19, or below 16, is outside this skill's documented
breaking-change coverage — say so rather than guessing at unreviewed territory.

## Resuming across sessions, machines, or people

A migration can get interrupted partway through — a token/time budget runs out, or the
work needs to be handed off (e.g. pushed to a feature branch for a colleague to
finish). `migrationHistory.json` at the repo root exists for exactly this: it records
which phase was last completed, so a later invocation of this skill — by anyone, on
any machine — resumes instead of starting over. Check for it before Phase 0, and
update it after every phase's exit condition goes green. Full protocol and schema:
`references/migration-history.md` — read it before touching this file for the first
time in a session.

The `react-migration-agent` custom agent (`.claude/agents/react-migration-agent.md`)
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

- **`PLAN.md` — Phases 0–3 (assessment, read-only).** Baseline plus **this run's target
  major-version determination** (never more than one major past what's installed), live
  peer-dependency classification, TypeScript-floor check, vulnerability &
  stable-version policy. Nothing in this stage mutates the codebase. **Read this first,
  always** — it's the entry point for every request this skill handles, including "is it
  safe to upgrade" / "what would break" questions that never intend to touch code.
- **`IMPLEMENT.md` — Phases 4–10 (execution).** Manual removed-API and TypeScript
  fixes, dependency + React installs, per-component fixes, the business-logic-freeze
  review, full verification, and the deliverable. **Only read this once `PLAN.md`'s
  Phase 3 exit is green** — its steps consume Phase 1–3's outputs (the classification
  table, the TypeScript floor finding, chosen target versions) and assume they already
  exist. Which specific breaking-change list applies depends on **this run's target
  major** (see `references/breaking-changes.md`) — Phase 0 already pinned that down, so
  Phases 4/5 don't re-derive it.

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
or install/replace packages (`npm install`, `npm audit fix`, editing files,
`git commit`). Those still deserve normal care — but don't let a dependency *check*
wait on the same approval as a dependency *change*.

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
- `references/breaking-changes.md` — organized **per major-version hop**, since each one
  has a different depth of local detail:
  - **16→17** and **17→18** are documented as a link to React's own official upgrade
    guide plus a short highlights list — these releases are old, stable, low-churn, and
    already extensively documented upstream, so this skill doesn't duplicate that detail
    locally.
  - **18→19** carries the categorized, exhaustive list this skill originally shipped
    with (removed APIs, changed behavior, soft deprecations, TypeScript changes, and
    their exact manual fixes) plus known ecosystem-wide gotchas (ag-grid,
    Bootstrap-style UI kits, testing-library) that recur across projects regardless of
    stack.
  Load whichever section matches **this run's target major** (Phase 0 determined it) —
  never the whole file — when you need the precise mechanism behind a specific error
  message or the exact fix for a change not already covered in `IMPLEMENT.md`.
- `references/dependency-watchlist.md` — a durable, project-independent list of specific
  third-party packages with their known-recommended/stable version per target React
  major, meant to supplement (not replace) Phase 1's live per-repo peer-dependency
  check. Currently a placeholder pending the package list; see that file for its status.

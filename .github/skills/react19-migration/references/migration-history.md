# `migrationHistory.json` — cross-session/cross-machine checkpoint protocol

Loaded on demand from `SKILL.md`/`PLAN.md`/`IMPLEMENT.md`. This solves a specific
problem: a migration session can run out of budget (tokens, time, or the person just
needs to stop) partway through, and the remaining work needs to be picked up later —
by the same person, a colleague, or on a different machine entirely — **without
starting over from Phase 0** and without silently trusting stale progress either.

`migrationHistory.json` lives at the **repo root**, next to `instructions.md`, and is
**committed to git** (it is not a scratch file — the whole point is that it travels
with the branch when it's pushed and pulled elsewhere).

## When to read it

At the very start of any invocation of this skill — before Phase 0 — check whether
`migrationHistory.json` exists at the repo root:

- **Doesn't exist:** this is a fresh migration. Create it (schema below) with every
  phase `"pending"`, and proceed normally from Phase 0.
- **Exists:** read it. Find the first phase that isn't `"complete"` and resume there —
  do not silently redo phases already marked complete, and do not silently skip past
  the first incomplete one either. Tell the user which phase you're resuming at and
  why (quote the file's own `resumeInstructions`).

## Trusting recorded findings vs. re-verifying

Phases are written to be idempotent and cheap to re-run (a grep sweep finds nothing if
a fix is already applied; `npm view`/`npm audit` are read-only), so when in doubt,
prefer re-running a phase over trying to reconstruct partial progress from
notes. Specifically:

- **Resuming mid-Stage-2** (some Phase 4+ already complete): trust Stage 1's recorded
  `findings` (dependency classification, TypeScript floor, chosen React version) as-is
  — those were already acted on by the completed phases, so redoing them now wouldn't
  change what's already installed.
- **Resuming exactly at the Stage 1 → Stage 2 boundary** (Phase 3 just completed,
  about to start Phase 4 for the first time) **on a different machine or after a
  meaningful time gap**: do a light re-verification of Stage 1's key facts (`npm ls
  react react-dom` for drift, `npm view <pkg> peerDependencies` for anything classified
  🟡, `npm audit` for the vulnerability baseline) before proceeding — registry state and
  local `node_modules` can both have changed. This is a quick check, not a full redo of
  Phase 1–3's narrative.
- **Never** trust a phase marked `"complete"` blindly if the live repo state
  contradicts it (e.g. the file says React is bumped but `package.json` still shows
  18.3.0) — treat that exactly like the `node_modules`/lockfile drift Phase 0 already
  watches for, and fix the discrepancy before continuing.

## Migration scope

By default this migration touches the whole source tree (`src/`, or the project's
equivalent). The user can instead scope it to specific folders/files — e.g. "just
migrate `src/components/checkout` for now, leave the rest for later." Scope is decided
**once, up front, and recorded** in `migrationHistory.json`'s `scope` field so it never
needs re-asking on resume.

**Critical distinction — scope does not apply uniformly across phases:**

- Phases 4, 5, 7, and 8 (grep sweep + manual removed-API fixes, TypeScript-specific
  fixes, per-component loop, business-logic-freeze diff) run **only against the chosen
  scope** — that's the whole point of scoping, and it's what keeps a partial
  migration's diff small and reviewable.
- Phase 6's dependency bump (`react`/`react-dom` and their `@types`) is **always
  whole-repo**. There is no such thing as "React 19 in this folder, React 18 in that
  one" — the runtime is shared across the entire app. Scoping which files get
  *proactively fixed* does not scope which files are *exposed* to the new React
  version. Anything outside the chosen scope that has a real React 19 breaking pattern
  will still hit it at compile time or runtime once Phase 6 runs — scoping just means
  you're choosing to deal with that later rather than now.
- Because of that, **always tell the user explicitly** (and record in the deliverable)
  which folders were left out of scope, so "we migrated the checkout folder" doesn't
  get misread as "the checkout folder is the only place that could break."

**Determining scope:** ask the user directly if this is an interactive session and no
scope has been specified yet — "migrate everything under `src/`, or just specific
folders?" If this is running non-interactively (e.g. a background agent invocation with
no way to block on a live answer) and no scope was given in the task itself, default to
the whole source tree and say so plainly in the final report, rather than guessing at a
narrower scope nobody asked for.

Schema:

```json
"scope": { "mode": "all", "paths": ["src"] }
```

or, for a narrowed run:

```json
"scope": { "mode": "custom", "paths": ["src/components/checkout", "src/hooks/useCart.ts"] }
```

`mode` is `"all"` or `"custom"`; `paths` is a list of repo-relative folders/files. When
`mode` is `"custom"`, every grep/diff command in `IMPLEMENT.md` runs once per entry in
`paths` (or against a combined glob, whichever the tool being invoked supports) instead
of against `src/` wholesale.

## When to write it

Update the file after **every phase's exit condition goes green** — not just at the
end of the whole migration, and not at finer-than-phase granularity. Phase-level
checkpointing is deliberately the chosen granularity: it's coarse enough to keep the
file simple and cheap to maintain, and every phase is either fully idempotent
(re-running it is safe and cheap) or explicitly gated so a partial phase is easy to
resume from its own start.

Also update it immediately if a phase hits a hard stop (a 🔴-blocked dependency, a
build that won't go green) — set that phase's status to `"blocked"`, the top-level
status to `"blocked"`, and fill in `blockers` with enough detail that whoever picks
this up next (possibly someone who wasn't in the original conversation) understands
why without re-deriving it.

Use `Read` then `Write` (a full-file rewrite), not a surgical text edit — this is
structured JSON and a partial edit risks producing invalid JSON.

## Schema

```json
{
  "schemaVersion": 1,
  "migration": { "from": "18.3.0", "to": "19.2.7" },
  "branch": "upgrade/react-19",
  "status": "in_progress",
  "createdAt": "2026-07-16T02:00:00Z",
  "lastUpdatedAt": "2026-07-16T02:35:00Z",
  "scope": { "mode": "all", "paths": ["src"] },
  "currentPhase": 4,
  "phases": [
    { "id": 0, "name": "Baseline", "stage": "plan", "status": "complete", "completedAt": "2026-07-16T02:05:00Z", "summary": "one or two lines, not a full transcript" },
    { "id": 1, "name": "Live peer-dependency matrix", "stage": "plan", "status": "pending" },
    { "id": 2, "name": "TypeScript compatibility check", "stage": "plan", "status": "pending" },
    { "id": 3, "name": "Vulnerability & version-stability policy", "stage": "plan", "status": "pending" },
    { "id": 4, "name": "Grep sweep + manual fixes for removed APIs", "stage": "implement", "status": "pending" },
    { "id": 5, "name": "TypeScript-specific fixes", "stage": "implement", "status": "pending" },
    { "id": 6, "name": "Upgrade dependencies + bump React", "stage": "implement", "status": "pending" },
    { "id": 7, "name": "Per-component fix-and-verify loop", "stage": "implement", "status": "pending" },
    { "id": 8, "name": "Business-logic freeze review", "stage": "implement", "status": "pending" },
    { "id": 9, "name": "Full verification", "stage": "implement", "status": "pending" },
    { "id": 10, "name": "Deliverable", "stage": "implement", "status": "pending" }
  ],
  "findings": {
    "dependencyClassification": [
      { "package": "ag-grid-react", "classification": "safe-as-is", "installedVersion": "^36.0.0", "note": "peer range already covers ^19.0.0" }
    ],
    "typeScriptFloor": { "installed": "5.9.3", "floorRequired": "5.0", "upgradeNeeded": false },
    "chosenReactVersion": "19.2.7",
    "vulnerabilityBaseline": { "moderate": 3, "high": 1, "critical": 1, "relatedToReact": false, "deferred": true }
  },
  "blockers": [],
  "resumeInstructions": "Phases 0-3 complete. Resume at Phase 4 (IMPLEMENT.md) — the grep sweep and manual removed-API fixes have not yet been done."
}
```

Field notes:

- `status` (top-level): `"not_started"` (file just created) | `"in_progress"` |
  `"blocked"` | `"complete"`.
- `scope`: decided once at Phase 0 and never re-asked on resume — see "Migration
  scope" above. Remember Phase 6 (the React version bump) ignores this and always
  applies repo-wide.
- `phases[].status`: `"pending"` | `"in_progress"` | `"complete"` | `"blocked"`.
  Treat `"in_progress"` the same as `"pending"` when deciding where to resume — restart
  that phase from its own beginning rather than trying to reconstruct partial state
  within it.
- `phases[].summary`: one or two lines maximum — a pointer for a human, not a
  transcript. Detailed findings belong in `findings`, not prose scattered across every
  phase entry.
- `findings`: the durable outputs of Stage 1 that Stage 2 consumes. Keep this
  updated as Stage 1 phases complete; Stage 2 phases read from here instead of
  re-deriving.
- `blockers`: populated only when `status` is `"blocked"`. Each entry should name the
  package, what's blocking it, and what decision is needed (matches
  `dependency-upgrade-safety`'s 🔴 classification if that skill is available, or
  `PLAN.md` Phase 1's 🔴 classification otherwise).
- `resumeInstructions`: one sentence, plain English, written for whoever opens this
  file next — could be a colleague who wasn't in the original conversation at all.

## What NOT to do

- Don't skip creating this file for a "quick" migration attempt — the entire value is
  that it exists *before* you know whether you'll need to hand it off.
- Don't write prose transcripts of what happened into the JSON — keep `summary` fields
  short; put narrative detail in the PR description or commit messages instead, not in
  a file meant to be machine-read for resumption.
- Don't blindly trust a `"complete"` phase if live repo state contradicts it.
- Don't checkpoint at sub-phase granularity — it adds complexity for little benefit
  given phases are designed to be idempotent to re-run.
- Don't forget to commit this file alongside the working-tree changes it describes —
  an uncommitted `migrationHistory.json` can't travel to a colleague's machine.

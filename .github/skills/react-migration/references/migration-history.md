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

## Multi-hop chaining — one major version per run

This skill only ever advances a repo by **one React major version per run**
(`installedMajor + 1`, decided in `PLAN.md` Phase 0 Step 0.1). A user asking to go
further (e.g. React 16 all the way to 19) still only gets one hop per invocation — the
rest happens across repeated invocations, each one reading the live `package.json`
fresh and computing its own next hop.

- **`migration.fromMajor`/`migration.toMajor`** (numbers) record *this hop's* boundary —
  e.g. `16`/`17`. `migration.from`/`migration.to` keep recording the exact versions, as
  before (e.g. `"16.14.0"`/`"17.0.2"`).
- **`finalTargetMajor`** (optional number) records the user's *ultimate* destination, if
  they stated one distant from `toMajor` (e.g. `19`, while this hop's `toMajor` is only
  `17`). It exists purely for reporting — "2 more hops after this one" — and is carried
  forward unchanged from hop to hop. It never changes what a single run executes; that's
  always exactly `toMajor`.
- **Starting a fresh hop after a prior one completed:** before treating a repo as a
  brand-new migration, check whether `migrationHistory.json` already exists with
  `status: "complete"`. If so, and the live installed major now matches that file's
  `toMajor` (confirming the hop actually landed), this is the next hop in a chain, not a
  fresh start:
  1. Archive the completed file: rename it to
     `migrationHistory.<fromMajor>-to-<toMajor>.json` (e.g.
     `migrationHistory.16-to-17.json`) at the repo root, and commit it alongside the
     hop's own changes if it isn't already committed — it's the permanent record of that
     hop, not scratch state.
  2. Create a fresh `migrationHistory.json` for `installedMajor → installedMajor + 1`,
     with every phase reset to `"pending"`, `finalTargetMajor` carried forward from the
     archived file (if it had one), and `resumeInstructions` stating which hop this is
     in the sequence (e.g. "Hop 2 of 3: 17→18. Hop 1 (16→17) is archived in
     migrationHistory.16-to-17.json.").
  3. Proceed through Phase 0 normally for the new hop — don't skip Step 0.1's detection
     just because a previous hop already ran; the installed version needs to be read
     live again, not assumed from the archived file.
- **Never** let a `finalTargetMajor` tempt you into executing more than one hop's worth
  of changes in a single run, even if it would technically be possible to keep going
  (e.g. dependencies happen to already support the version two majors out). The
  one-hop-per-run boundary exists so each hop's diff, test run, and review stay scoped
  to a single major's worth of breaking changes — collapsing hops defeats that purpose
  even when it's technically achievable.

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
  "schemaVersion": 2,
  "migration": {
    "from": "18.3.0",
    "to": "19.2.7",
    "fromMajor": 18,
    "toMajor": 19
  },
  "finalTargetMajor": 19,
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
    "phase0Brief": {
      "installedMajor": 18,
      "installedVersion": "18.3.0",
      "targetMajor": 19,
      "finalTargetMajor": 19,
      "clamped": false,
      "hopSequenceRemaining": ["18->19"],
      "coreVersionResolution": {
        "react": { "latestInTargetMajor": "19.2.7", "isPrerelease": false },
        "react-dom": { "latestInTargetMajor": "19.2.7", "isPrerelease": false }
      },
      "breakingChangeFingerprint": { "referenceSection": "React 18 -> React 19", "totalHits": 3 },
      "baseline": { "testsPass": true, "buildPasses": true }
    },
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
- `migration.fromMajor`/`migration.toMajor`: this hop's major-version boundary — always
  exactly one apart. Never write a file where `toMajor - fromMajor != 1`.
- `finalTargetMajor`: the user's stated ultimate destination, if further than this hop's
  `toMajor` — reporting-only, carried forward unchanged hop to hop. See "Multi-hop
  chaining" above.
- `findings.phase0Brief`: the fenced-block output of `PLAN.md` Phase 0 Step 0.4 —
  `targetMajor`, core-package version resolution, the breaking-change fingerprint scan,
  and the baseline result. Phase 1 and later phases read `targetMajor` from here rather
  than re-deriving it.
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
- Don't let `finalTargetMajor` justify executing more than one major's worth of changes
  in a single run — see "Multi-hop chaining" above.
- Don't overwrite a completed hop's `migrationHistory.json` in place when starting the
  next hop — archive it first (rename to `migrationHistory.<fromMajor>-to-<toMajor>.json`)
  so the completed hop's record survives.
- Don't write prose transcripts of what happened into the JSON — keep `summary` fields
  short; put narrative detail in the PR description or commit messages instead, not in
  a file meant to be machine-read for resumption.
- Don't blindly trust a `"complete"` phase if live repo state contradicts it.
- Don't checkpoint at sub-phase granularity — it adds complexity for little benefit
  given phases are designed to be idempotent to re-run.
- Don't forget to commit this file alongside the working-tree changes it describes —
  an uncommitted `migrationHistory.json` can't travel to a colleague's machine.

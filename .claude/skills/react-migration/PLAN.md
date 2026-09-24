# react-migration — Planning stage (Phases 0–3)

Loaded from `SKILL.md`. This stage is **pure assessment — nothing here installs,
edits, or mutates anything**. It's the right (and only) stage to load for questions
like "is it safe to upgrade to React 19", "what's blocking us", or "check peer
dependencies" — the user may not want the actual migration performed at all.

Each phase has an **entry condition** and an **exit condition**. Don't start phase N+1
until phase N's exit condition is actually green. Once Phase 3's exit is green, and the
task calls for actually performing the migration (not just assessing it), read
`IMPLEMENT.md` next — its phases assume everything produced here already exists.

**Before Phase 0:** check whether `migrationHistory.json` exists at the repo root. If
it does, this isn't necessarily a fresh assessment — read it and resume from the first
non-`"complete"` phase per `references/migration-history.md`'s protocol, rather than
blindly restarting at Phase 0. If it doesn't exist, create it (same reference doc has
the schema) and proceed normally. **After each phase's exit condition goes green,
update `migrationHistory.json` before moving to the next phase** — this is what makes
it safe to hand the migration off mid-flight.

## Phase 0 — Baseline

**Entry:** repo is on a supported React major (16, 17, or 18.x). **Exit:** the Phase 0
Brief (Step 0.4) is produced and recorded — this run's target major is pinned to exactly
one hop past what's installed, you know whether a safe target version exists, you have a
rough sense of how much breaking-change surface the codebase carries, and you have a
clean, reproducible baseline to diff against.

Four steps, in order — each one feeds the next, and Step 0.4 exists specifically to
consolidate them so Phase 1 (and anyone else picking this up, human or agent) doesn't
have to re-derive Phase 0's reasoning from scratch.

### Step 0.1 — Read `package.json`

- Read `dependencies.react`/`dependencies.react-dom` (and `devDependencies['@types/react']`
  /`['@types/react-dom']` if the project uses TypeScript) directly from `package.json`.
- Confirm what's actually resolved with `npm ls react react-dom` — `package.json` can
  declare a range; the lockfile/`node_modules` is the ground truth for the exact
  installed version. If it reports `invalid` (lockfile/`node_modules` drift), resolve
  that with `npm install` before trusting anything derived from it.
- Extract `installedMajor` from the resolved version (`16`, `17`, or `18`).
- **Reject unsupported starting points immediately:** if `installedMajor` is below 16,
  or already 19 (nothing further this skill covers), or not a clean major number, stop
  and say so — this skill's breaking-change coverage spans 16→17, 17→18, and 18→19 only.
- **Compute `targetMajor = installedMajor + 1`. This is the only valid target for this
  run.** If the user (or the task this was dispatched with) named a different target:
  - Equal to `targetMajor` — matches, nothing to reconcile.
  - Further than `targetMajor` (e.g. installed 16, asked for 19, or even just 18) — do
    **not** attempt it. Clamp to `targetMajor`, and record the user's real destination
    as `finalTargetMajor` (see `references/migration-history.md`) so later hops and
    reports can reference it. State the full hop sequence needed (e.g. "16→17 now, then
    17→18, then 18→19 — three separate runs") — the clamp itself is not optional within
    a single run.
  - Behind `targetMajor` (e.g. installed 17, asked to "upgrade to 17") — nothing to do;
    say so rather than proceeding.
- **Multi-hop resumption check.** If `migrationHistory.json` already exists: check
  whether its `status` is `"complete"` and its `migration.toMajor` matches what's
  actually installed right now (a prior hop genuinely landed). If so, this is a **new
  hop**, not a resume — follow `references/migration-history.md`'s "Multi-hop chaining"
  section to archive the completed file and start fresh for
  `installedMajor → targetMajor`, carrying `finalTargetMajor` forward unchanged. If
  `status` is anything else (`not_started`, `in_progress`, `blocked`), this is a
  same-hop resume — follow the normal resumption protocol instead of re-running this
  detection logic against a hop already underway.

### Step 0.2 — Resolve latest stable versions from npm; mark upgrade required/safe

For `react`, `react-dom`, and (if TypeScript) `@types/react`/`@types/react-dom`:

```bash
npm view react@<targetMajor> version              # newest version satisfying that major
npm view react-dom@<targetMajor> version
npm view react dist-tags                           # confirm the resolved version isn't ahead of `latest`
```

- `upgradeRequired` is always `true` here by construction — the whole point of this run
  is moving from `installedMajor` to `targetMajor`.
- `safeToUpgrade` (preliminary — Phase 3 still applies the full stability policy later)
  means: a released, non-prerelease version of `targetMajor` exists and sits on/below
  the `latest` dist-tag lineage. If no stable release of `targetMajor` exists yet (rare,
  but possible to hit if this skill is ever run against a genuinely new major), stop
  here and say so — don't migrate onto a prerelease.
- This step only resolves React's own core packages. Third-party package versions are
  Phase 1's job, not Phase 0's — Phase 0 just needs to know a valid landing version
  exists before doing any further assessment work.

### Step 0.3 — Detect breaking-changes fingerprint

Before deep-diving in Phase 1, take a quick read of how much of this hop's known
breaking-change surface the codebase actually touches, by grepping for the signals
matching **this run's `targetMajor`** (full detail for each hop lives in
`references/breaking-changes.md` — this is a lightweight early scan, not the fix pass
itself, which happens in `IMPLEMENT.md` Phases 4–5):

- **Target 17 (16→17 hop):**
  ```bash
  grep -rn "\.persist()" <src>                                 # event pooling reliance (persist becomes a no-op)
  grep -rln "onScroll" <src>                                    # bubbling-dependent onScroll handlers to review
  grep -rn "UNSAFE_component" <src>                             # legacy unsafe lifecycle usage, louder warning in 17
  grep -rln "unstable_createPortal" <src>                       # removed in 17; replaced by stable createPortal
  grep -rn "document\.addEventListener\|document\.removeEventListener" <src>  # root-level event delegation change
  ```
- **Target 18 (17→18 hop):**
  ```bash
  grep -rln "ReactDOM\.render\|ReactDOM\.hydrate" <src>         # still works, now deprecated (console warning)
  grep -rn "flushSync" <src>                                    # re-verify under default automatic batching
  grep -rln "StrictMode" <src>                                  # informs Phase 9's manual-QA emphasis
  grep -rn "ReactChild\b\|ReactFragment\b" <src>                # deprecated TS type aliases
  ```
- **Target 19 (18→19 hop):** the full removed-API and TypeScript-change grep list —
  reuse `IMPLEMENT.md` Phase 4/5's command blocks verbatim; don't duplicate them here.

Record a hit count per pattern — this is a signal for sizing the migration and briefing
the user, not a final list (Phases 1/4/5 do the authoritative, exhaustive pass).

### Step 0.4 — Produce the Phase 0 Brief

Finish the remaining Phase 0 preconditions, then consolidate everything from Steps
0.1–0.3 plus these into a single structured brief:

- **Migration scope.** If `migrationHistory.json` already has a `scope` recorded, use
  it — don't re-ask. Otherwise: if this is an interactive session, ask the user whether
  to migrate the whole source tree (default) or scope this run to specific
  folders/files; if there's no way to get a live answer (e.g. a non-interactive
  background invocation with no scope given), default to the whole source tree and say
  so plainly in the final report. **Note the one thing scope never changes:** Phase 6's
  React version bump is always repo-wide; scoping only controls which files Phases
  4/5/7/8 proactively fix.
- Confirm a dedicated git branch exists — never make Phase 4–7 fixes directly on
  `main`/`master` or against a dirty tree, so each phase's changes stay independently
  revertable.
- Confirm CI/main is green before you start.
- If not already on the latest patch of `installedMajor`, upgrade to it first — the
  final patch of a major typically adds console warnings for everything that breaks in
  the next major, at no functional cost. Run the app and test suite once *before*
  touching versions and read the console output; anything that warns here breaks after
  the bump.
- Run `npm test` and `npm run build` once now, on `installedMajor`, and keep the output
  — this is the baseline later phases diff against.

Then emit the brief as a fenced block, so it's cleanly parseable by whatever reads this
phase's output next (Phase 1, a resuming session, or another agent):

```json
{
  "installedMajor": 18,
  "installedVersion": "18.3.0",
  "targetMajor": 19,
  "finalTargetMajor": 19,
  "clamped": false,
  "hopSequenceRemaining": ["18->19"],
  "coreVersionResolution": {
    "react": { "latestInTargetMajor": "19.2.7", "isPrerelease": false },
    "react-dom": { "latestInTargetMajor": "19.2.7", "isPrerelease": false },
    "@types/react": { "latestInTargetMajor": "19.2.7", "isPrerelease": false },
    "@types/react-dom": { "latestInTargetMajor": "19.2.7", "isPrerelease": false }
  },
  "breakingChangeFingerprint": {
    "referenceSection": "React 18 -> React 19",
    "signals": [
      { "pattern": "ReactDOM.render|ReactDOM.hydrate", "category": "removed-api", "hits": 2 },
      { "pattern": "findDOMNode", "category": "removed-api", "hits": 1 }
    ],
    "totalHits": 3
  },
  "scope": { "mode": "all", "paths": ["src"] },
  "branch": "upgrade/react-19",
  "baseline": { "testsPass": true, "buildPasses": true }
}
```

Write this same content into `migrationHistory.json`'s `findings.phase0Brief` (schema in
`references/migration-history.md`) before moving to Phase 1 — Phase 1 reads from there
rather than re-deriving Step 0.1–0.3's results.

## Phase 1 — Live peer-dependency matrix: flag what's safe to upgrade

**Entry:** Phase 0 exit is green (the Phase 0 Brief exists). **Exit:** every dependency
that touches the DOM directly or wraps React internals is classified into one of four
states below, against `targetMajor` from the Phase 0 Brief.

Package peer-dependency ranges change frequently and training data is not a reliable
source for any major, not just the newest one. For every routing library, UI kit,
data-grid/table library, animation library, and testing-stack package
(`@testing-library/react`, `enzyme`, `react-test-renderer`) identified in
`package.json`, check the **current, real** peer range of the **currently installed**
version first, then of `latest`. Also check `references/dependency-watchlist.md` for
any of these packages — if it has an entry for `targetMajor`, treat that as a
cross-project prior, not a substitute for the live check below.

Also consult `migrationHistory.json`'s `findings.phase0Brief.breakingChangeFingerprint`
(from Phase 0 Step 0.3) — a nonzero hit count for a pattern narrows down which of the
dependencies below are actually load-bearing for this repo, versus just present in
`package.json` but unused.

```bash
npm view <package> peerDependencies              # what the installed version declares
npm view <package>@latest peerDependencies        # what upgrading would get you
```

Classify each dependency:

| State | Condition | Action |
|---|---|---|
| ✅ **Safe as-is** | Installed version's peer range already includes the target React major | No action — re-verify after the React bump in `IMPLEMENT.md`, don't just assume. |
| 🟡 **Safe to upgrade** | Installed version's peer range caps below target, but a released version (not a prerelease) declares peer support for it | Upgrade in `IMPLEMENT.md`, following the stability policy in Phase 3 below. |
| 🔴 **Blocked** | No released version of the package supports the target React major yet | Stop. Do not proceed with the React bump for this dependency's consumers until the user decides how to handle it (wait, fork, patch-package, `overrides`/`resolutions` peer override, or drop the package). Flag this explicitly — don't silently force-install with `--legacy-peer-deps`/`--force`, which hides the real incompatibility. |
| ⚪ **Unknown** | Package declares no `peerDependencies` at all (some don't) | Don't assume safety. Check its README/CHANGELOG for an explicit React 19 statement, or grep its installed source for APIs removed in React 19 (`findDOMNode`, string refs, legacy Context). Downgrade to 🔴 treatment if you can't confirm it. |

Produce a table (package / current version / installed peer range / classification /
minimum version that flips it to ✅ or 🟡) — record it in `migrationHistory.json`'s
`findings.dependencyClassification` (this run's actual result), not in `instructions.md`
(which stays a generic, durable playbook — see `IMPLEMENT.md` Phase 10). It's a required
input to `IMPLEMENT.md` either way.

## Phase 2 — TypeScript compatibility check (skip if the project has no TypeScript)

**Entry:** Phase 1 exit is documented. **Exit:** you know whether the installed
TypeScript version can even use the target `@types/react` major, before you try to
install it.

`@types/react`/`@types/react-dom` majors have historically required a TypeScript floor
that's *higher* than what `peerDependencies` shows (DefinitelyTyped packages typically
don't declare an `engines`/peer constraint on TypeScript itself) — so verify it via the
per-TS-version dist-tags DefinitelyTyped publishes instead of guessing:

```bash
npx tsc -v                            # installed TypeScript version in this repo
npm view @types/react dist-tags --json
```

The output is a map like `{ "ts5.0": "19.0.12", "ts4.9": "18.3.12", ... }` — each
`ts<major.minor>` tag points at the newest `@types/react` version still compatible with
that TypeScript release. Find the tag matching (or just below) your installed
TypeScript version:

- If that tag already points at a version on `targetMajor` (from the Phase 0 Brief) —
  you're clear.
- If it still points at `installedMajor` — your installed TypeScript is **below
  the floor**. You must upgrade TypeScript itself before `@types/react@<target-major>`
  will typecheck correctly. Treat the TypeScript upgrade like any other dependency
  upgrade: run it through the Phase 3 stability policy below, then (in `IMPLEMENT.md`)
  re-run `npx tsc -b` on the **current** (old) React types to confirm the TypeScript
  bump alone doesn't break the build, before also bumping the React types.

Don't hardcode a specific "TypeScript needs to be ≥5.x" rule into your reasoning here —
the floor shifts across React majors and even across `@types/react` minors; the
dist-tag lookup above is the live source of truth every time.

## Phase 3 — Vulnerability & version-stability policy

**Entry:** Phases 1–2 have identified every package this migration will touch (directly
upgraded, or transitively via the React bump). **Exit:** a target version is chosen for
each one using the policy below, not just "whatever `@latest` resolves to today." This
is the last planning phase — once it's green, move to `IMPLEMENT.md`.

```bash
npm audit                          # baseline — record counts by severity before touching anything
```

For every package that will get a new version installed (a Phase-1 🟡 dependency,
TypeScript from Phase 2, or React itself):

1. **Prefer the lowest version that clears the bar**, not the newest one available. The
   goal is `targetMajor` compatibility for this one hop, not a general "catch up
   everything to latest" pass — a smaller version delta is a smaller diff to review and
   a smaller blast radius for unrelated regressions.
2. **Never install a prerelease.** Check `npm view <pkg> dist-tags` and confirm the
   version you're installing sits on (or below) the `latest` tag — not `next`, `rc`,
   `beta`, `alpha`, or `canary`, unless the user explicitly asked for a prerelease.
3. **Re-run `npm audit` after each install (in `IMPLEMENT.md`).** If it introduces a
   *new* finding, or if fixing an *existing* one would require a semver-major bump to a
   package that has nothing to do with this hop's peer requirement, do **not** fold that
   fix into this migration — record it as a separate, explicitly-scoped follow-up. A
   React migration should not silently balloon into "also fixed unrelated CVEs in the
   bundler," because that's a different risk profile and a different review.
4. **Never run `npm audit fix --force`** as part of this workflow. It resolves findings
   by installing whatever version closes them, which can jump several majors past what
   this hop's peer requirement actually needed and introduce unrelated breakage.
5. Record the before/after vulnerability count (by severity) as part of the deliverable,
   alongside which findings were left for a separate follow-up and why.

## Output of this stage

By the time Phase 3 is green, you should have:

- The Phase 0 Brief (`targetMajor`, core version resolution, breaking-change
  fingerprint, scope, baseline) from Phase 0.
- A peer-dependency classification table (Phase 1).
- A TypeScript-floor finding: clear, or a required TypeScript target version (Phase 2).
- A chosen target version for every package that needs one, vetted against the Phase 3
  policy (Phase 3).
- A `npm audit` baseline to compare against later.

This is exactly what `IMPLEMENT.md` expects as input. If the user only wanted an
assessment, stop here and report these findings — don't proceed into `IMPLEMENT.md`
unasked.

## What NOT to do in this stage

- Don't attempt more than one major-version hop in a single run, even if the user asked
  for a distant final target — Phase 0 Step 0.1 clamps to `installedMajor + 1`; report
  the clamp instead of silently complying or silently ignoring the extra distance.
- Don't assume a third-party package's support for `targetMajor` based on general
  reputation or training-data familiarity — always verify the live peer-dependency range
  (Phase 1).
- Don't assume a TypeScript floor from memory — the required minimum shifts across React
  majors; verify it live via the dist-tag technique (Phase 2) every time.
- Don't default to `@latest` for a flagged upgrade — check dist-tags for prereleases and
  prefer the smallest version that clears the peer-dependency bar (Phase 3).
- Don't fold unrelated vulnerability fixes (especially ones requiring a semver-major
  bump) into a React migration — flag them as a separate follow-up (Phase 3).
- Don't run `npm audit fix --force` as part of this workflow.
- Don't proceed past a 🔴-classified dependency without the user's explicit decision on
  how to handle it.

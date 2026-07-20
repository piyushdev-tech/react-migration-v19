# react19-migration — Planning stage (Phases 0–3)

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

**Entry:** repo is on React 18.x. **Exit:** you have a clean, reproducible baseline to
diff against, and a migration scope is recorded.

- **Determine migration scope.** If `migrationHistory.json` already has a `scope`
  recorded, use it — don't re-ask. Otherwise: if this is an interactive session, ask
  the user whether to migrate the whole source tree (default) or scope this run to
  specific folders/files; if there's no way to get a live answer (e.g. a
  non-interactive background invocation with no scope given), default to the whole
  source tree and say so plainly in your final report. Record the decision in
  `migrationHistory.json`'s `scope` field (see `references/migration-history.md`) —
  once written, treat it as fixed for the rest of this run. **Note the one thing scope
  never changes:** Phase 6's React version bump is always repo-wide; scoping only
  controls which files Phases 4/5/7/8 proactively fix. Tell the user which folders are
  being left unfixed, if any, so it's not mistaken for "those folders are unaffected."
- Confirm a dedicated git branch exists (codemods commit as they go — never run them on
  `main`/`master` or a dirty tree).
- Confirm CI/main is green before you start.
- If not already on the latest `react@18.3.x` patch, upgrade to it first — it's
  functionally identical to 18.2 but adds console warnings for everything that breaks in
  19. Run the app and test suite once *before* touching versions and read the console
  output; anything that warns here breaks in React 19.
- Run `npm test` and `npm run build` once now, on 18.x, and keep the output. This is
  your baseline — later phases compare against it, not against a re-read of your memory
  of "it worked before." If `node_modules` and the lockfile ever disagree
  (`npm ls react react-dom` reports `invalid`), resolve that with `npm install` before
  trusting anything you measure — a baseline taken against a mismatched install is not a
  baseline.

## Phase 1 — Live peer-dependency matrix: flag what's safe to upgrade

**Entry:** Phase 0 exit is green. **Exit:** every dependency that touches the DOM
directly or wraps React internals is classified into one of four states below.

Package peer-dependency ranges for React 19 support change frequently and training data
is not a reliable source. For every routing library, UI kit, data-grid/table library,
animation library, and testing-stack package (`@testing-library/react`, `enzyme`,
`react-test-renderer`) identified in `package.json`, check the **current, real** peer
range of the **currently installed** version first, then of `latest`:

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

- If that tag already points at a version on the target React major (`19.x` here) —
  you're clear.
- If it still points at the old major (`18.x`) — your installed TypeScript is **below
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
   goal is React 19 compatibility, not a general "catch up everything to latest" pass —
   a smaller version delta is a smaller diff to review and a smaller blast radius for
   unrelated regressions.
2. **Never install a prerelease.** Check `npm view <pkg> dist-tags` and confirm the
   version you're installing sits on (or below) the `latest` tag — not `next`, `rc`,
   `beta`, `alpha`, or `canary`, unless the user explicitly asked for a prerelease.
3. **Re-run `npm audit` after each install (in `IMPLEMENT.md`).** If it introduces a
   *new* finding, or if fixing an *existing* one would require a semver-major bump to a
   package that has nothing to do with the React 19 peer requirement, do **not** fold
   that fix into this migration — record it as a separate, explicitly-scoped follow-up.
   A React migration should not silently balloon into "also fixed unrelated CVEs in the
   bundler," because that's a different risk profile and a different review.
4. **Never run `npm audit fix --force`** as part of this workflow. It resolves findings
   by installing whatever version closes them, which can jump several majors past what
   React 19 support actually required and introduce unrelated breakage.
5. Record the before/after vulnerability count (by severity) as part of the deliverable,
   alongside which findings were left for a separate follow-up and why.

## Output of this stage

By the time Phase 3 is green, you should have:

- A peer-dependency classification table (Phase 1).
- A TypeScript-floor finding: clear, or a required TypeScript target version (Phase 2).
- A chosen target version for every package that needs one, vetted against the Phase 3
  policy (Phase 3).
- A `npm audit` baseline to compare against later.

This is exactly what `IMPLEMENT.md` expects as input. If the user only wanted an
assessment, stop here and report these findings — don't proceed into `IMPLEMENT.md`
unasked.

## What NOT to do in this stage

- Don't assume a third-party package's React 19 support based on general reputation or
  training-data familiarity — always verify the live peer-dependency range (Phase 1).
- Don't assume a TypeScript floor from memory — the required minimum shifts across React
  majors; verify it live via the dist-tag technique (Phase 2) every time.
- Don't default to `@latest` for a flagged upgrade — check dist-tags for prereleases and
  prefer the smallest version that clears the peer-dependency bar (Phase 3).
- Don't fold unrelated vulnerability fixes (especially ones requiring a semver-major
  bump) into a React migration — flag them as a separate follow-up (Phase 3).
- Don't run `npm audit fix --force` as part of this workflow.
- Don't proceed past a 🔴-classified dependency without the user's explicit decision on
  how to handle it.

# Dependency watchlist — known-recommended versions per target React major

Loaded on demand from `PLAN.md` Phase 1. This is a durable, project-independent
supplement to Phase 1's live peer-dependency check: a curated list of specific
third-party packages with the recommended/stable version to install for a given target
React major, based on prior migrations rather than a live registry lookup done in the
moment.

**Status: not yet populated.** No package list has been provided for this file yet. Use
Phase 1's live `npm view <package> peerDependencies` check as the sole source of truth
until entries exist below — don't block on this file being empty, and don't treat its
absence of an entry as evidence a package is safe or unsafe either way.

## How this file is meant to be used, once populated

For each entry below, Phase 1 should treat it as a **prior to sanity-check against**, not
a replacement for the live check — package versions and peer ranges can change after
this file was last updated, and the live registry is always the final word.

Expected shape per entry, once populated:

```markdown
### <package-name>

| Target React major | Recommended version | Safe to upgrade | Notes |
|---|---|---|---|
| 17 | `<version>` | ✅ / 🟡 / 🔴 | why |
| 18 | `<version>` | ✅ / 🟡 / 🔴 | why |
| 19 | `<version>` | ✅ / 🟡 / 🔴 | why |
```

## What NOT to do

- Don't fabricate entries here from general reputation or training-data familiarity —
  only add a package once its version/peer-range has actually been verified live (the
  same discipline Phase 1 already applies per-run). A wrong entry here is worse than no
  entry, since it reads as pre-vetted.
- Don't let a stale entry silently override a live check that disagrees with it — if
  Phase 1's live result contradicts this file, trust the live result and flag the
  mismatch so this file can be corrected.

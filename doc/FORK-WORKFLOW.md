# Fork workflow

We maintain a fork of [paperclipai/paperclip](https://github.com/paperclipai/paperclip). This document describes how we manage branches and stay in sync.

## Branches

| Branch | Purpose | Rule |
|--------|---------|------|
| `master` | Clean upstream mirror | Fast-forward only — never commit here |
| `local` | All our patches, rebased on master | Linear patch series — never merge |
| PR branches | One per upstream PR | Based on `upstream/master`, independent of `local` |

## Remotes

- `origin` — `octasoft-ltd/paperclip` (our fork)
- `upstream` — `paperclipai/paperclip`

## Syncing with upstream

```bash
# 1. Update master
git checkout master
git fetch upstream master
git merge --ff-only upstream/master

# 2. Rebase local
git checkout local
git rebase master
# If a PR was merged upstream, its patches conflict trivially — skip them:
# git rebase --skip
```

## Adding a new fix

**For upstream submission:**

```bash
# Create PR branch from upstream
git checkout -b fix/my-fix upstream/master
# Make changes, commit, push, open PR
git push -u origin fix/my-fix

# Then cherry-pick onto local
git checkout local
git cherry-pick <commit-hash>
```

**Custom-only (won't be PR'd):**

```bash
git checkout local
# Make changes, commit at the end of the series
```

## Patch series structure

The `local` branch is a linear sequence of commits:

1. **PR patches** — cherry-picked from PR branches so we can run them locally. Dropped automatically when the PR is merged upstream.
2. **Custom-only patches** — at the end of the series.

## Why this approach

The previous merge-based workflow caused compounding conflicts on every sync and made it hard to distinguish PR-covered patches from custom-only ones. Rebasing keeps patches as a clean, droppable series.

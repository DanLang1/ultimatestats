---
description: How to work on feature branches while maintaining bug fixes on main
---

# Feature Branch Workflow

## Creating the Feature Branch

```bash
# Make sure main is up to date
git checkout main
git pull

# Create and switch to feature branch
git checkout -b feature/advanced-stat-tracking
```

## Daily Development on Feature

```bash
# Work on feature branch
git checkout feature/advanced-stat-tracking

# Make changes, commit as usual
git add .
git commit -m "Add player grid component"
```

## Bug Fix on Main (While Feature in Progress)

```bash
# Switch to main
git checkout main
git pull

# Create hotfix branch
git checkout -b hotfix/fix-score-display

# Make fix, commit
git add .
git commit -m "Fix score display alignment"

# Merge to main
git checkout main
git merge hotfix/fix-score-display
git push

# Delete hotfix branch
git branch -d hotfix/fix-score-display

# Go back to feature
git checkout feature/advanced-stat-tracking
```

## Keep Feature Branch Updated (Weekly)

```bash
# On feature branch
git checkout feature/advanced-stat-tracking

# Merge latest main into feature
git merge main

# Resolve any conflicts, then continue working
```

## Merge Feature to Main (When Complete)

```bash
# Make sure feature is up to date with main first
git checkout feature/advanced-stat-tracking
git merge main
# (resolve any conflicts)

# Switch to main and merge feature
git checkout main
git merge feature/advanced-stat-tracking
git push

# Optional: delete feature branch
git branch -d feature/advanced-stat-tracking
```

## Tips

- Merge main into feature branch at least weekly to avoid big conflicts
- Each commit should be atomic and self-contained
- Use descriptive commit messages
- If feature takes months, consider squash-merging to keep main history clean

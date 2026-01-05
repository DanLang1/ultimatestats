---
description: Update documentation based on learnings from past conversations
---

# Update Docs from Learnings

This workflow helps update project documentation by analyzing patterns from past work.

## Steps

1. **Review Conversation History**
   - Use conversation summaries to identify patterns and lessons learned
   - Look for: bug fixes, architectural decisions, common pitfalls, new patterns

2. **Check Existing Documentation**
   - Review `docs/` folder for current documentation:
     - `docs/README.md` - Project overview
     - `docs/architecture-rules.md` - Coding rules and patterns
     - `docs/game-logic.md` - Game scoring and possession
     - `docs/stat-tracking.md` - Stat entry system
     - `docs/turnover-tracking.md` - Turnover recording
     - `docs/view-stats.md` - Stats viewer
     - `docs/modals.md` - Modal patterns
     - `docs/theming.md` - Theme system
     - `docs/testing.md` - Testing patterns

3. **Identify Documentation Gaps**
   - Compare learnings from conversations to existing docs
   - Note any new patterns not yet documented
   - Note any outdated information

4. **Update Documentation**
   - Add new rules to `docs/architecture-rules.md`
   - Update feature docs if behavior changed
   - Add new files if a major feature area is undocumented
   - Keep docs concise - focus on non-obvious patterns

## Key Files to Reference

| Topic         | Documentation File           |
| ------------- | ---------------------------- |
| General rules | `docs/architecture-rules.md` |
| Game logic    | `docs/game-logic.md`         |
| Stat tracking | `docs/stat-tracking.md`      |
| Turnovers     | `docs/turnover-tracking.md`  |
| View Stats    | `docs/view-stats.md`         |
| Modals        | `docs/modals.md`             |
| Theming       | `docs/theming.md`            |
| Testing       | `docs/testing.md`            |

## Tips

- Focus on **non-obvious** patterns that would help future work
- Avoid documenting things that are easily discoverable from code
- Link to specific files when documenting patterns
- Update `docs/README.md` links when adding new doc files

# Deletion Candidates

> Files/directories identified as fully redundant with no unique content.
> Do NOT delete until approved.

---

## Candidate 1: `.wip/backlog/` (directory)

| Field | Value |
|---|---|
| **Path** | `.wip/backlog/` |
| **Type** | Empty directory |
| **Reason** | Original file `.wip/backlog/tasks.md` was archived to `.archive/old-backlogs/tasks.md`. The directory is now empty. The current active backlog is at `.wip/master-backlog.md`. |
| **Replacement** | `.wip/master-backlog.md` |
| **Unique content** | None — directory is empty |

---

## Candidate 2: `project-management/` (directory)

| Field | Value |
|---|---|
| **Path** | `project-management/` |
| **Type** | Empty directory |
| **Reason** | Created in earlier consolidation phase but never populated. All project management functions are now served by `.wip/`. |
| **Replacement** | `.wip/` (master-requirements.md, master-backlog.md, master-sprint.md, implementation-queue.md, progress.md) |
| **Unique content** | None — directory is empty |

---

## No File-Level Deletion Candidates Found

After thorough verification:
- All `docs/generated/*.md` files contain unique evidence-based audit content not duplicated elsewhere.
- All `docs/architecture/*.md` files contain original design documentation.
- `docs/plans/sprint-plans.md` contains historical team assignments not captured in `master-sprint.md`.
- All `P*_test.txt` and `.txt` config files contain unique implementation notes.
- All PlantUML diagrams are unique visual artifacts.
- Root-level generated files (`REQUIREMENTS_AUDIT.md`, etc.) were already consolidated into `docs/generated/` and no longer exist at root.

**No files should be permanently deleted at this time.**

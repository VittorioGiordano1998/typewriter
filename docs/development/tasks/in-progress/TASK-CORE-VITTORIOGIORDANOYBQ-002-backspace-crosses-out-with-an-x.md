---
id: TASK-CORE-VITTORIOGIORDANOYBQ-002
owner: VITTORIOGIORDANOYBQ
type: Feature
status: In Progress
area: core
severity: High
opened: 2026-11-19
done: null
next: Implementing
related: []
superseded_by: null
---

# Task: Backspace crosses out with an X

## Task Description

Backspace currently only moves the carriage back, so the next key overstrikes. The owner expected Backspace to cross the character out with an X, a visible "erasure", as discussed when the plan was made.

## Desired Outcome

Backspace strikes an X over the previous character; repeated presses cross out further back; the next typed character continues where the line ended. The plain move-back behaviour stays available as a setting.

## Proposed Implementation

Core: a crossOut action (carriage back one column, strike X there, remember the column to resume at); typing after a cross-out first slides the carriage back to the resume column. Settings: backspace mode (cross out / move back). Input controller reads the mode. Tests for every rule.

## Relevant Files

docs/development/plans/implemented/PLAN-VITTORIOGIORDANOYBQ-001-*.md

## Verification Procedure

vitest, tsc, lint, build; headless Chrome screenshots and the scenario scripts in app/scripts.

## Notes

Owner feedback 2026-11-19 after trying the app. Local only: no git repository.

## Touch History

- 2026-11-19 — VITTORIOGIORDANOYBQ — created
- 2026-11-19 — status Proposed → In Progress

## Resolution

[When completed, describe what has been done, how it was verified and any remaining limitations.]

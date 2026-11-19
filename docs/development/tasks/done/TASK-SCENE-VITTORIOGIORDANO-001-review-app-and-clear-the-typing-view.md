---
id: TASK-SCENE-VITTORIOGIORDANO-001
owner: VITTORIOGIORDANO
type: Fix
status: Done
area: scene
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: [TASK-SCENE-VITTORIOGIORDANOYBQ-002, KI-VITTORIOGIORDANO-001, KI-VITTORIOGIORDANO-002]
superseded_by: null
---

# Task: Review app and clear the typing view

## Task Description

Review the local application and investigate the model hardware that obscures the active line and recent text in the typing view.

## Desired Outcome

Make the active line and recent text readable during normal typing. Report any reproducible problems found elsewhere in the folder.

## Proposed Implementation

Inspect the view and model rig to locate the obstructing geometry and adjust its presentation during typing.

## Relevant Files

- `app/scripts/model/build.mjs`
- `app/src/scene/CameraRig.tsx`
- `docs/legal/ASSETS.md`

## Verification Procedure

Rebuild the GLB, run lint, unit tests and the app build, and verify the model while typing at multiple zoom levels and viewport sizes.

## Notes

The supplied screenshot shows the centre paper guides moving with the carriage and obscuring several characters.

## Touch History

- 2026-11-19 — VITTORIOGIORDANO — created
- 2026-11-19 — status Proposed → In Progress
- 2026-11-19 — status In Progress → Done

## Resolution

Removed the four central guide fingers from the model build and increased the camera elevation
so the front rail stays below the writing line across the zoom range. Rebuilt the GLB and verified
that the generated layout was byte-identical. Repaired the npm model build command and added the
model's attribution in the asset list and in both app languages.

Lint, the production build and all 104 tests passed. Checked the line of sight against the rebuilt
mesh and inspected three typed lines in Chrome at desktop and phone viewport sizes and multiple
zoom settings. Chrome also reproduced two archive defects, tracked in the related known issues.

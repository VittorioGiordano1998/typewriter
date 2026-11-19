---
id: TASK-SCENE-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Feature
status: Done
area: scene
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: 3D scene and typing

## Task Description

Phase 3: 3D typewriter, lamp spotlight, paper with instanced glyphs, typing input.

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

Typing shows inked letters under the lamp light; carriage, platen and typebar move in step.

## Proposed Implementation

Follow the phase table, decisions and Files list in PLAN-VITTORIOGIORDANOYBQ-001.

## Relevant Files

docs/development/plans/agreed/PLAN-VITTORIOGIORDANOYBQ-001-*.md

## Verification Procedure

The phase gate in PLAN-VITTORIOGIORDANOYBQ-001.

## Notes

Local only: no git repository, nothing pushed.

## Touch History

- 2026-11-19 — VITTORIOGIORDANOYBQ — created
- 2026-11-19 — status Proposed → In Progress
- 2026-11-19 — status In Progress → Done

## Resolution

Built `app/src/scene` (procedural: body, 45 keys with legends, 45 typebars, platen, knobs, carriage, return lever, ribbon with vibrator, desk lamp with a shadow-casting spotlight aimed at the strike point, camera dolly between a paper close-up and the whole machine) and `app/src/features/session` (external store, event bus, hidden-textarea input controller with a queue while the carriage returns or a sheet feeds). The paper shows strikes as instanced glyph quads; ink is a multiply-blend (so it darkens whatever the lighting is, and overstrikes stack) with seeded jitter from `core/ink`. Verified with headless Chrome (`app/scripts/shot.mjs`, `scenario.mjs`): typing, a held key frozen mid-strike (bar, ribbon and carriage all in step), Enter with the carriage mid-return, a line that locks at column 65, backspace plus overstrike, Tab, and a full sheet feeding a new one, with no console errors. Found and fixed on the way: platen z-fighting through the tilted paper, and a framebuffer-alpha bug in the ink blend that drew light boxes behind letters. 41 vitest cases, `tsc -b`, lint and build pass; the scene is a separate 271 kB (gzip) chunk. Not verified: frame rate on a real GPU (the screenshots use software rendering), and Safari/Firefox.

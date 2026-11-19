---
id: TASK-SCENE-VITTORIOGIORDANOYBQ-002
owner: VITTORIOGIORDANOYBQ
type: Feature
status: In Progress
area: scene
severity: High
opened: 2026-11-19
done: null
next: Implementing
related: []
superseded_by: null
---

# Task: Realistic typewriter model

## Task Description

The owner finds the procedural machine not realistic enough, and calls this the most important point. PLAN-VITTORIOGIORDANOYBQ-001 decision 8 chose a procedural machine only because no usable free model could be downloaded at the time.

## Desired Outcome

The scene shows a realistic, textured typewriter model (licensed CC BY or CC0, credited), with keys that press, a carriage and platen that move, typebars that strike and the paper and glyphs on its platen.

## Proposed Implementation

Objaverse (public Sketchfab CC models) has a labelled typewriter category; pick the best CC BY model, build it with a gltf-transform pipeline (scale to cm, split keys into separate nodes, carriage parts into a group, meshopt + WebP), generate a layout JSON (platen axis and radius, strike point, key positions) that the scene constants read, and replace the procedural Body/Keyboard with it. Keep procedural only what the model lacks.

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

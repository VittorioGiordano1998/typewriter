---
id: TASK-ASSETS-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Chore
status: Done
area: assets
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: Asset spike - model, sounds, font

## Task Description

Phase 0: pick and optimise the typewriter model, sound samples and font.

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

Every asset is licensed for reuse, recorded in docs/legal/ASSETS.md and ready to load from app/public.

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

No usable free model: the only CC0 candidate (OpenGameArt "Typewriter" FBX) is a monitor-and-keyboard terminal with no carriage, platen or typebars, and Sketchfab/Freesound downloads need an account. The machine is therefore procedural (plan decision 8). Sounds are cut from two Freesound recordings (CC BY 4.0, not CC0 as first chosen: the CC0 typewriter recordings with bell and carriage return are not downloadable without an account) into `app/public/audio` (8 mp3 files, about 55 KB). Sources, authors and licences are in `docs/legal/ASSETS.md`; the bell was checked on a spectrogram. Font: Courier Prime (OFL). Not verified by ear: the clips were cut by spectrogram, so the first listen in phase 4 decides whether they stay.

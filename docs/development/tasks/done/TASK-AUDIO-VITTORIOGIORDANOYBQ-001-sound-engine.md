---
id: TASK-AUDIO-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Feature
status: Done
area: audio
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: Sound engine

## Task Description

Phase 4: Web Audio engine with CC0 samples.

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

Every typewriter event has a sound, with no audible lag; mute persists.

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

`app/src/features/audio`: `soundPlan.ts` (pure: which sound an event makes, with pitch and volume variation, no immediate repeat of a key take, stereo pan from the column, the return recording cut where the carriage stops) and `audioEngine.ts` (Web Audio: samples decoded early in an offline context so no gesture is needed, the real context created on the first keystroke, a compressor against clipping when typing fast, synthesised margin-lock thunk and paper-feed whoosh). `features/archive/storedData.ts` and `features/settings` add the persisted record, so mute survives a reload. Verified in headless Chrome (`app/scripts/audio-check.mjs`): all 8 samples decode; a strike, space, backspace, return and the bell each start the expected source, the margin lock starts the synthesised voice, and nothing plays when muted; mute persists after reload. 60 vitest cases, `tsc -b` and lint pass. Not verified: how it sounds. The clips were cut from the recordings by spectrogram and nobody has listened to them yet; tuning the gains, the pitch spread and the return cut is a listening job for the owner. Samples are CC BY 4.0 (see docs/legal/ASSETS.md).

---
id: TASK-UI-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Feature
status: Done
area: ui
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: Features - i18n, ribbon, night mode, archive, export

## Task Description

Phase 5: i18n IT/EN, ribbon colour, night mode, archive drawer, autosave, PDF/PNG/TXT export, credits.

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

All overlay actions work in both languages; documents survive a reload; exports match the screen.

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

Delivered: IT/EN dictionaries with a parity test and a language that follows the browser on a first visit and then the settings; a persisted record (`features/archive/storedData`, schema from phase 2) holding settings and sheets, safe with blocked storage and with data from a newer version; an archive service (`features/archive/archive`) with autosave, new, open, rename and delete (blank sheets are never kept); a toolbar with panels for sheets, export, settings (language, ribbon colour, lamp intensity, night mode, volume) and credits, closing with Escape and handing the keyboard back to the machine; PNG (the sheet in the machine, A4 at 200 dpi), PDF (every sheet, jsPDF loaded on demand) and TXT export, the 2D render using the same ink function as the scene. Verified in headless Chrome (`app/scripts/features-check.mjs`): text survives a reload with the carriage where it was; two sheets listed and switched; rename; typing works again after a panel closes; red ribbon switches the machine and prints red; the language switches live and sets `<html lang>`; the three downloads exist (PNG 1654x2339 showing black and red ink, a one-page A4 PDF, TXT equal to the text); night mode leaves the lamp as the only light; no console errors. Found and fixed: the rename field did not take focus. 81 vitest cases, `tsc -b` and lint pass. Not verified: the bicolour ribbon lever (the ribbon is a black/red choice in settings, not a half-and-half lever) and the look of the panels on a phone (phase 6).

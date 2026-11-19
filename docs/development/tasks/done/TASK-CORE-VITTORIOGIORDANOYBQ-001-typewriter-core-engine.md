---
id: TASK-CORE-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Feature
status: Done
area: core
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: Typewriter core engine

## Task Description

Phase 2: pure TypeScript typewriter engine (carriage, margins, bell, overstrike, ink, storage schema, TXT export).

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

The vitest suite from the plan passes; core has no React, three.js or DOM imports.

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

`app/src/core` holds the engine: `page.ts` (geometry, 65 columns by 54 lines, A4 at pica pitch, document model), `carriage.ts` (pure reducer emitting typed events: strike, space, backspace, tab, bell, lock, return, lineFeed, pageFull, ribbon), `ink.ts` (seeded jitter plus a stable per-glyph bias, bounded), `export-text.ts` and `storage-schema.ts` (versioned sparse schema; corrupt data gives an empty archive, newer versions are refused, bad strikes are dropped). 34 vitest cases cover every line of the plan's Tests section, with one change: the "migrate a v1 fixture" test became "refuse a newer version / accept an unversioned payload", because no older schema exists yet. Verified: `npm run test`, `npx tsc -b` and `npm run lint` pass. Not done here: persistence itself (phase 5) and the glyph rendering (phase 3).

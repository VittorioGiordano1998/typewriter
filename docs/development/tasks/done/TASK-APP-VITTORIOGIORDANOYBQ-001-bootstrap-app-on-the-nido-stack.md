---
id: TASK-APP-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Chore
status: Done
area: app
severity: Medium
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: Bootstrap app on the Nido stack

## Task Description

Phase 1: create app/ on the Nido stack plus react-three-fiber.

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

npm run build, lint and test pass on an empty shell; RULES.local.md and CI describe the real layers and scopes.

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

`app/` created with Nido's tool versions (Vite 8, React 19, TypeScript 6, Tailwind 4, oxlint, vitest) plus three, react-three-fiber, drei, jspdf and the Courier Prime font. `RULES.local.md` now defines the layers, naming, commit scopes and the local-only rule; `commitlint.config.js` scopes match; the GitLab pipeline runs app lint, test and build. Verified: `npm run build`, `npm run lint` and `npm run test` pass; `records check` passes. No git repository exists, by decision.

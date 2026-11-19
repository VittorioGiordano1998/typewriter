---
id: TASK-UI-VITTORIOGIORDANO-001
owner: VITTORIOGIORDANO
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

# Task: Interface themes and profile password

## Task Description

Provide account holders with interface theme choices and a way to change their password while removing public registration from the app.

## Desired Outcome

Authenticated users can select a persistent theme and change their password from a profile panel; login does not offer signup.

## Proposed Implementation

Extend persisted settings and translations, add theme styling and a profile panel using Supabase Auth, and document server-side signup configuration.

## Relevant Files

app/src/ui, app/src/features/cloud, app/src/core/storage-schema.ts.

## Verification Procedure

Run schema and authentication tests, production build, and verify live account flows when project access is available.

## Notes

Server-side signup settings require access to the hosted Supabase project, tracked by DG-VITTORIOGIORDANO-001.

## Touch History

- 2026-11-19 — VITTORIOGIORDANO — created
- 2026-11-19 — status Proposed → In Progress
- 2026-11-19 — status In Progress → Done

## Resolution

Added three persistent interface themes, removed the signup action, and added profile password updates including verification-code handling. Production build and 112 tests pass. Hosted signup configuration and live password-change checks require project access.

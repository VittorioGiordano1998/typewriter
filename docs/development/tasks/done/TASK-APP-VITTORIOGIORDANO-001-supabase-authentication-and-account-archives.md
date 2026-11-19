---
id: TASK-APP-VITTORIOGIORDANO-001
owner: VITTORIOGIORDANO
type: Feature
status: Done
area: app
severity: High
opened: 2026-11-19
done: 2026-11-19
next: null
related: []
superseded_by: null
---

# Task: Supabase authentication and account archives

## Task Description

The application needs authenticated accounts and private cloud persistence before deployment.

## Desired Outcome

Users sign in with email and password, access their own saved sheets, and can import existing local sheets.

## Proposed Implementation

Integrate Supabase Auth and account-scoped storage with row-level security, provide a local import flow, and document Vercel configuration.

## Relevant Files

app/src/features/archive, app/src/app/App.tsx, supabase/migrations and docs/development/supabase-vercel.md.

## Verification Procedure

Run automated tests and production build; verify authentication and data isolation against a configured Supabase project when available.

## Notes

Supabase and Vercel project configuration and live isolation checks require access to the user?s project. Cloud conflict resolution and a pre-existing Vite advisory are recorded as known issues.

## Touch History

- 2026-11-19 â€” VITTORIOGIORDANO â€” created
- 2026-11-19 — status Proposed → In Progress
- 2026-11-19 — status In Progress → Done

## Resolution

Added email/password authentication, account-scoped archives protected by SQL row-level security, explicit local import, and Vercel setup documentation. Production build and 107 automated tests pass. Live Supabase configuration and two-account verification remain to be performed against the user?s project. See KI-VITTORIOGIORDANO-003 and KI-VITTORIOGIORDANO-004.

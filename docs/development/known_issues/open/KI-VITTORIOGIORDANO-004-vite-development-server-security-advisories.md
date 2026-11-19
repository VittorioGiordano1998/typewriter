---
id: KI-VITTORIOGIORDANO-004
owner: VITTORIOGIORDANO
status: Open
area: app
severity: High
opened: 2026-11-19
fixed: null
related: []
superseded_by: null
---

# Known Issue: Vite development server security advisories

## Symptom

npm audit reports one high-severity Vite dependency group, including development-server advisories.

## Root cause

The existing lockfile selects Vite 8.3.2, affected by GHSA-587h-7wmj-h5pm and related launch-editor advisories.

## Attempted fixes

None.

## Fix direction

Upgrade Vite to a fixed compatible release and rerun build and tests.

## Fix

Not fixed.

## Notes

Identified during Supabase integration.

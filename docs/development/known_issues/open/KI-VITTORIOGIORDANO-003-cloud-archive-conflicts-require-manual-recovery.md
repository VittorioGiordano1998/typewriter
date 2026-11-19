---
id: KI-VITTORIOGIORDANO-003
owner: VITTORIOGIORDANO
status: Open
area: app
severity: Medium
opened: 2026-11-19
fixed: null
related: []
superseded_by: null
---

# Known Issue: Cloud archive conflicts require manual recovery

## Symptom

When two sessions edit the same archive, the later save is stopped and requires manual recovery.

## Root cause

The cloud store uses optimistic revision checks but does not provide an interactive merge or resolution flow.

## Attempted fixes

None.

## Fix direction

Provide conflict resolution that preserves both remote data and local drafts, with tests for concurrent edits.

## Fix

Not fixed.

## Notes

Identified during Supabase integration.

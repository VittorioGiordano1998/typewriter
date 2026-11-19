---
id: KI-VITTORIOGIORDANO-002
owner: VITTORIOGIORDANO
status: Open
area: archive
severity: High
opened: 2026-11-19
fixed: null
related: [TASK-SCENE-VITTORIOGIORDANO-001]
superseded_by: null
---

# Known Issue: Archive does not report failed saves after startup

## Symptom

If browser storage starts out available and a later save fails, typing continues and the
archive gives no warning. In Chrome, simulate a full quota by making `Storage.setItem` throw
`QuotaExceededError` for the archive key after loading. Type more text, wait for the write
attempt, and open the archive. The warning is missing and a fresh tab only sees the previously
saved text.

## Root cause

[`storedData.ts`](../../../../app/src/features/archive/storedData.ts#L62) clears the pending
write before attempting it. Its catch leaves the store marked writable and sends no
failure notification to the archive.

## Fix direction

Expose the write failure through the existing archive warning and retain the unsaved
snapshot for retry or export.

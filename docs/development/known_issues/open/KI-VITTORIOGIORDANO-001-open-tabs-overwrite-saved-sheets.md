---
id: KI-VITTORIOGIORDANO-001
owner: VITTORIOGIORDANO
status: Open
area: archive
severity: High
opened: 2026-11-19
fixed: null
related: [TASK-SCENE-VITTORIOGIORDANO-001]
superseded_by: null
---

# Known Issue: Open tabs overwrite saved sheets

## Symptom

Open two tabs on the same blank sheet. Type `AAAA` in the first and wait for it to save. Type
`BBBB` in the second without reloading it and wait for it to save. A fresh tab only reads
`BBBB`. Reproduced in Chrome with all tabs sharing the same origin.

## Root cause

[`storedData.ts`](../../../../app/src/features/archive/storedData.ts#L42) starts each tab with
its own snapshot and writes that whole snapshot to one localStorage key. It neither observes
other tabs' updates nor checks for a newer snapshot before writing.

## Fix direction

Coordinate saves across tabs and detect conflicts on a shared sheet so a stale tab cannot
silently replace a newer version.

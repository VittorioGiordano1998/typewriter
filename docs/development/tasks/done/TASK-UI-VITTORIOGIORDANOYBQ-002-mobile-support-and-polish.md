---
id: TASK-UI-VITTORIOGIORDANOYBQ-002
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

# Task: Mobile support and polish

## Task Description

Phase 6: virtual keyboard, performance tiers, reduced motion, WebGL fallback, accessibility, loading screen.

See PLAN-VITTORIOGIORDANOYBQ-001.

## Desired Outcome

Usable on a phone; no horizontal scroll at 360 px; graceful fallbacks.

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

Added: adaptive quality tiers (`scene/quality.ts`: starts lower on phones and weak machines, drei's PerformanceMonitor steps the pixel ratio and the lamp's shadow map down or up); reduced-motion support (sheets swap instantly, the camera stops easing); a text mirror for screen readers and a plain-text sheet that takes over when WebGL is missing; the camera's close-up width depends on the aspect ratio (about 9 cm upright, 23 cm wide), so the line is legible on a phone; the desk fits the visual viewport (so a soft keyboard does not cover it) with `interactive-widget=resizes-content`; two-finger pinch zoom; a touch hint; a blinking-caret loading screen. Fixed on the way: a tap moved focus to the body, so a phone's keyboard never opened and typing was lost (focus is now kept on mousedown and returned on click). Verified in headless Chrome with a touch-emulated 390x844 and 360x740 screen and without WebGL (`app/scripts/mobile-check.mjs`), and against a production build. 89 vitest cases, `tsc -b`, lint and build pass. Not verified: a real Android and iOS device (the soft keyboard, pinch-zoom, performance), real GPU frame rates and the quality tiers under load, Safari and Firefox.

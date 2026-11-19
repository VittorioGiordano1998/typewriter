---
id: PLAN-VITTORIOGIORDANOYBQ-001
owner: VITTORIOGIORDANOYBQ
type: Major
status: Implemented
date: 2026-11-19
supersedes: null
superseded_by: null
---

# Typewriter - 3D typewriter writing experience (plan)

## Goal

A static web app that simulates writing on a mechanical typewriter. A real-time 3D typewriter
sits on a desk; a desk lamp's spotlight frames the paper at the strike point, so the letter
being typed is always the brightest spot in the scene. Typing behaves like the real machine:
no erasing (Backspace moves the carriage back and the next key overstrikes), fixed line
length with a margin bell and a margin lock, manual carriage return, imperfect ink, and
recorded typewriter sounds. Sheets are saved locally, kept in an archive and exported to
PDF, PNG or TXT. The UI is in Italian and English. It is built for a physical keyboard on
desktop, with basic support for the virtual keyboard on mobile.

Out of scope for v1: accounts or a backend, deployment (no Vercel setup), a touch-first
keyboard, multiplayer.

Owner choices behind this plan (2026-11-19): real 3D; no-backspace, margin bell, imperfect
ink and sound all on; local storage plus export; desktop first with basic mobile; a free model (ended procedural, see decision 8);
CC0 sound samples (ended CC BY 4.0, see decision 10); IT + EN; extras: ribbon colour, night/lamp mode, multi-sheet archive.

## Phases

| Phase | Delivers | Gate |
| ----- | -------- | ---- |
| 0 - Asset spike | **done 2026-11-19**: free models evaluated and rejected, procedural machine chosen; sound samples cut from CC BY 4.0 recordings; font picked | every asset has a row in `docs/legal/ASSETS.md` |
| 1 - Bootstrap | **done 2026-11-19**: `app/` on the Nido stack plus R3F; `RULES.local.md` layers, scopes and conventions; CI test/build jobs; no git repository is created | `npm run build`, `npm run lint`, `npm run test` green; `records check` green |
| 2 - Typewriter core | **done 2026-11-19**: pure TS engine: document, pages, carriage, margins, bell, margin lock, backspace and overstrike, line feed, page full, seeded ink jitter, TXT export, storage schema | vitest suite (see Tests) green |
| 3 - Scene and typing | **done 2026-11-19**: model on the desk, camera, lamp spotlight on the strike point, paper with instanced glyphs, carriage, platen, key and typebar animation, hidden-input capture wired to the core | manual: typing shows inked letters under the light; carriage and platen move in step; 60 fps desktop |
| 4 - Sound | **done 2026-11-19**: Web Audio engine: keystroke variants, space, bell, carriage return, line feed ratchet, margin-lock thunk, paper in/out; pitch and gain variation; mute | manual: no audible lag with fast typing; the first key press unlocks audio; mute persists |
| 5 - Features | **done 2026-11-19**: IT/EN i18n, ribbon colour (black or red, chosen in settings; a bicolour lever was not built), night/lamp mode with intensity, archive drawer (new, open, rename, delete), autosave, PDF/PNG/TXT export, credits | i18n and storage tests green; manual pass of every overlay action in both languages |
| **6 - Mobile and polish** | **done 2026-11-19: virtual-keyboard input, performance tiers, reduced motion, WebGL fallback, accessible text mirror, loading screen** | **manual pass on one Android and one iOS device; no horizontal scroll at 360 px** |

## Decisions

1. **Stack = Nido + 3D.** Vite, React 19, TypeScript, Tailwind CSS 4, `motion` (overlay UI
   only), oxlint, vitest, Node 24 — the same versions as Nido's `app/package.json`. Added:
   `three`, `@react-three/fiber` (v9, the React 19 line), `@react-three/drei` (GLTF loading,
   shadows, environment), `jspdf` (PDF export), a typewriter font from Fontsource. No router
   (one page plus overlays), no Supabase.
2. **Layers.** `Views -> Features (state, services) -> Core`, as in Nido. `core/` is pure TS
   with no React, three.js or DOM. `features/` owns the session store, archive, settings,
   audio engine and i18n. `scene/` (R3F) and `ui/` (overlay) are Views. They read state and
   subscribe to events; they never mutate the core directly.
3. **State outside React's render loop.** A small external store (`useSyncExternalStore`) holds
   the document; every keystroke also emits a typed event (`strike`, `space`, `bell`,
   `return`, `lock`, `pageFull`). The scene and audio react to events inside `useFrame` and
   through refs, so a keystroke never re-renders the React tree. No zustand: one store is
   not worth a dependency.
4. **Faithful mechanics.** The strike point is fixed in the machine; the carriage and paper
   move under it, one pitch per character, and the platen turns on a line feed. Backspace
   moves the carriage back one column and erases nothing, so the next key overstrikes. The
   bell rings 8 columns before the right margin. At the margin the carriage locks: keys
   give a thunk and print nothing. Enter is the return lever (carriage return plus line
   feed). Tab moves 5 columns. When the last line is typed, the sheet ejects and a new page
   is fed into the same document. Page geometry (A4, pica 10 cpi, about 65 columns by 54
   lines) is a constant in `core/`, not a magic number in the views.
5. **Text rendering = instanced glyph quads, not a canvas texture.** A glyph atlas is
   rasterised at runtime from the same font. Each strike is one instance on the paper mesh
   with offset, rotation, density and colour, and a shader multiplies in a paper-space ink
   grain texture. Overstrikes are simply more instances. Re-uploading a 2048 px canvas
   texture on every keystroke was rejected as too slow on mobile.
6. **One layout function for screen and export.** `core/ink.ts` turns (strike, seed) into
   position, rotation, density and colour: per-strike jitter from a seeded RNG, plus a
   persistent per-character "bent typebar" offset. The 3D glyphs and the 2D-canvas export
   both use it, so a PNG or PDF matches the screen exactly.
7. **Lighting.** A desk lamp's spotlight is aimed at the fixed strike point. Its penumbra
   is wide enough to frame the current line, and the paper slides through the cone as in
   real life. A faint ambient/environment light keeps the machine readable. Night mode drops the ambient to
   near zero; a slider sets the lamp intensity. Shadows come from the lamp only, with the
   shadow-map size set by the performance tier.
8. **Machine = procedural.** The only free GLB/FBX candidate found (CC0 "Typewriter" on
   OpenGameArt) turned out to be a monitor-and-keyboard terminal with no carriage, platen or
   typebars, so it was rejected in phase 0 (2026-11-19). The machine is built in code from
   three.js primitives, lathe and extrude geometry: body shell, 44 keys, typebasket with
   typebars, platen, carriage with paper table and return lever, ribbon spools. Every moving
   part is its own object, so each animation is exact. No model file, no licence, no
   decoder to host. A glTF model can replace the body later without touching the core.
9. **Input.** Input comes from a focused, visually hidden `<textarea>` through `beforeinput`
   (`insertText`, `insertLineBreak`, `deleteContentBackward`) and composition events, not
   `keydown` keys. This handles Italian accents, dead keys and Android's `229` key codes with
   one code path. The field is cleared after every event.
10. **Audio.** Freesound CC BY 4.0 samples (CC0 typewriter recordings with bell and carriage return could not be downloaded without an account) (several keystroke takes, plus space, bell, return,
    ratchet, thunk, paper) are decoded once into `AudioBuffer`s and played with ±4 % playback
    rate and gain variation. The `AudioContext` resumes on the first gesture. Volume and
    mute live in settings.
11. **Storage.** `localStorage` holds a versioned schema (`{ version, documents, settings }`)
    with a migration function. Strikes are stored sparsely (row, col, char, colour, seed).
    Autosave is debounced, every access goes through try/catch, and the app keeps working
    in memory when storage is blocked.
12. **Export.** PNG: one image per page from the 2D renderer. PDF: `jspdf`, one A4 page per
    sheet with the page image at 200 dpi or more. TXT: the last strike in each cell,
    trailing spaces trimmed, a form feed between pages.
13. **i18n.** Typed dictionaries (`it.ts`, `en.ts`) checked for identical keys by a test.
    The language comes from `navigator.language`, can be switched in the overlay and
    persists. No i18n library: the UI has a few dozen strings.
14. **Mobile basic.** Tapping the scene focuses the hidden textarea, which opens the virtual
    keyboard; the camera tilts to keep the strike point above the keyboard. Performance
    tiers (drei `PerformanceMonitor`) lower DPR, shadow size and lamp quality. Without
    WebGL the app shows a message.
15. **Repository conventions.** UI strings in IT/EN; code, comments, docs and records in
    English (as in Nido). Commit scopes: `core`, `scene`, `audio`, `ui`, `app`, `assets`,
    `docs`, `ci`, `repo`. There is no git repository and nothing is pushed anywhere: the project stays in this folder (owner decision 2026-11-19). Record moves and index regeneration work without git.

## Risks

- **Procedural look:** a coded machine can look toy-like. Mitigation: bevelled geometry, PBR
  materials (enamel, chrome, rubber), an environment map and contact shadows; judged by
  screenshots in phase 3.
- **Bundle weight:** three.js and the model are much heavier than Nido. Mitigation: lazy-load
  the scene chunk behind the loading screen, compress the model, and keep the budget at
  5 MB or less.
- **Licences:** every asset's source, author, licence and URL go in `docs/legal/ASSETS.md`
  before it is committed. CC-BY credits are shown in the app.

## Files

| File | Change |
| ---- | ------ |
| `app/package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | NEW - Nido stack plus R3F, `jspdf`, font |
| `app/src/core/page.ts` | NEW - page geometry, document and page model, cell strikes |
| `app/src/core/carriage.ts` | NEW - carriage state machine: type, space, tab, backspace, return, bell, lock, page full |
| `app/src/core/ink.ts` | NEW - seeded RNG, per-strike jitter, per-glyph bias, ribbon colours |
| `app/src/core/export-text.ts` | NEW - TXT serialisation |
| `app/src/core/storage-schema.ts` | NEW - versioned schema plus migrations |
| `app/src/features/session/` | NEW - external store, event bus, hidden-input controller |
| `app/src/features/archive/` | NEW - document list, autosave, local persistence service |
| `app/src/features/audio/` | NEW - Web Audio engine, sample registry |
| `app/src/features/settings/` | NEW - ribbon, lamp, night mode, volume, language |
| `app/src/features/export/` | NEW - 2D page renderer, PNG and PDF export |
| `app/src/features/i18n/` | NEW - `it.ts`, `en.ts`, provider, `t()` |
| `app/src/scene/` | NEW - `Desk`, `Typewriter` (model plus animated parts), `Paper` (instanced glyphs plus ink shader), `Lamp`, `CameraRig`, performance tiers |
| `app/src/ui/` | NEW - overlay toolbar, archive drawer, settings panel, credits, loading, WebGL fallback |
| `app/public/audio/*.ogg` | NEW - CC0 samples |
| `app/tests/*.test.ts` | NEW - core, storage, i18n tests |
| `docs/legal/ASSETS.md` | NEW - asset sources and licences |
| `docs/agents/RULES.local.md` | modified - layers, scopes, conventions, the `npm` via `cmd /c` note |
| `commitlint.config.js` | modified - `scope-enum` in sync with the scopes |
| `.gitlab-ci.yml` | modified - enable the test and build stages for `app/` |
| `README.md` | NEW - what it is, running locally, commands |
| `docs/development/tasks/**` | NEW - one task per phase, created when the phase starts |

## Tests

- Typing a character records a strike at the current cell and advances the column by one.
- Backspace moves back one column, removes nothing, and the next character stacks a second strike in the same cell.
- Backspace at column 0 does nothing.
- The bell event fires once per line, exactly when the column reaches `margin - 8`.
- At the right margin, characters emit `lock`, add no strike and do not move the carriage.
- Return sets the column to the left margin and the row to the next line.
- Return on the last line emits `pageFull` and the next strike lands on row 0 of a new page in the same document.
- Tab advances 5 columns and is clamped at the margin.
- The ink layout is deterministic: the same seed and character give the same offset, rotation and density.
- Ink jitter stays within its configured bounds over 10 000 random seeds.
- The per-glyph bias is stable for a character across strikes.
- The bicolour ribbon stores the colour that was active at strike time.
- The TXT export takes the last strike per cell, trims trailing spaces and separates pages with a form feed.
- Storage round trip: serialise then parse returns a document equal to the original.
- A payload from a newer schema version is refused (never overwritten); a payload with no version is migrated to the current schema; unusable documents, strikes and settings are dropped or defaulted.
- Corrupt JSON in storage yields an empty archive, not a crash.
- The `it` and `en` dictionaries have the same key set and no empty values.

## Validation

Run on 2026-11-19, in headless Chrome (software rendering) on Windows, against the dev server and a production build served by `vite preview`:

- `cmd /c npm run test` (89 cases), `cmd /c npx tsc -b`, `cmd /c npm run lint` and `cmd /c npm run build` pass in `app/`; `sh tools/scaffold.sh records check` passes.
- Typing, return, margin lock, overstrike, tab and a full sheet feeding the next one (`scenario.mjs`); a held key frozen mid-strike shows bar, ribbon and carriage in step (`shot.mjs`).
- Every event starts the expected sound, nothing plays when muted, mute survives a reload (`audio-check.mjs`).
- Text survives a reload with the carriage where it was; two sheets listed, opened, renamed; PNG (A4, 200 dpi, black and red ink), one-page-per-sheet PDF and TXT downloads match the text; language and ribbon switch live; night mode leaves the lamp as the only light (`features-check.mjs`).
- A 390x844 and a 360x740 touch screen: no horizontal scroll, the typed line is legible, typing works through the hidden field, the text mirror matches; without WebGL a plain sheet takes over and accepts typing (`mobile-check.mjs`).
- The production build loads the scene, the samples and the fonts with no console error and no failed request.

Not validated: how the sounds actually sound (only checked that they start); frame rate on a real GPU, and the adaptive quality tiers under load (software rendering cannot show it); a real Android and iOS device, the soft keyboard and pinch-zoom on a touch screen (emulated only); Safari and Firefox; screen readers beyond the text mirror existing; the bicolour ribbon lever (the ribbon is a black or red choice in settings).

# Project-specific rules — Typewriter

Companion to `RULES.md`, with the same authority. `RULES.md` is company-wide and replaced by
every scaffold update; **this file is yours** — the scaffold creates it once and never
writes to it again. Everything true only of this project goes here.

Delete a section instead of leaving it empty when it does not apply, and keep what stays
short: a rule nobody can check is a rule nobody follows.

## Naming

- Files: `PascalCase.tsx` for React components, `camelCase.ts` for everything else; folders
  are lowercase.
- Types and components `PascalCase`, functions and values `camelCase`, constants
  `SCREAMING_SNAKE_CASE` when they are tuning numbers in `core/` (page geometry, bell column).
- User-visible strings live only in `app/src/features/i18n/` (IT and EN).

## Layers

A static web app in `app/` (Vite, React 19, TypeScript, Tailwind 4, react-three-fiber). Allowed
dependency direction in `app/src/`:

```
Views (scene/, ui/) -> Features (session, archive, audio, settings, export, i18n) -> Core
```

- `core/` is pure TypeScript: no React, three.js, DOM, `window` or storage access. It holds the
  typewriter rules (page geometry, carriage, margins, bell, overstrike, ink, schema, TXT).
- `features/` owns state and side effects: the external store, event bus, `localStorage`,
  Web Audio, export, i18n. It imports `core/` only.
- `scene/` (R3F) and `ui/` (overlay) are Views. They read state through hooks and subscribe to
  events; they never mutate `core/` objects directly and never touch `localStorage` or `AudioContext`.
- A keystroke must not re-render the React tree: the scene and audio react to events through
  refs and `useFrame`.
- Never the reverse.

## Commit scopes

The real areas of this codebase, kept in sync with `scope-enum` in `commitlint.config.js`.

| Scope | Covers |
| --- | --- |
| `core` | pure typewriter engine (`app/src/core`) |
| `scene` | 3D scene (`app/src/scene`) |
| `audio` | sound engine and samples |
| `ui` | overlay UI, i18n, settings |
| `app` | build, tooling and shell of `app/` |
| `assets` | third-party assets and `docs/legal` |
| `docs` | documentation and records |
| `ci` | pipeline configuration |
| `repo` | repository-wide chores |

## Project conventions

- **Local only.** There is no git repository and nothing is pushed anywhere; the project lives in
  this folder (owner decision 2026-11-19). Do not run `git init`, add remotes or publish.
  Record moves and index regeneration work without git.
- UI language is Italian and English (typed dictionaries); code, comments, docs and records are English.
- On this machine run npm through `cmd /c npm ...` (see Nido); Node 24.
- No hard-coded user-visible strings, and no remote URLs in code: the app loads nothing from a CDN
  (fonts, samples and shaders are all local).
- Every third-party asset gets a row in `docs/legal/ASSETS.md` before it is used.
- Generated: `app/dist`, `app/node_modules`. Do not edit.

## Addons installed

Which addons this project runs and why — `node packages/engine/bin/scaffold.mjs status`
prints the authoritative list; this section records the intent.

| Addon | Why this project needs it |
| --- | --- |
| `core` | The scaffold: rules, record workflow (tasks, plans, ADRs), commit conventions, CI lint jobs. |

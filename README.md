# Typewriter

A web app that simulates writing on a mechanical typewriter: a 3D machine on a desk, a desk lamp
whose spotlight frames the paper at the strike point, no erasing, a margin bell, a manual
carriage return, imperfect ink and recorded sounds. Italian and English UI. Runs entirely in the
browser; sheets are stored locally and exported as PDF, PNG or TXT.

The project is local only: no git repository, nothing is published.

## Structure

| Folder | Content |
| --- | --- |
| `app/` | The web app: Vite, React 19, TypeScript, Tailwind CSS 4, react-three-fiber |
| `docs/` | Rules for agents, plans, tasks and other records, third-party asset licences |
| `tools/` | Project scaffold (records, commands) |

## Run locally

Requires Node 24+.

```sh
cd app
npm install
npm run dev
```

On this machine run npm through `cmd /c`, e.g. `cmd /c npm run dev`.

```sh
npm run dev      # dev server
npm run build    # production build (tsc + vite)
npm run lint     # oxlint
npm run test     # vitest: core rules, session, archive, storage, sound plan, export names, i18n
```

## Using it

- Type on a physical keyboard (or tap the screen on a phone to raise the keyboard). Nothing can be
  erased: Backspace moves the carriage back and the next key strikes over what is there.
- The bell rings 8 columns before the right margin; at the margin the carriage locks. Enter pushes
  the carriage back and feeds a line; Tab moves 5 columns. A full sheet is ejected and a new one fed.
- Toolbar: your sheets (open, rename, delete), a new sheet, export (PNG of the sheet in the
  machine, PDF and TXT of every sheet), settings (language, ribbon colour, lamp, night mode,
  volume) and credits. Wheel, pinch or the +/- buttons move the camera.
- Everything is saved in the browser (`localStorage`). Without WebGL the page falls back to a plain
  text sheet.

## Checking it in a browser

The scripts in `app/scripts` drive the running dev server (`npm run dev`) in headless Chrome and
need `puppeteer-core` (already a dev dependency) and Chrome (set `CHROME_PATH` if it is not in the
default place). They write screenshots and downloads under `app/.tmp`.

| Script | What it checks |
| --- | --- |
| `shot.mjs` | typing, a strike frozen mid-flight, three zoom levels |
| `scenario.mjs` | lines, return, margin lock, overstrike, tab, a full sheet |
| `audio-check.mjs` | the sound each event starts |
| `features-check.mjs` | saving, sheets, rename, settings, language, exports, night mode |
| `mobile-check.mjs` | a phone-sized screen, the text mirror, the no-WebGL fallback |

## Credits

Sounds are CC BY 4.0 (BryanSaraiva, Yle Arkisto via Freesound). See `docs/legal/ASSETS.md`.

# User manual

The provider web app's user manual, in English, with screenshots of the Vietnamese interface.

```
docs/user-manual/
├── USER_MANUAL.md        the manual — chapters 1–9, figures 1–63
├── USER_MANUAL.docx      the same manual as a Word document, images embedded
├── images/               one PNG per figure, named <chapter>-<step>-<screen>.png
└── scripts/
    ├── capture.mjs       regenerates the screenshots
    ├── shots.mjs         what each screenshot opens, clicks and types
    └── build-docx.mjs    rebuilds USER_MANUAL.docx from USER_MANUAL.md
```

Image names match the sections they belong to: `05-08-confirm-payment.png` is the eighth
screenshot of chapter 5.

## Regenerating the screenshots

The screenshots are taken from the running app in **demo mode**, so no backend is needed:
every screen is filled from the fixtures in `lib/http/demo-mode.ts`.

```bash
npm run dev
```

In a second terminal:

```bash
node docs/user-manual/scripts/capture.mjs
```

Pass one or more id prefixes to capture only some images, for example
`node docs/user-manual/scripts/capture.mjs 05 07-10`.

The script drives the locally installed Chrome, with no extra packages (Node 22 or later). Set
`CHROME_PATH` if Chrome is not found, `BASE_URL` if the dev server is not on port 3000, and
`MANUAL_LOCALE=en` for English screens.

Demo mode has switches for the screens a manual needs, set per shot in `shots.mjs`:

- `persona` — `both` (design & build, default), `designer`, `contractor`, `guest` (signed out,
  for login and registration) or `onboarding` (a new account without a profile).
- `stage` — `signed` (default) or `unsigned` (the Nhà Nâu job before its contract, to show
  creating one).

After a clean branch switch, delete `.next-dev` before `npm run dev`, or the dev server may keep
serving the previous branch's styles.

## Rebuilding the Word version

```bash
node docs/user-manual/scripts/build-docx.mjs
```

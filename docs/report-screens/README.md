# Report screenshots

Screenshots of the app for the course reports, separate from
[`docs/user-manual`](../user-manual), which holds the provider manual and its own 63 figures.

```
docs/report-screens/
├── INDEX.md              what each image shows, its route and its use case
├── images/               the PNGs, named <role>_<NN>_<screen>.png
└── scripts/
    ├── admin-shots.mjs   what each admin screenshot opens, clicks and types
    └── capture-admin.mjs runs them
```

## Taking them again

```bash
npm run dev
```

Then, in a second terminal:

```bash
node docs/report-screens/scripts/capture-admin.mjs
```

Add id prefixes to redo only some: `node docs/report-screens/scripts/capture-admin.mjs admin_08`.

The engine is the user manual's `capture.mjs` — this folder only supplies its own shot list and
output folder, through `SHOTS_FILE` and `OUT_DIR`. `CHROME_PATH`, `BASE_URL` and
`MANUAL_LOCALE=en` work the same way here.

## Why no backend is needed

Every shot runs in demo mode (`lib/http/demo-mode.ts`) as the `admin` persona, which signs in as a
platform administrator and answers the `/api/admin/*` endpoints from fixtures. The fixtures are
consistent with each other: status buckets add up to their totals, and the revenue series sums to
the report total.

Two of the five admin pages have no endpoints behind them and render from
`lib/admin/admin-mock-data.ts` — see INDEX.md before quoting anything from them.

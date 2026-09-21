// Captures the admin console screenshots into docs/report-screens/images.
//
//   npm run dev                                       (in another terminal)
//   node docs/report-screens/scripts/capture-admin.mjs
//   node docs/report-screens/scripts/capture-admin.mjs admin_08   (one shot)
//
// A thin wrapper: the engine is the user manual's capture.mjs, pointed at this
// folder's shot list and image folder.

import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

process.env.SHOTS_FILE ??= path.join(HERE, "admin-shots.mjs");
process.env.OUT_DIR ??= path.join(HERE, "..", "images");

await import(`file://${path.join(HERE, "..", "..", "user-manual", "scripts", "capture.mjs")}`);

#!/usr/bin/env node
/**
 * `npm run design` — start the dev server and open the design gallery.
 *
 * The gallery (`/[locale]/design`) renders every primitive and state from
 * fixtures, so checking a restyle needs no sign-in and no backend. This script
 * exists so that is one command rather than "start the server, remember the
 * path, remember the locale segment".
 *
 * It waits for the server to actually answer before opening a tab. Opening
 * immediately gets you Chrome's error page, which then needs a manual reload —
 * the exact friction this is meant to remove.
 */
import { spawn } from "node:child_process";

const PORT = process.env.PORT ?? "3000";
const LOCALE = process.env.DESIGN_LOCALE ?? "en";
const URL_TO_OPEN = `http://localhost:${PORT}/${LOCALE}/design`;

const server = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-p", PORT],
  { stdio: "inherit", shell: process.platform === "win32" },
);

server.on("exit", (code) => process.exit(code ?? 0));

// Ctrl-C should stop the server, not orphan it behind a dead script.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.kill(sig);
    process.exit(0);
  });
}

function open(url) {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
}

/**
 * Poll until the route responds, then open once.
 *
 * The first request to a Next dev route compiles it, which can take several
 * seconds on a cold start — so the timeout is generous and a failure is
 * reported rather than swallowed. The server keeps running either way; you can
 * always open the URL yourself.
 */
async function openWhenReady() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL_TO_OPEN, { redirect: "follow" });
      if (res.ok) {
        console.log(`\n  Design gallery → ${URL_TO_OPEN}\n`);
        open(URL_TO_OPEN);
        return;
      }
    } catch {
      // server not listening yet
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`\n  Server did not answer in time. Open it yourself:\n  ${URL_TO_OPEN}\n`);
}

void openWhenReady();

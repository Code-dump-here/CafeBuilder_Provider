// Regenerates the user manual's screenshots from the running dev server.
//
//   npm run dev                                   (in another terminal)
//   node docs/user-manual/scripts/capture.mjs            all shots
//   node docs/user-manual/scripts/capture.mjs 05 06-02   only ids starting with these
//
// Screens are captured in demo mode (lib/http/demo-mode.ts), so no backend is
// needed: every screen shows the fixture data, and `localStorage["demo.persona"]`
// switches between a design-and-build provider, a designer, a contractor, a
// signed-out visitor and a new account. The shot list — what to open, click
// and type for each image — is in shots.mjs.
//
// No dependencies: it drives the locally installed Chrome over the DevTools
// protocol with Node's built-in WebSocket (Node 22+). Set CHROME_PATH if Chrome
// is somewhere unusual, and BASE_URL if the dev server is not on :3000.

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The shot list and the folder it writes to can be swapped, so the same engine
// serves other screenshot sets (docs/report-screens) without a second copy.
const { SHOTS } = await import(
  process.env.SHOTS_FILE
    ? path.isAbsolute(process.env.SHOTS_FILE)
      ? `file://${process.env.SHOTS_FILE}`
      : `file://${path.resolve(process.env.SHOTS_FILE)}`
    : "./shots.mjs"
);

const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(HERE, "..", "images");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LOCALE = process.env.MANUAL_LOCALE ?? "vi";
const CHROME =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((candidate) => existsSync(candidate));

if (!CHROME) {
  console.error("Chrome not found — set CHROME_PATH.");
  process.exit(1);
}

const filters = process.argv.slice(2);
const selected = SHOTS.filter((shot) => filters.length === 0 || filters.some((f) => shot.id.startsWith(f)));
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Chrome ─────────────────────────────────────────────────────────────────

const port = 9400 + Math.floor(Math.random() * 400);
const profile = path.join(tmpdir(), `manual-capture-${port}`);
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", `--lang=${LOCALE === "vi" ? "vi-VN" : "en-US"}`, "about:blank",
], { stdio: "ignore" });

async function pageSocket() {
  for (let i = 0; i < 200; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((target) => target.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error("Chrome did not start.");
}

const ws = new WebSocket(await pageSocket());
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

// ─── In-page helpers ────────────────────────────────────────────────────────
// Elements are found by their visible text (or label / placeholder), the way
// a reader of the manual would find them, rather than by class names.

const HELPERS = String.raw`
window.__m = {
  norm: (s) => (s || "").replace(/\s+/g, " ").trim(),
  visible(el) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
  },
  scope(within) {
    if (!within) return document;
    const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(this.visible);
    if (within === "dialog") return dialogs[dialogs.length - 1] || document;
    return document.querySelector(within) || document;
  },
  find(text, opts = {}) {
    const root = this.scope(opts.within);
    const sel = opts.selector || 'button, a, [role="tab"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="button"], [role="checkbox"], [role="radio"], [role="combobox"], label, summary, li, td, h1, h2, h3, h4, p, span, div';
    const want = this.norm(text).toLowerCase();
    const all = [...root.querySelectorAll(sel)].filter((el) => this.visible(el));
    const exact = all.filter((el) => this.norm(el.innerText || el.textContent).toLowerCase() === want);
    const partial = all.filter((el) => this.norm(el.innerText || el.textContent).toLowerCase().includes(want));
    let list = exact.length ? exact : (opts.exact ? [] : partial);
    // Prefer the innermost match, then the nearest clickable ancestor.
    list = list.filter((el) => !list.some((other) => other !== el && el.contains(other)));
    const el = list[opts.nth || 0];
    if (!el) return null;
    return opts.raw ? el : (el.closest('button, a, [role="tab"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="button"], [role="checkbox"], [role="radio"], [role="combobox"], label, summary') || el);
  },
  field(query, within) {
    const root = this.scope(within);
    const inputs = [...root.querySelectorAll("input, textarea, select, [contenteditable=true]")].filter((el) => this.visible(el) || el.type === "file");
    const want = this.norm(query).toLowerCase();
    const byAttr = inputs.find((el) => [el.placeholder, el.name, el.id, el.getAttribute("aria-label")].some((v) => v && this.norm(v).toLowerCase().includes(want)));
    if (byAttr) return byAttr;
    const label = [...root.querySelectorAll("label")].find((l) => this.norm(l.innerText).toLowerCase().includes(want));
    if (label) {
      if (label.htmlFor) return document.getElementById(label.htmlFor);
      const inside = label.querySelector("input, textarea, select");
      if (inside) return inside;
      const next = label.parentElement && label.parentElement.querySelector("input, textarea, select, [role=combobox]");
      if (next) return next;
    }
    return null;
  },
  rect(el) {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
};`;

async function mouseClick({ x, y }) {
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  }
}

async function locate(expr, what) {
  for (let i = 0; i < 40; i++) {
    const point = await evaluate(`(() => { const el = ${expr}; return el ? __m.rect(el) : null; })()`);
    if (point) return point;
    await sleep(250);
  }
  throw new Error(`Not found: ${what}`);
}

// ─── Steps ──────────────────────────────────────────────────────────────────

async function goto(route, wait = 2500) {
  const prefix = LOCALE === "en" ? "" : `/${LOCALE}`;
  const url = BASE + (route.startsWith("http") ? route : prefix + (route === "/" ? "" : route) || "/");
  await send("Page.navigate", { url });
  await sleep(wait);
}

async function run(step) {
  if (step.goto) return goto(step.goto, step.wait);
  if (step.wait) return sleep(step.wait);
  if (step.click) {
    const opts = JSON.stringify({ within: step.within, nth: step.nth, exact: step.exact, selector: step.selector });
    await mouseClick(await locate(`__m.find(${JSON.stringify(step.click)}, ${opts})`, step.click));
    return sleep(step.after ?? 600);
  }
  if (step.clickSel) {
    await mouseClick(await locate(`[...document.querySelectorAll(${JSON.stringify(step.clickSel)})].filter((e) => __m.visible(e))[${step.nth ?? 0}]`, step.clickSel));
    return sleep(step.after ?? 600);
  }
  if (step.fill) {
    const [query, value] = step.fill;
    await mouseClick(await locate(`__m.field(${JSON.stringify(query)}, ${JSON.stringify(step.within ?? null)})`, query));
    await evaluate(`(() => { const el = document.activeElement; if (el && el.select) el.select(); })()`);
    await send("Input.insertText", { text: String(value) });
    return sleep(step.after ?? 200);
  }
  if (step.choose || step.chooseSel) {
    // A native <select>: pick the option whose text contains the value.
    // `choose` finds it the way a reader would (label, placeholder, name);
    // `chooseSel` takes a CSS selector, for the selects that carry no label
    // at all — the admin account filters, for one.
    const [query, optionText] = step.choose ?? step.chooseSel;
    const finder = step.chooseSel
      ? `[...document.querySelectorAll(${JSON.stringify(query)})].filter((e) => __m.visible(e))[${step.nth ?? 0}]`
      : `__m.field(${JSON.stringify(query)}, ${JSON.stringify(step.within ?? null)})`;
    const ok = await evaluate(`(() => {
      const el = ${finder};
      if (!el || el.tagName !== "SELECT") return false;
      const option = [...el.options].find((o) => o.text.includes(${JSON.stringify(optionText)}));
      if (!option) return false;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, option.value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`Select option not found: ${query} → ${optionText}`);
    return sleep(step.after ?? 500);
  }
  if (step.type !== undefined) {
    // Character by character, for inputs that react to each keystroke (the
    // one-box-per-digit verification code).
    for (const ch of String(step.type)) {
      await send("Input.insertText", { text: ch });
      await sleep(60);
    }
    return sleep(step.after ?? 300);
  }
  if (step.key) {
    const [key, code, keyCode] = { Escape: ["Escape", "Escape", 27], Enter: ["Enter", "Enter", 13], Tab: ["Tab", "Tab", 9] }[step.key];
    for (const type of ["keyDown", "keyUp"]) {
      await send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: keyCode });
    }
    return sleep(step.after ?? 400);
  }
  if (step.scrollTo) {
    await locate(`__m.find(${JSON.stringify(step.scrollTo)}, { raw: true })`, step.scrollTo);
    await evaluate(`(() => { const el = __m.find(${JSON.stringify(step.scrollTo)}, { raw: true }); el.scrollIntoView({ block: ${JSON.stringify(step.block ?? "start")} }); window.scrollBy(0, ${step.offset ?? -90}); })()`);
    return sleep(step.after ?? 500);
  }
  if (step.scrollY !== undefined) {
    await evaluate(`window.scrollTo(0, ${step.scrollY})`);
    return sleep(400);
  }
  if (step.eval) {
    const value = await evaluate(step.eval);
    if (step.log) console.log("       ", JSON.stringify(value));
    return sleep(step.after ?? 300);
  }
  throw new Error("Unknown step " + JSON.stringify(step));
}

// ─── Capture ────────────────────────────────────────────────────────────────

await send("Page.enable");
await send("Runtime.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: HELPERS + `
    const style = document.createElement("style");
    style.textContent = "[data-demo-banner], nextjs-portal { display: none !important; } *, *::before, *::after { caret-color: transparent !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));`,
});
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
// Native controls (date pickers) follow the browser locale, not the page's.
await send("Emulation.setLocaleOverride", { locale: LOCALE === "vi" ? "vi-VN" : "en-US" });

let currentPersona = null;
const failures = [];

for (const shot of selected) {
  const [width, height] = shot.viewport ?? [1440, 900];
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  // Persona and stage are read once per page load, so they are set on a
  // throwaway page before the shot's own navigation.
  const persona = `${shot.persona ?? "both"}|${shot.stage ?? "signed"}`;
  if (persona !== currentPersona) {
    await goto("/", 1500);
    await evaluate(`localStorage.setItem("demo.persona", ${JSON.stringify(shot.persona ?? "both")}); localStorage.setItem("demo.stage", ${JSON.stringify(shot.stage ?? "signed")}); localStorage.setItem("theme", "light"); document.cookie = "NEXT_LOCALE=${LOCALE};path=/"; true`);
    currentPersona = persona;
  }

  try {
    for (const step of shot.steps) await run(step);
    // Park the pointer in a corner so the last thing clicked isn't left in
    // its hover state (unless the shot is about a hover).
    if (!shot.keepHover) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: width - 2, y: height - 2 });
    await sleep(shot.settle ?? 700);

    const params = { format: "png", captureBeyondViewport: false };
    if (shot.clip) {
      const pad = shot.pad ?? 12;
      const rect = await evaluate(`(() => {
        const el = ${shot.clip.startsWith("text:") ? `__m.find(${JSON.stringify(shot.clip.slice(5))}, { raw: true, within: "dialog" })` : `[...document.querySelectorAll(${JSON.stringify(shot.clip)})].filter((e) => __m.visible(e)).pop()`};
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
      })()`);
      if (!rect) throw new Error(`Clip target not found: ${shot.clip}`);
      params.clip = {
        x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad),
        width: rect.width + pad * 2, height: rect.height + pad * 2, scale: 1,
      };
      // Only when the element runs past the screen: capturing beyond the
      // viewport resizes the page, and some components (the sidebar's open
      // groups) re-render in their default state when that happens.
      params.captureBeyondViewport = rect.y + rect.height > height;
    }
    const { data } = await send("Page.captureScreenshot", params);
    writeFileSync(path.join(OUT, `${shot.id}.png`), Buffer.from(data, "base64"));

    const broken = await evaluate(`/Something went wrong|This page could not be found|can.t be reached/.test(document.body.innerText)`);
    console.log(`${broken ? "BROKEN" : "ok    "} ${shot.id}`);
    if (broken) failures.push(shot.id);
  } catch (error) {
    console.log(`FAILED ${shot.id}: ${error.message}`);
    failures.push(shot.id);
  }
}

ws.close();
chrome.kill();
await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
if (failures.length) {
  console.log(`\n${failures.length} failed: ${failures.join(", ")}`);
  process.exitCode = 1;
}

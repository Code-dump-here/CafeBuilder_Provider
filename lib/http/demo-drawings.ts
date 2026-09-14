/**
 * Line drawings for the demo designs, as SVG data URIs.
 *
 * The design detail page exists to show drawings, and with image-less
 * fixtures it was a column of upload box, a blank viewer and a rail — nothing
 * to judge a layout against. These are simple but honest drawings of the demo
 * café (the same bar run, 6.4 m, as the quotation), drawn as ink on paper so
 * they sit on the viewer's white plate the way a real upload would.
 *
 * Dev-only, like the rest of demo mode.
 */

const INK = "#2b2118";
const RED = "#b3401a";

const svg = (body: string, title: string, sheet: string) => {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" font-family="IBM Plex Mono, Consolas, monospace">
<rect width="1200" height="800" fill="#fff"/>
<rect x="24" y="24" width="1152" height="752" fill="none" stroke="${INK}" stroke-width="2"/>
<g stroke="${INK}" fill="none" stroke-width="2">${body}</g>
<g font-size="26" fill="${INK}">
  <rect x="700" y="676" width="476" height="100" fill="#fff" stroke="${INK}" stroke-width="2"/>
  <line x1="700" y1="712" x2="1176" y2="712" stroke="${INK}"/>
  <line x1="1040" y1="676" x2="1040" y2="776" stroke="${INK}"/>
  <text x="714" y="701" font-size="17" letter-spacing="2">TITLE</text>
  <text x="714" y="756" font-size="20" font-weight="600">${title}</text>
  <text x="1054" y="701" font-size="17" letter-spacing="2">SHEET</text>
  <text x="1054" y="756" font-weight="700">${sheet}</text>
</g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doc)}`;
};

const dim = (x1: number, y: number, x2: number, label: string) => `
<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke-width="1.2"/>
<line x1="${x1}" y1="${y - 10}" x2="${x1}" y2="${y + 10}" stroke-width="1.2"/>
<line x1="${x2}" y1="${y - 10}" x2="${x2}" y2="${y + 10}" stroke-width="1.2"/>
<text x="${(x1 + x2) / 2}" y="${y - 8}" text-anchor="middle" font-size="26" fill="${INK}" stroke="none">${label}</text>`;

const hatch = (x: number, y: number, w: number, h: number) => {
  let lines = "";
  for (let i = -h; i < w; i += 14) {
    const x1 = Math.max(x, x + i);
    const y1 = y + Math.max(0, -i);
    const x2 = Math.min(x + w, x + i + h);
    const y2 = y + Math.min(h, w - i);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="0.8"/>`;
  }
  return lines;
};

/** Front elevation of the bar run: counter, stone top, shelving, till. */
export const BAR_ELEVATION = svg(
  `
<line x1="120" y1="600" x2="1080" y2="600" stroke-width="3"/>
<rect x="180" y="380" width="840" height="220"/>
<rect x="170" y="364" width="860" height="16" fill="${INK}" fill-opacity="0.12"/>
${Array.from({ length: 11 }, (_, i) => `<line x1="${210 + i * 76}" y1="390" x2="${210 + i * 76}" y2="590" stroke-width="0.8"/>`).join("")}
<rect x="240" y="120" width="720" height="18"/>
<rect x="240" y="200" width="720" height="18"/>
${[300, 380, 460, 560, 640, 760, 840].map((x) => `<rect x="${x}" y="${x % 3 === 0 ? 150 : 160}" width="34" height="${x % 3 === 0 ? 50 : 40}" stroke-width="1.2"/>`).join("")}
<rect x="820" y="318" width="70" height="46" stroke="${RED}"/>
<text x="855" y="300" text-anchor="middle" font-size="24" fill="${RED}" stroke="none">TILL — MOVED 900 W</text>
${dim(180, 660, 1020, "6 400")}
<line x1="1100" y1="364" x2="1100" y2="600" stroke-width="1.2"/>
<line x1="1090" y1="364" x2="1110" y2="364" stroke-width="1.2"/>
<line x1="1090" y1="600" x2="1110" y2="600" stroke-width="1.2"/>
<text x="1088" y="488" text-anchor="end" font-size="26" fill="${INK}" stroke="none">1 050</text>
<text x="180" y="96" font-size="26" fill="${INK}" stroke="none" letter-spacing="2">FRONT ELEVATION  1:25</text>`,
  "Bar elevation — front",
  "A-201",
);

/** Section through the counter: carcass, veneer, stone top, sink. */
export const BAR_SECTION = svg(
  `
<line x1="200" y1="620" x2="1000" y2="620" stroke-width="3"/>
${hatch(200, 620, 800, 40)}
<rect x="420" y="260" width="360" height="360"/>
<rect x="404" y="240" width="392" height="20" fill="${INK}" fill-opacity="0.15"/>
<line x1="412" y1="270" x2="412" y2="620" stroke-width="5"/>
<path d="M520 260 v-10 h140 v10 M540 260 v70 h100 v-70"/>
<path d="M590 330 v200 h120" stroke-dasharray="10 6"/>
<text x="720" y="540" font-size="24" fill="${INK}" stroke="none">WASTE TO FLOOR GULLY</text>
<text x="820" y="252" font-size="24" fill="${INK}" stroke="none">20 MM QUARTZ TOP</text>
<text x="250" y="420" font-size="24" fill="${INK}" stroke="none">OAK VENEER</text>
<line x1="340" y1="426" x2="410" y2="440" stroke-width="1.2"/>
${dim(404, 200, 796, "650")}
<text x="200" y="120" font-size="26" fill="${INK}" stroke="none" letter-spacing="2">SECTION A–A  1:10</text>`,
  "Bar counter — section A–A",
  "A-202",
);

/** Ground floor plan: walls, bar, seating, entry. */
export const GROUND_FLOOR_PLAN = svg(
  `
<rect x="140" y="120" width="920" height="520" stroke-width="10"/>
<rect x="140" y="120" width="920" height="520" stroke-width="0" fill="${INK}" fill-opacity="0.03"/>
<line x1="380" y1="640" x2="480" y2="640" stroke="#fff" stroke-width="14"/>
<path d="M380 640 A100 100 0 0 1 480 540" stroke-dasharray="6 5" stroke-width="1.2"/>
<path d="M720 170 h290 v330 h-70 v-260 h-220 z" fill="${RED}" fill-opacity="0.08" stroke="${RED}"/>
${[[240, 220], [360, 220], [240, 360], [360, 360]].map(([x, y]) => `<rect x="${x}" y="${y}" width="70" height="70"/><rect x="${x + 15}" y="${y - 22}" width="40" height="14"/><rect x="${x + 15}" y="${y + 78}" width="40" height="14"/>`).join("")}
<circle cx="560" cy="460" r="46"/>
${[[560, 390], [560, 530], [490, 460], [630, 460]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join("")}
${[760, 810, 860].map((x) => `<circle cx="${x}" cy="275" r="14" stroke="${RED}"/>`).join("")}
<text x="860" y="530" font-size="26" fill="${INK}" stroke="none">BAR</text>
<text x="430" y="690" font-size="26" fill="${INK}" stroke="none">ENTRY</text>
<text x="240" y="560" font-size="26" fill="${INK}" stroke="none">SEATING · 18</text>
${dim(140, 84, 1060, "12 400")}
<text x="140" y="740" font-size="26" fill="${INK}" stroke="none" letter-spacing="2">GROUND FLOOR PLAN  1:100</text>`,
  "Ground floor plan",
  "A-101",
);

/** Reflected ceiling plan with pendant and track positions. */
export const LIGHTING_LAYOUT = svg(
  `
<rect x="140" y="120" width="920" height="520" stroke-width="6"/>
${[[275, 255], [395, 255], [275, 395], [395, 395]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16"/><line x1="${x - 24}" y1="${y}" x2="${x + 24}" y2="${y}" stroke-width="1"/><line x1="${x}" y1="${y - 24}" x2="${x}" y2="${y + 24}" stroke-width="1"/>`).join("")}
<line x1="740" y1="210" x2="1000" y2="210" stroke-width="4"/>
${[770, 830, 890, 950].map((x) => `<rect x="${x - 8}" y="200" width="16" height="20" fill="${INK}"/>`).join("")}
<circle cx="560" cy="460" r="30" stroke="${RED}"/>
<path d="M275 255 C 300 320, 370 330, 395 255 M275 395 C 300 460, 370 470, 395 395" stroke-dasharray="8 6" stroke-width="1.2"/>
<text x="740" y="190" font-size="24" fill="${INK}" stroke="none">TRACK OVER BAR · 4 × 12 W</text>
<text x="520" y="420" font-size="24" fill="${RED}" stroke="none">FEATURE PENDANT</text>
<text x="140" y="740" font-size="26" fill="${INK}" stroke="none" letter-spacing="2">REFLECTED CEILING PLAN  1:100</text>`,
  "Lighting layout",
  "E-101",
);

/** Hand-lettered signage sketch for the shopfront. */
export const SIGNAGE_SKETCH = svg(
  `
<rect x="200" y="200" width="800" height="300" stroke-width="3"/>
<rect x="240" y="240" width="720" height="120"/>
<text x="600" y="330" text-anchor="middle" font-size="84" font-family="Georgia, serif" font-style="italic" fill="${INK}" stroke="none">Nhà Nâu</text>
<text x="600" y="420" text-anchor="middle" font-size="30" letter-spacing="10" fill="${INK}" stroke="none">COFFEE · QUẬN 1</text>
<path d="M200 500 v120 M1000 500 v120" stroke-width="3"/>
<circle cx="600" cy="560" r="36" stroke="${RED}"/>
<text x="650" y="566" font-size="24" fill="${RED}" stroke="none">TAKEAWAY WINDOW</text>
<text x="200" y="150" font-size="26" fill="${INK}" stroke="none" letter-spacing="2">SHOPFRONT SIGNAGE — CONCEPT B</text>`,
  "Signage — concept B",
  "S-001",
);

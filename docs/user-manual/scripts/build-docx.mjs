// Builds USER_MANUAL.docx from USER_MANUAL.md, with the screenshots embedded.
//
//   node docs/user-manual/scripts/build-docx.mjs
//
// Understands the Markdown the manual uses: headings, paragraphs, bullet
// lists, tables (including image cells), images, figure captions, bold,
// italics and inline code. The Markdown file stays the source; this only
// renders it.
//
// Needs the `docx` package — from the project if installed, otherwise from
// the global npm folder (`npm i -g docx`).

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
function loadDocx() {
  try {
    return require("docx");
  } catch {
    try {
      return require(path.join(execSync("npm root -g").toString().trim(), "docx"));
    } catch {
      console.error("The `docx` package is needed: npm i -g docx");
      process.exit(1);
    }
  }
}
const {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow,
  TextRun, WidthType,
} = loadDocx();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const md = readFileSync(path.join(ROOT, "USER_MANUAL.md"), "utf8").replace(/\r\n/g, "\n");

// A4 with 2 cm margins: 17 cm of text width ≈ 642 px at 96 dpi.
const CONTENT_PX = 640;
const MAX_IMAGE_HEIGHT_PX = 760;
const CONTENT_DXA = 9638;
const FONT = "Arial";
const ACCENT = "B34A12";

// ─── Inline text ──────────────────────────────────────────────────────────

function runs(text, base = {}) {
  // Links become their text; the manual's links are to its own headings.
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(new TextRun({ text: text.slice(last, match.index), ...base }));
    const token = match[0];
    if (token.startsWith("**")) out.push(new TextRun({ text: token.slice(2, -2), bold: true, ...base }));
    else if (token.startsWith("`")) out.push(new TextRun({ text: token.slice(1, -1), font: "Consolas", ...base }));
    else out.push(new TextRun({ text: token.slice(1, -1), italics: true, ...base }));
    last = match.index + token.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

// ─── Images ───────────────────────────────────────────────────────────────

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function image(file, maxWidth = CONTENT_PX, maxHeight = MAX_IMAGE_HEIGHT_PX) {
  const data = readFileSync(path.join(ROOT, file));
  const { width, height } = pngSize(data);
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return new ImageRun({
    type: "png", data,
    transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
  });
}

const IMAGE_LINE = /^!\[[^\]]*\]\(([^)]+)\)$/;

// ─── Blocks ───────────────────────────────────────────────────────────────

const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function table(lines) {
  const rows = lines
    .filter((line) => !/^\|\s*-/.test(line))
    .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  const columns = rows[0].length;
  const colWidth = Math.floor(CONTENT_DXA / columns);
  const colPx = Math.floor(CONTENT_PX / columns) - 16;
  return new Table({
    width: { size: colWidth * columns, type: WidthType.DXA },
    columnWidths: Array(columns).fill(colWidth),
    rows: rows.map((cells, r) => new TableRow({
      tableHeader: r === 0,
      children: cells.map((cell) => {
        const img = IMAGE_LINE.exec(cell);
        return new TableCell({
          borders,
          width: { size: colWidth, type: WidthType.DXA },
          shading: r === 0 ? { fill: "F3EDE6", type: ShadingType.CLEAR, color: "auto" } : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: img ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: img ? [image(img[1], colPx, 520)] : runs(cell, r === 0 ? { bold: true } : {}),
          })],
        });
      }),
    })),
  });
}

const children = [];
const lines = md.split("\n");
let skipContents = false;
let chapterCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  if (trimmed === "## Contents") {
    // The Markdown contents list becomes a real table of contents.
    skipContents = true;
    // Styled like a heading but not one, so it doesn't list itself.
    children.push(new Paragraph({
      spacing: { before: 240, after: 200 },
      children: [new TextRun({ text: "Contents", bold: true, size: 34, color: "2B2118" })],
    }));
    children.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
    continue;
  }
  if (skipContents) {
    if (trimmed === "---") skipContents = false;
    continue;
  }
  if (!trimmed || trimmed === "---") continue;

  if (trimmed.startsWith("# ")) {
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(trimmed.slice(2))] }));
    continue;
  }
  if (trimmed.startsWith("## ")) {
    chapterCount += 1;
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: chapterCount > 0,
      children: [new TextRun(trimmed.slice(3))],
    }));
    continue;
  }
  if (trimmed.startsWith("### ")) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(trimmed.slice(4))] }));
    continue;
  }
  if (trimmed.startsWith("|")) {
    const block = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) block.push(lines[i++].trim());
    i -= 1;
    children.push(table(block));
    children.push(new Paragraph({ children: [] }));
    continue;
  }
  const img = IMAGE_LINE.exec(trimmed);
  if (img) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [image(img[1])] }));
    continue;
  }
  if (/^\*Figures? \d/.test(trimmed)) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: runs(trimmed.slice(1, -1), { italics: true, size: 18, color: "666666" }),
    }));
    continue;
  }
  if (trimmed.startsWith("- ")) {
    children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(trimmed.slice(2)) }));
    continue;
  }
  if (/^\*[^*].*\*$/.test(trimmed)) {
    children.push(new Paragraph({ children: runs(trimmed.slice(1, -1), { italics: true, color: "666666" }) }));
    continue;
  }
  const stepMatch = /^(Step [\d.]+:)(.*)$/.exec(trimmed);
  if (stepMatch) {
    children.push(new Paragraph({ children: [new TextRun({ text: stepMatch[1], bold: true, color: ACCENT }), ...runs(stepMatch[2])] }));
    continue;
  }
  children.push(new Paragraph({ children: runs(trimmed) }));
}

const doc = new Document({
  creator: "SmartCafeBuilder",
  title: "SmartCafeBuilder — Provider Web App User Manual",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { after: 120, line: 276 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal",
        run: { size: 44, bold: true, font: FONT, color: "2B2118" }, paragraph: { spacing: { after: 240 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, font: FONT, color: "2B2118" }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } }],
    }],
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: ["SmartCafeBuilder — Provider User Manual · ", PageNumber.CURRENT], size: 16, color: "888888" })],
        })],
      }),
    },
    children,
  }],
});

const out = path.join(ROOT, "USER_MANUAL.docx");
writeFileSync(out, await Packer.toBuffer(doc));
console.log("Wrote", path.relative(process.cwd(), out));

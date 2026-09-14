import * as React from "react";
import { useTranslations } from "next-intl";

import { Stamp } from "@/components/drawing-set/stamp";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";

/**
 * Hero drawing: a café ground-floor plan, drawn the way a real sheet is.
 *
 * It replaces a stack of tilted UI cards over random stock photos. Those said
 * "SaaS product"; this says what the product is for — a room that gets drawn,
 * measured, priced and signed off. Nothing here is an image: every line is SVG
 * in `currentColor`, so it follows the theme and stays sharp at any size.
 *
 * On load the walls, bar and furniture draw in along their own paths
 * (`pathLength=1` makes every dash animation the same length whatever the
 * shape), the fills and labels ink in behind them, and the APPROVED stamp lands
 * last. Reduced motion shows the finished sheet.
 */
export function FloorPlan() {
  const t = useTranslations("HomePage.hero.plan");

  return (
    <figure className="relative">
      <div className="relative border border-foreground/20 bg-card p-3 shadow-e2 sm:p-4">
        <svg
          viewBox="0 0 560 420"
          role="img"
          aria-label={t("alt")}
          className="block h-auto w-full text-foreground/70"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
        >
          <defs>
            <pattern id="plan-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* ── Dimension lines ─────────────────────────────────────────── */}
          <g strokeWidth="0.8">
            <Draw as="line" delay={900} x1={70} y1={36} x2={490} y2={36} />
            <Draw as="line" delay={900} x1={70} y1={28} x2={70} y2={54} />
            <Draw as="line" delay={900} x1={490} y1={28} x2={490} y2={54} />
            <Draw as="path" delay={950} d="M64 42 L76 30 M484 42 L496 30" strokeWidth="1.4" />
            <Draw as="line" delay={900} x1={40} y1={60} x2={40} y2={320} />
            <Draw as="line" delay={900} x1={32} y1={60} x2={58} y2={60} />
            <Draw as="line" delay={900} x1={32} y1={320} x2={58} y2={320} />
            <Draw as="path" delay={950} d="M34 66 L46 54 M34 326 L46 314" strokeWidth="1.4" />
          </g>
          <Ink delay={1100}>
            <rect x={246} y={29} width={68} height={14} fill="var(--card)" stroke="none" />
            <text x={280} y={40} textAnchor="middle" className="fill-foreground font-mono" fontSize="11" stroke="none">
              12 400
            </text>
            <rect x={33} y={168} width={14} height={44} fill="var(--card)" stroke="none" />
            <text x={0} y={0} transform="translate(44 190) rotate(-90)" textAnchor="middle" className="fill-foreground font-mono" fontSize="11" stroke="none">
              7 800
            </text>
          </Ink>

          {/* ── Grid bubbles ────────────────────────────────────────────── */}
          <Ink delay={1000}>
            {[
              { cx: 70, cy: 14, l: "A" },
              { cx: 490, cy: 14, l: "B" },
              { cx: 14, cy: 60, l: "1" },
              { cx: 14, cy: 320, l: "2" },
            ].map((b) => (
              <g key={b.l}>
                <circle cx={b.cx} cy={b.cy} r={9} strokeWidth="0.8" />
                <text x={b.cx} y={b.cy + 3.5} textAnchor="middle" className="fill-foreground font-mono" fontSize="10" stroke="none">
                  {b.l}
                </text>
              </g>
            ))}
          </Ink>

          {/* ── Walls: hatched section, then the outlines drawn over it ───── */}
          <Ink delay={500}>
            <path d="M70 60h420v260H70z M80 70v240h400V70z" fillRule="evenodd" fill="url(#plan-hatch)" stroke="none" className="text-foreground/35" />
          </Ink>
          <Draw as="rect" delay={0} x={70} y={60} width={420} height={260} strokeWidth="1.6" />
          <Draw as="rect" delay={120} x={80} y={70} width={400} height={240} strokeWidth="1" />

          {/* Entry: the opening is cut out of the wall, then the door swings in */}
          <Ink delay={600}>
            <rect x={118} y={308} width={54} height={14} fill="var(--card)" stroke="none" />
          </Ink>
          <Draw as="line" delay={650} x1={120} y1={320} x2={120} y2={270} strokeWidth="1.4" />
          <Draw as="path" delay={700} d="M170 320 A50 50 0 0 0 120 270" strokeWidth="0.8" strokeDasharray="3 3" />

          {/* Glazing on the street wall */}
          <Ink delay={600}>
            <rect x={196} y={58} width={108} height={14} fill="var(--card)" stroke="none" />
            <rect x={326} y={58} width={108} height={14} fill="var(--card)" stroke="none" />
          </Ink>
          <g strokeWidth="0.8">
            <Draw as="path" delay={700} d="M196 60 H304 M196 65 H304 M196 70 H304" />
            <Draw as="path" delay={740} d="M326 60 H434 M326 65 H434 M326 70 H434" />
          </g>

          {/* ── Bar: the one thing drawn in the accent colour ───────────── */}
          <g className="text-primary">
            <Ink delay={1000}>
              <path d="M300 104 H450 V262 H424 V130 H300 Z" fill="currentColor" fillOpacity="0.14" stroke="none" />
            </Ink>
            <Draw as="path" delay={350} d="M300 104 H450 V262 H424 V130 H300 Z" strokeWidth="1.6" />
            <Draw as="rect" delay={520} x={428} y={146} width={18} height={34} strokeWidth="1.2" />
            {[
              [322, 146], [352, 146], [382, 146],
              [406, 178], [406, 208], [406, 238],
            ].map(([cx, cy], i) => (
              <Draw key={i} as="circle" delay={560 + i * 40} cx={cx} cy={cy} r={7} strokeWidth="1" />
            ))}
          </g>

          {/* ── Seating ──────────────────────────────────────────────────── */}
          <g strokeWidth="1">
            {[
              { x: 108, y: 104 },
              { x: 108, y: 190 },
              { x: 196, y: 104 },
            ].map((tb, i) => (
              <g key={i}>
                <Draw as="rect" delay={600 + i * 60} x={tb.x} y={tb.y} width={34} height={34} />
                <Draw as="rect" delay={640 + i * 60} x={tb.x + 7} y={tb.y - 12} width={20} height={8} />
                <Draw as="rect" delay={660 + i * 60} x={tb.x + 7} y={tb.y + 38} width={20} height={8} />
              </g>
            ))}
            <Draw as="circle" delay={780} cx={232} cy={228} r={24} />
            {[
              [232, 190], [270, 228], [232, 266], [194, 228],
            ].map(([cx, cy], i) => (
              <Draw key={i} as="circle" delay={820 + i * 30} cx={cx} cy={cy} r={6} />
            ))}
          </g>

          {/* ── Room labels ──────────────────────────────────────────────── */}
          <Ink delay={1200}>
            <text x={437} y={284} textAnchor="middle" className="fill-foreground font-mono uppercase" fontSize="10" letterSpacing="1.5" stroke="none">
              {t("bar")}
            </text>
            <text x={232} y={296} textAnchor="middle" className="fill-foreground font-mono uppercase" fontSize="10" letterSpacing="1.5" stroke="none">
              {t("seating")}
            </text>
            <text x={145} y={346} textAnchor="middle" className="fill-foreground font-mono uppercase" fontSize="10" letterSpacing="1.5" stroke="none">
              {t("entry")}
            </text>
          </Ink>

          {/* ── North point ──────────────────────────────────────────────── */}
          <Ink delay={1250}>
            <circle cx={522} cy={374} r={16} strokeWidth="0.8" />
            <path d="M522 358 L529 380 L522 375 L515 380 Z" fill="currentColor" stroke="none" />
            <text x={522} y={352} textAnchor="middle" className="fill-foreground font-mono" fontSize="10" stroke="none">
              N
            </text>
          </Ink>
        </svg>

        {/* The sign-off lands after the drawing is done. */}
        <div className="pointer-events-none absolute top-[53%] left-[62%] -translate-x-1/2 -translate-y-1/2">
          <Stamp tone="success" size="lg" seed="approved-hero" animate delayMs={1550}>
            {t("approved")}
          </Stamp>
        </div>
      </div>

      {/* Title block — the strip every real sheet carries along its edge. */}
      <figcaption>
        <TitleBlock className="w-full flex-nowrap border-t-0">
          <TitleCell label={t("sheet")} emphasis>A-101</TitleCell>
          <TitleCell label={t("titleLabel")} grow>
            <span className="block truncate normal-case tracking-normal">{t("title")}</span>
          </TitleCell>
          <TitleCell label={t("scale")}>1:100</TitleCell>
          <TitleCell label={t("revision")}>C</TitleCell>
        </TitleBlock>
      </figcaption>
    </figure>
  );
}

/* ── Animation helpers ────────────────────────────────────────────────────── */

type DrawProps =
  | ({ as: "line" } & React.SVGProps<SVGLineElement>)
  | ({ as: "rect" } & React.SVGProps<SVGRectElement>)
  | ({ as: "circle" } & React.SVGProps<SVGCircleElement>)
  | ({ as: "path" } & React.SVGProps<SVGPathElement>);

/** A stroke that draws itself in. `pathLength=1` normalises every shape. */
function Draw({ as, delay = 0, style, ...props }: DrawProps & { delay?: number }) {
  const Tag = as as unknown as React.ElementType;
  // A dashed stroke (the door swing) keeps its own dash pattern and fades in
  // instead — a dash animation would overwrite the pattern.
  const dashed = "strokeDasharray" in props && props.strokeDasharray;
  return (
    <Tag
      {...props}
      pathLength={dashed ? undefined : 1}
      className={dashed ? "ink-fade" : "draw-line"}
      style={{
        ...(dashed ? null : { strokeDasharray: 1, strokeDashoffset: 1 }),
        animation: dashed
          ? `ink-fade 500ms ease-out ${delay}ms both`
          : `draw-line 900ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
        ...style,
      }}
    />
  );
}

/** Fills and lettering ink in behind the linework. */
function Ink({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <g className="ink-fade" style={{ animation: `ink-fade 600ms ease-out ${delay}ms both` }}>
      {children}
    </g>
  );
}

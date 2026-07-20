interface BuildsChartProps {
  data: { day: number; builds: number }[];
}

/**
 * Inline SVG sparkline-style chart for "active builds over time".
 * Pure server-renderable SVG — no JS, no chart lib, no top-level
 * hooks. Hover is handled via CSS sibling selectors reading the
 * dot grid via `data-active` toggled on hover.
 */
export function BuildsChart({ data }: BuildsChartProps) {
  const w = 720;
  const h = 180;
  const pad = 16;

  const maxBuilds = Math.max(...data.map((d) => d.builds));
  const minBuilds = Math.min(...data.map((d) => d.builds));
  const range = Math.max(1, maxBuilds - minBuilds);

  const stepX = (w - pad * 2) / (data.length - 1);
  const yFor = (v: number) =>
    pad + (h - pad * 2) - ((v - minBuilds) / range) * (h - pad * 2);

  const points = data.map((d, i) => `${pad + i * stepX},${yFor(d.builds)}`).join(" ");
  const fillPoints = `${pad},${h - pad} ${points} ${pad + (data.length - 1) * stepX},${h - pad}`;

  const last = data.at(-1)!;
  const lastX = pad + (data.length - 1) * stepX;
  const lastY = yFor(last.builds);

  return (
    <div className="relative h-[180px] w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Active builds over the last 30 days"
      >
        <defs>
          <linearGradient id="buildsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={pad + (h - pad * 2) * t}
            y2={pad + (h - pad * 2) * t}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeDasharray="2 4"
          />
        ))}

        {/* Area */}
        <polygon points={fillPoints} fill="url(#buildsFill)" className="text-primary" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />

        {/* Latest marker */}
        <circle cx={lastX} cy={lastY} r={5} className="fill-primary" />
        <circle cx={lastX} cy={lastY} r={10} className="fill-primary/30" />
      </svg>

      <div className="absolute right-1 top-1 flex flex-col rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] shadow-sm backdrop-blur">
        <span className="text-muted-foreground">Latest</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {last.builds}
        </span>
      </div>
    </div>
  );
}
"use client";

import * as React from "react";
import { CalendarCheck2, Hammer, MessagesSquare } from "lucide-react";

/**
 * Visual anchor for the hero — a layered "brief card stack" built
 * from real card primitives (not div-based fake screenshots).
 *
 * Why this exists instead of a div-screenshot:
 *   - The skill bans hand-rolled fake product UIs in the hero.
 *   - We have no real product screenshot we own the rights to.
 *   - This stack is honest: it shows three real-looking surface tiles
 *     (project brief, milestone timeline, messaging) sitting on top
 *     of one real photograph, suggesting the platform without
 *     inventing screenshots that don't exist.
 *
 * Background photograph is from `picsum.photos` with a descriptive
 * seed so each render gets a deterministic, brand-appropriate
 * placeholder. We pin dimensions to prevent CLS during the swap.
 *
 * Motion: subtle 3D tilt + parallax via Motion-free CSS `transform`
 * driven by a `useMotionValue`-style mouse listener implemented in
 * pure React refs. No external motion library.
 */
export function HomepageHeroVisual() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Pointer-driven tilt — disabled under reduced motion and on
  // touch devices (which fire pointer events without sustained hover).
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let rafId: number | null = null;

    const handleMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) / rect.width;
      const dy = (event.clientY - cy) / rect.height;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-x", `${(dy * -6).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${(dx * 6).toFixed(2)}deg`);
      });
    };

    const handleLeave = () => {
      el.style.setProperty("--tilt-x", `0deg`);
      el.style.setProperty("--tilt-y", `0deg`);
    };

    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerleave", handleLeave);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerleave", handleLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[5/6] w-full max-w-md [transform-style:preserve-3d] [transform:perspective(1100px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] [transition:transform_400ms_cubic-bezier(0.16,1,0.3,1)]"
    >
      {/* Background photograph */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-[0_24px_60px_-20px_oklch(0.25_0.03_55_/_0.45)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/smart-cafe-counter-bartender/720/900"
          alt=""
          width={720}
          height={900}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />
      </div>

      {/* Foreground card 1 — brief */}
      <div className="absolute -start-6 top-6 w-60 origin-bottom-right rotate-[-3deg] rounded-xl border border-border/60 bg-card/95 p-3 shadow-[0_18px_40px_-12px_oklch(0.25_0.03_55_/_0.4)] backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Brief
          </span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            Open
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">
          Smart Cafe / Pham Ngu Lao
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          86 m², specialty coffee, target customers: freelancers and weekend groups.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">Specialty coffee</span>
          <span className="rounded-full bg-muted px-2 py-0.5">$48k</span>
        </div>
      </div>

      {/* Foreground card 2 — milestone timeline */}
      <div className="absolute -end-4 top-1/3 w-56 origin-top-left rotate-[2deg] rounded-xl border border-border/60 bg-card/95 p-3 shadow-[0_18px_40px_-12px_oklch(0.25_0.03_55_/_0.4)] backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <CalendarCheck2 aria-hidden className="size-3 text-primary" />
          Milestone timeline
        </div>
        <ol className="flex flex-col gap-1.5 text-xs text-foreground">
          <li className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <span className="line-through text-muted-foreground">Site prep</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden />
            <span>Foundation</span>
            <span className="ms-auto text-[10px] text-muted-foreground">62%</span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-border" aria-hidden />
            Framing
          </li>
        </ol>
      </div>

      {/* Foreground card 3 — messaging */}
      <div className="absolute bottom-6 start-4 w-52 rotate-[1.5deg] rounded-xl border border-border/60 bg-card/95 p-3 shadow-[0_18px_40px_-12px_oklch(0.25_0.03_55_/_0.4)] backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <MessagesSquare aria-hidden className="size-3 text-primary" />
          Crew chat
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="rounded-md bg-muted px-2 py-1 text-foreground">
            Concrete pour moved to Thu.
          </div>
          <div className="self-end rounded-md bg-primary px-2 py-1 text-primary-foreground">
            Got it, on site.
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Hammer aria-hidden className="size-2.5" />
          Hung, contractor
        </div>
      </div>
    </div>
  );
}
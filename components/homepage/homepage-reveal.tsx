"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  /** Delay in ms relative to siblings (passed as inline `transition-delay`). */
  delay?: number;
  /** Optional class name appended to the root element. */
  className?: string;
  /** Element type. Defaults to `div`. */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Lightweight IntersectionObserver-based "fade up on enter" wrapper.
 *
 * Why not `motion` / GSAP:
 *   - The project does not pull in either library yet.
 *   - Adding one just for a hero fade is overkill — `motion-safe:` +
 *     native CSS handles the same intent in a handful of lines.
 *   - This component is the only client island required for scroll
 *     reveal on the homepage, keeping the page server-renderable
 *     everywhere else.
 *
 * Behavior:
 *   - Renders content immediately at low opacity, off-screen, no JS
 *     required (SSR-safe).
 *   - When the element enters the viewport (or `prefers-reduced-motion`
 *     is on), it flips to the visible state via a one-shot
 *     `data-revealed="true"` attribute. CSS handles the transition.
 *   - Disconnects the observer after first reveal — once visible,
 *     stays visible. Re-rendering the parent does NOT re-trigger.
 *
 * Honors `prefers-reduced-motion`: when the user has reduced motion,
 * the content shows immediately with no transform — the observer
 * simply never animates.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      node.dataset.revealed = "true";
      return;
    }

    if (!("IntersectionObserver" in window)) {
      node.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Inline style with transition-delay so the same wrapper supports
  // staggered children without extra plumbing.
  const style: React.CSSProperties = {
    transitionDelay: delay ? `${delay}ms` : undefined,
  };

  return React.createElement(
    Tag,
    {
      ref,
      "data-reveal": "",
      style,
      className: cn(
        // Hidden state — translate + opacity 0.
        "translate-y-3 opacity-0",
        // Revealed state — flush to position.
        "data-[revealed=true]:translate-y-0 data-[revealed=true]:opacity-100",
        // Animation curve + duration; respects Tailwind's
        // motion-safe / motion-reduce modifiers.
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        "motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      ),
    },
    children,
  );
}
"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";

import { proxiedImageSrc } from "@/lib/image-proxy";

/**
 * The AI-generated concept image for a recommendation.
 *
 * `src` comes from the generator via `imageArtifactUrl`. The generator serves
 * artifacts over plain HTTP, which an HTTPS page refuses to load, so the URL
 * goes through `proxiedImageSrc` before it reaches the tag — see
 * `lib/image-proxy.ts`. Anything already loadable passes through unchanged.
 *
 * Beyond that the value is used as-is: the backend stores whatever the image
 * job returned, so a value that isn't a browsable URL simply fails to load.
 * That's what the placeholder is for — a broken artifact degrades to a
 * labelled box rather than a broken-image glyph. Shared by the owner's full
 * card and the provider's summary row so both sides show the same picture
 * with the same fallback.
 */
export function ConceptImage({
  src,
  prompt,
  promptLabel,
  imageLabel,
}: {
  src: string;
  prompt: string | null;
  promptLabel: string;
  imageLabel: string;
}) {
  const [error, setError] = React.useState(false);

  if (error) {
    return (
      <div
        role="img"
        aria-label={imageLabel}
        className="flex aspect-video w-full items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground"
      >
        <ImageOff className="size-4" aria-hidden />
        {imageLabel}
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-2 overflow-hidden rounded-md border border-border/60">
      <img
        src={proxiedImageSrc(src)}
        alt={imageLabel}
        loading="lazy"
        onError={() => setError(true)}
        className="aspect-video w-full bg-muted object-cover"
      />
      {prompt ? (
        <figcaption className="border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
            {promptLabel}:
          </span>{" "}
          <span className="wrap-break-word">{prompt}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Status variants (`success` / `warning` / `danger` / `info`) exist because
 * 65 files were drawing state by hand, and disagreeing: success was emerald
 * in 34 files, green in 5 and teal in 1; danger was red in 14 and rose in 10.
 * Reach for these instead of colour utilities, and "paid" looks the same
 * everywhere by construction.
 *
 * They are backed by the `--success|warning|danger|info` token families in
 * globals.css, so a restyle moves them in one place.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 py-0.5 text-[0.625rem] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-2.5!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border bg-input/20 text-foreground dark:bg-input/30 [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        // ── Status ──────────────────────────────────────────────────────
        // The wash + its own foreground, rather than a tint of the solid:
        // `text-success/60` on `bg-success/10` is what produced the
        // hand-rolled badges these replace, and it fails contrast at the
        // small size this component renders at.
        //
        // Kept apart from `destructive` above, which is a *brand* role — it
        // follows --primary's family when the brand is restyled. "This
        // payment failed" must not move with it.
        success:
          "bg-success-muted text-success-muted-foreground [a]:hover:bg-success-muted/70",
        warning:
          "bg-warning-muted text-warning-muted-foreground [a]:hover:bg-warning-muted/70",
        danger:
          "bg-danger-muted text-danger-muted-foreground [a]:hover:bg-danger-muted/70",
        info:
          "bg-info-muted text-info-muted-foreground [a]:hover:bg-info-muted/70",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

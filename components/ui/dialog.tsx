"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // `max-h-[90dvh] overflow-y-auto` is load-bearing, not styling. The
          // panel is centred with `-translate-y-1/2` and had no height bound at
          // all, so a dialog taller than the window grew off both ends of it
          // with nothing to scroll — the title unreachable above, the submit
          // button unreachable below. 28 files render a DialogContent and only
          // 16 passed a `max-h-*` of their own, so twelve of them were one
          // long form or one short laptop away from being unusable.
          //
          // `dvh` rather than `vh` so mobile browser chrome is accounted for.
          // A consumer that passes its own `max-h-*` or `overflow-*` still
          // wins: `cn` runs tailwind-merge, and `className` is appended last.
          // `shadow-e3`: a dialog floats above everything, so it takes the top
          // of the elevation scale. It previously had the same 1px ring as a
          // card sitting flat on the page.
          // The panel is bounded but does NOT scroll itself — the inner
          // wrapper below does. That distinction is the whole point: the close
          // button is absolutely positioned against this element, and an
          // absolutely-positioned child of a SCROLL container is positioned
          // against its padding box, so it scrolls with the content. When the
          // panel was the scroller, the X slid out of view on exactly the
          // long dialogs the height cap was added to rescue. Keeping the
          // scroll one level in pins the X for all 44 dialog call sites at
          // once, whatever they pass in `className`.
          //
          // `grid-rows-[minmax(0,1fr)]` lets that single child shrink below
          // its content height; without it the row sizes to the content and
          // the cap has nothing to push against.
          //
          // `dvh` rather than `vh` so mobile browser chrome is accounted for.
          "fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl bg-popover text-xs/relaxed text-popover-foreground shadow-e3 ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {/*
          `p-4` and `gap-4` moved here from the panel so the scrollbar tracks
          the panel edge and content scrolls under the padding rather than
          clipping against it. Verified no call site overrides either on
          DialogContent, so this is invisible to consumers.
        */}
        <div className="grid gap-4 overflow-y-auto p-4">{children}</div>
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2 z-10"
              size="icon-sm"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

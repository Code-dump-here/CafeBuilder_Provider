"use client";

import * as React from "react";
import { AlertTriangle, Check, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { formatVnd } from "@/lib/format-currency";

/**
 * The gallery. Grouped by the decision you are making when you look at it —
 * "is the geometry right", "do the status tones hold up" — rather than by
 * which file a component lives in.
 *
 * Everything is fixture data. Real figures where the app has them (the live
 * provider plan is 299,000 VND for 30 days) so proportions are honest.
 */
export function DesignGallery() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Development only · no auth · no network
          </p>
          <h1 className="mt-2 font-heading text-3xl tracking-tight text-foreground">
            Design gallery
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Every primitive and every state on one page, so a restyle can be
            judged without signing in or hunting for a project that happens to
            be in the state you need.
          </p>
        </div>
        {/* The app's own toggle rather than a local one. Rolling my own here
            read `resolvedTheme` during render, which is the default on the
            server and the stored value on the client — a hydration mismatch,
            and precisely the bug this gallery exists to catch. */}
        <ModeToggle />
      </header>

      <Section
        title="Status"
        note="The four token families. Check these in both themes — a wash that works on paper can vanish on a dark ground."
      >
        <Row label="Badge">
          <Badge variant="success">Paid</Badge>
          <Badge variant="warning">Awaiting confirmation</Badge>
          <Badge variant="danger">Proof rejected</Badge>
          <Badge variant="info">Revision requested</Badge>
        </Row>
        <Row label="Existing">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </Row>
        <Row label="Solid">
          {(["success", "warning", "danger", "info"] as const).map((tone) => (
            <span
              key={tone}
              className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="size-3"
                style={{ background: `var(--${tone})` }}
              />
              --{tone}
            </span>
          ))}
        </Row>
      </Section>

      <Section
        title="Geometry"
        note="--radius is 0, and every step of the scale is calc()'d from it. Avatars, spinners and scrollbar thumbs keep their own rounded-full on purpose."
      >
        <Row label="Button">
          <Button>Continue to payment</Button>
          <Button variant="outline">Compare bids</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Reject</Button>
        </Row>
        <Row label="Sizes">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="States">
          <Button disabled>Awaiting contract</Button>
          <Button aria-busy>
            <Loader2 aria-hidden className="animate-spin" />
            Taking you to payOS…
          </Button>
          <Button variant="outline">
            <Plus aria-hidden />
            Add phase
          </Button>
          <Button variant="destructive">
            <Trash2 aria-hidden />
            Delete
          </Button>
        </Row>
      </Section>

      <Section title="Input" note="Focus rings and invalid states are where a radius change usually shows up as a seam.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Floor area">
            <Input defaultValue="86.5" />
          </Field>
          <Field label="Invalid">
            <Input defaultValue="-12" aria-invalid />
          </Field>
          <Field label="Disabled">
            <Input defaultValue="Set by the owner" disabled />
          </Field>
          <Field label="Note">
            <Textarea rows={3} defaultValue="Bar run relocated to the north wall." />
          </Field>
        </div>
      </Section>

      <Section title="Surfaces" note="Card, skeleton and the money type together — this is what most screens actually are.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gói Nhà Cung Cấp — 1 Tháng</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="font-mono text-sm tabular-nums">30 days</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="font-heading text-xl tabular-nums">
                  {formatVnd(299000, "en")}
                </span>
              </div>
              <Button className="mt-1 w-full">
                <CreditCard aria-hidden />
                Continue to payment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loading</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Feedback" note="States that are hard to reach in the real app — an empty list, a failed load, a milestone nobody has started.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-2 border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">No quotations yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Providers who apply to this post will send priced bids here.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 border border-danger/40 bg-danger-muted p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-danger-muted-foreground">
              <AlertTriangle aria-hidden className="size-4" />
              Couldn&apos;t load the plan catalogue
            </p>
            <p className="text-xs text-danger-muted-foreground/80">
              Please try again in a moment.
            </p>
            <Button variant="outline" size="sm">Try again</Button>
          </div>
        </div>
      </Section>

      <Section title="Density" note="A table is the honest test of type and rule weight — most of this app is rows of numbers.">
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Milestone", "Status", "Due", "Amount"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Demolition & site prep", "success", "12/03", 44850000],
                ["Bar carcass & plumbing", "warning", "26/03", 89700000],
                ["Electrical first fix", "danger", "02/04", 29900000],
                ["Joinery & finishes", "info", "18/04", 134550000],
              ].map(([name, tone, due, amount]) => (
                <tr key={name as string} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{name as string}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tone as "success" | "warning" | "danger" | "info"}>
                      {tone === "success"
                        ? "Accepted"
                        : tone === "warning"
                          ? "In progress"
                          : tone === "danger"
                            ? "Overdue"
                            : "Not started"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {due as string}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatVnd(amount as number, "en")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <footer className="border-t border-border pt-6 pb-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <Check aria-hidden className="size-3" />
          Fixtures only — nothing on this page reaches the API
        </p>
      </footer>
    </div>
  );
}

// ─── Layout helpers ─────────────────────────────────────────────────────────

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-border pb-2">
        <h2 className="font-heading text-lg tracking-tight text-foreground">{title}</h2>
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

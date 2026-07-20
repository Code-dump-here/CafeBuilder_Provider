import { cn } from "@/lib/utils";

interface PageHeadProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Top-of-page header block shared by every admin page.
 * Server-component friendly (no "use client"); passing RSC nodes via
 * `actions` is fine since they render on the client side anyway.
 */
export function PageHead({ title, description, actions, className }: PageHeadProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
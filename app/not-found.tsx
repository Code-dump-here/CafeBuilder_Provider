import Link from "next/link";

/**
 * Root-level 404, for requests that never resolved a locale segment at all.
 *
 * Deliberately plain and untranslated, for the same reason `global-error.tsx`
 * is: there is no locale here, so there is no message catalogue to read and
 * `useTranslations` would throw. Styling stays on theme tokens, which are
 * defined in the root stylesheet and do not depend on any provider mounting.
 */
export default function RootNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="font-mono text-5xl font-semibold text-muted-foreground/50">
        404
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you were looking for doesn&rsquo;t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-muted"
      >
        Go home
      </Link>
    </div>
  );
}

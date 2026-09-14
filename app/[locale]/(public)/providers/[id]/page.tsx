"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { ProviderPublicProfile } from "@/components/provider-profile";

/**
 * Owner-facing public provider profile at `/[locale]/providers/{id}`.
 *
 * Pulled into a component so the page can defer to the loading
 * skeleton (`ProviderProfileSkeleton`) without re-creating the
 * route. The id comes from `useParams` since this lives under
 * `[locale]/providers/[id]`.
 */
export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  if (!id) {
    // Should not happen — Next.js only mounts this route when the
    // segment is present — but render the skeleton rather than crash
    // if `useParams` returns undefined in a test environment.
    return <ProviderPublicProfile profileId="" />;
  }

  return <ProviderPublicProfile profileId={id} />;
}

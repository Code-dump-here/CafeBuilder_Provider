import { isServer, QueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        // A 4xx is an answer, not a hiccup: asking again returns the same
        // thing. Everything else — 5xx, a dropped connection, a timeout —
        // gets two more attempts. Every error reaching here is an AppError,
        // because the axios layer normalises before it throws.
        retry: (failureCount, error) => {
          const status = error instanceof AppError ? error.status : undefined;
          if (status !== undefined && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import { getQueryClient } from "@/lib/react-query/query-client";
// Importing `lib/http/axios` triggers:
//   - module-load interceptor attachment (request + response interceptors),
//   - module-load token-store hydration from localStorage.
// See `lib/http/axios.ts` for the rationale.
import "@/lib/http/axios";
import { authEvents } from "@/lib/auth/auth-events";
import { tokenStore } from "@/lib/auth/token-store";

export default function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // `tokenStore` is hydrated and the axios interceptors are attached as
    // part of `lib/http/axios.ts` module-load evaluation (the import
    // below triggers both). This effect just calls `hydrate()` again as
    // a safety net for client-side navigations where module-load
    // evaluation timing is uncertain.
    tokenStore.hydrate();

    const off = authEvents.on("auth:expired", () => {
      // The token store is already wiped by the time `auth:expired` fires
      // (interceptors do that BEFORE emitting). Surface it to the user and
      // send them to /login. `auth:expired` is debounced — we only see the
      // first transition even when many requests race.
      toast.error("Your session has expired. Please sign in again.", {
        toastId: "auth-expired",
      });
      queryClient.clear();
      router.replace("/login");
    });

    return () => {
      off();
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        toastClassName="rounded-lg shadow-lg border border-border text-sm font-medium"
      />
    </QueryClientProvider>
  );
}
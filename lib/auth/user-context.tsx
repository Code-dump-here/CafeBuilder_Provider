"use client";

import * as React from "react";
import { useMe } from "./use-me";
import { tokenStore } from "./token-store";
import type { NormalizedAccount } from "./auth-me-types";

interface UserContextValue {
  account: NormalizedAccount | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  /** True when we have a token but account data is still loading */
  isHydrating: boolean;
  /** True when user has a valid token (authentication confirmed) */
  isAuthenticated: boolean;
}

const UserContext = React.createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { data, isLoading, isError, error, refetch } = useMe();

  // Subscribe to tokenStore to detect auth changes
  const hasToken = React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.hasAccessToken(),
    () => false, // SSR: assume no token
  );

  const value: UserContextValue = {
    account: data,
    isLoading,
    isError,
    error,
    refetch,
    // True when we have token but /me hasn't returned yet
    isHydrating: hasToken && isLoading,
    // True when we have a valid token (confirmed by tokenStore)
    isAuthenticated: hasToken,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

export function useCurrentUser(): UserContextValue {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return context;
}

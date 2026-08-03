type AuthEvent = "auth:expired";

type Listener = () => void;

const listeners = new Map<AuthEvent, Set<Listener>>();

/**
 * Tracks whether the `auth:expired` signal has already fired since the
 * last app start. Set to `true` on emit, reset by `clearExpiredFlag()`.
 * We use this to make sure a flurry of 401s (e.g. multiple parallel
 * requests that all lost the same stale token) only fires ONE redirect
 * — otherwise the router would queue multiple `/login` redirects.
 */
let expiredFlag = false;

export const authEvents = {
  on(event: AuthEvent, listener: Listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(listener);
    return () => listeners.get(event)?.delete(listener);
  },
  /**
   * Broadcast an auth event. `auth:expired` is debounced to a single
   * transition per session — call `clearExpiredFlag()` after a successful
   * (re-)login so a future expiry can fire again.
   */
  emit(event: AuthEvent) {
    if (event === "auth:expired") {
      if (expiredFlag) return;
      expiredFlag = true;
    }
    listeners.get(event)?.forEach((listener) => listener());
  },
  /**
   * Reset the `auth:expired` debounce. Call this on successful login /
   * register so the next session expiry can fire a fresh redirect.
   */
  clearExpiredFlag() {
    expiredFlag = false;
  },
};

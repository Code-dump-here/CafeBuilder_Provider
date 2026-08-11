"use client";

import * as React from "react";

/**
 * Runs `reset` during render whenever `token` changes.
 *
 * This is React's documented "adjusting state when a prop changes" pattern,
 * and it replaces the very common:
 *
 * ```ts
 * React.useEffect(() => {
 *   if (open) setTitle("");
 * }, [open]);
 * ```
 *
 * That effect works, but it renders the dialog once with the stale value and
 * then again with the reset one — the cascading render `react-hooks`'
 * set-state-in-effect rule warns about. Updating during render instead lets
 * React discard the first result before it reaches the DOM, so the stale
 * value is never painted.
 *
 * Only for deriving state from props. If the work touches the outside world
 * — reading `localStorage`, subscribing to `matchMedia`, starting a timer,
 * fetching — that genuinely belongs in an effect; leave it there.
 *
 * `reset` is called during render, so it must only call the component's own
 * state setters and must not have side effects.
 */
export function useResetOnChange(token: unknown, reset: () => void): void {
  const [previous, setPrevious] = React.useState(token);

  if (!Object.is(previous, token)) {
    setPrevious(token);
    reset();
  }
}

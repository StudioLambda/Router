import { createContext, useTransition } from 'react'

/**
 * Provides the `[isPending, startTransition]` tuple from
 * `useTransition()` to descendant components. The Router and
 * navigation handlers use this to wrap state updates in
 * concurrent transitions.
 *
 * Defaults to `null` — a parent component must provide a real
 * `useTransition()` tuple via `<TransitionContext value={...}>`.
 * Using the standalone `startTransition` from React as a default
 * would silently break `isPending` tracking, so we require an
 * explicit provider instead.
 */
export const TransitionContext = createContext<ReturnType<typeof useTransition> | null>(null)

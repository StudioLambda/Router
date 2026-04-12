import { createContext } from 'react'

/**
 * Provides the AbortSignal from the current NavigateEvent.
 * Consumers can use this to cancel in-flight async operations
 * (fetches, transitions, etc.) when a navigation is superseded
 * by another one.
 *
 * Defaults to `undefined` when no Router is present — the
 * `useNavigationSignal` hook throws in this case. The Router
 * provides `null` on initial render (before any navigation
 * event), which is distinct from the `undefined` sentinel.
 */
export const NavigationSignalContext = createContext<AbortSignal | null | undefined>(undefined)

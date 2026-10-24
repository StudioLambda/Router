import { createContext } from 'react'

/**
 * Provides the AbortSignal from the current NavigateEvent.
 * This is the native event signal, not a route-unmount signal. Cancellation
 * follows the browser's navigation lifetime; a completed navigation's signal
 * need not abort when the user later leaves the page. Own a separate abort
 * controller when work must be cancelled on unmount.
 *
 * Defaults to `undefined` when no Router is present — the
 * `useNavigationSignal` hook throws in this case. The Router
 * provides `null` initially, distinct from the `undefined` sentinel. Only
 * rendered match updates replace it; failed checks and unchanged custom
 * actions preserve the signal associated with the existing content.
 * @example
 * ```tsx
 * const view = <NavigationSignalContext value={null}><Page /></NavigationSignalContext>
 * // Page can call useNavigationSignal() and receives null for initial render.
 * ```
 */
export const NavigationSignalContext = createContext<AbortSignal | null | undefined>(undefined)

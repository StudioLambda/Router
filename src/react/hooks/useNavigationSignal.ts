import { use } from 'react'
import { NavigationSignalContext } from 'router/react:context/NavigationSignalContext'

/**
 * Returns the AbortSignal from the current navigation event.
 * Cancellation follows the native NavigateEvent lifetime. It is not a
 * route-unmount signal: a completed navigation's signal need not abort on
 * the next navigation. Use a separately owned AbortController for work that
 * must stop on unmount; Router adds no stronger cancellation guarantee.
 *
 * Returns `null` on initial render, until an intercepted navigation updates
 * the rendered match. Failed checks and unchanged custom form actions do
 * not replace the signal stored with that match.
 *
 * Must be used inside a `<Router>` component tree.
 *
 * @returns The current AbortSignal or null.
 * @throws When used outside a Router or NavigationSignalContext
 *   provider.
 *
 * @example
 * ```tsx
 * function NavigationStatus() {
 *   const signal = useNavigationSignal()
 *   return <p>{signal === null ? 'Initial render' : 'Reached by navigation'}</p>
 * }
 * ```
 */
export function useNavigationSignal(): AbortSignal | null {
  const signal = use(NavigationSignalContext)

  if (signal === undefined) {
    throw new Error('useNavigationSignal requires a <Router> or <NavigationSignalContext> provider')
  }

  return signal
}

import { use } from 'react'
import { NavigationSignalContext } from 'router/react:context/NavigationSignalContext'

/**
 * Returns the AbortSignal from the current navigation event.
 * The signal aborts when the navigation is cancelled (e.g.,
 * by the user pressing Stop or a new navigation superseding
 * this one). Pass this to fetch calls or other cancellable
 * async operations to avoid stale work.
 *
 * Returns `null` before any navigation event has occurred
 * (i.e. on the initial render).
 *
 * Must be used inside a `<Router>` component tree.
 *
 * @returns The current AbortSignal or null.
 * @throws When used outside a Router or NavigationSignalContext
 *   provider.
 *
 * @example
 * ```tsx
 * function UserProfile({ id }: { id: string }) {
 *   const signal = useNavigationSignal()
 *
 *   useEffect(function () {
 *     fetch(`/api/user/${id}`, { signal })
 *   }, [id, signal])
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

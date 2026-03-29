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
 * @returns The current AbortSignal or null.
 */
export function useNavigationSignal(): AbortSignal | null {
  return use(NavigationSignalContext)
}

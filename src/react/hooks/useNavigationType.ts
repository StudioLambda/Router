import { use } from 'react'
import { NavigationTypeContext } from 'router/react:context/NavigationTypeContext'

/**
 * Returns the navigation type of the most recent navigation
 * (`push`, `replace`, `reload`, or `traverse`). Useful for
 * varying animations, skipping prefetch on reload, or
 * applying different behavior for back/forward traversals.
 *
 * Returns `null` before any navigation event has occurred
 * (i.e. on the initial render).
 *
 * @returns The current NavigationType or null.
 */
export function useNavigationType(): NavigationType | null {
  return use(NavigationTypeContext)
}

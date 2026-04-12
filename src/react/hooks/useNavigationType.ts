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
 * Must be used inside a `<Router>` component tree.
 *
 * @returns The current NavigationType or null.
 * @throws When used outside a Router or NavigationTypeContext
 *   provider.
 *
 * @example
 * ```tsx
 * function PageTransition({ children }: { children: ReactNode }) {
 *   const type = useNavigationType()
 *   const isTraversal = type === 'traverse'
 *
 *   return (
 *     <div className={isTraversal ? 'slide' : 'fade'}>
 *       {children}
 *     </div>
 *   )
 * }
 * ```
 */
export function useNavigationType(): NavigationType | null {
  const navigationType = use(NavigationTypeContext)

  if (navigationType === undefined) {
    throw new Error('useNavigationType requires a <Router> or <NavigationTypeContext> provider')
  }

  return navigationType
}

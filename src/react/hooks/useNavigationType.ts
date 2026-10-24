import { use } from 'react'
import { NavigationTypeContext } from 'router/react:context/NavigationTypeContext'

/**
 * Returns the navigation type associated with the rendered route
 * (`push`, `replace`, `reload`, or `traverse`). Useful for
 * varying rendered animations or
 * applying different behavior for back/forward traversals.
 *
 * Returns `null` initially, until an intercepted navigation updates the
 * rendered match. Failed checks and unchanged custom form actions do not
 * replace the stored type.
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

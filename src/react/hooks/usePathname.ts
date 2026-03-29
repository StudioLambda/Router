import { use } from 'react'
import { PathnameContext } from 'router/react:context/PathnameContext'

/**
 * Returns the current URL pathname from the Router's state.
 * The value updates on every navigation and reflects the
 * pathname of the committed destination URL.
 *
 * Useful for active link detection, conditional rendering
 * based on the current route, or building breadcrumbs.
 *
 * Must be used inside a `<Router>` component tree where
 * `PathnameContext` is provided.
 *
 * @returns The current pathname string (e.g. `"/user/42"`).
 *
 * @example
 * ```tsx
 * function Breadcrumb() {
 *   const pathname = usePathname()
 *
 *   return <span>{pathname}</span>
 * }
 * ```
 */
export function usePathname(): string {
  return use(PathnameContext)
}

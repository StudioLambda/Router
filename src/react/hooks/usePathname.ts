import { use } from 'react'
import { PathnameContext } from 'router/react:context/PathnameContext'

/**
 * Returns the current URL pathname from the Router's state.
 * The value updates when navigation checks permit a rendered route update.
 * It can lag the address bar after a failed noncancelable postcommit check;
 * it does not subscribe directly to every native URL commit.
 *
 * Useful for active link detection, conditional rendering
 * based on the current route, or building breadcrumbs.
 *
 * Must be used inside a `<Router>` component tree where
 * `PathnameContext` is provided.
 *
 * @returns The current pathname string (e.g. `"/user/42"`).
 * @throws When used outside a Router or PathnameContext provider.
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
  const pathname = use(PathnameContext)

  if (pathname === null) {
    throw new Error('usePathname requires a <Router> or <PathnameContext> provider')
  }

  return pathname
}

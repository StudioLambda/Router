import { createContext } from 'react'

/**
 * Provides the current URL pathname to descendant components.
 * Updated by the Router on every navigation with the pathname
 * extracted from the destination URL.
 *
 * Consumed by the `usePathname` hook and the `Link` component
 * for active link detection. Defaults to `'/'` when no Router
 * is present in the tree.
 */
export const PathnameContext = createContext<string>('/')

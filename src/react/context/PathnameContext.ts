import { createContext } from 'react'

/**
 * Provides the current URL pathname to descendant components.
 * Updated by the Router on every navigation with the pathname
 * extracted from the destination URL.
 *
 * Defaults to `null` when no Router is present in the tree —
 * the `usePathname` hook throws a descriptive error in this
 * case. Consumed by the `usePathname` hook and the `Link`
 * component for active link detection.
 */
export const PathnameContext = createContext<string | null>(null)

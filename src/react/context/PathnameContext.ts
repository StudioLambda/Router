import { createContext } from 'react'

/**
 * Provides the current URL pathname to descendant components.
 * Updated by the Router on every rendered route update with the pathname
 * extracted from the destination URL.
 *
 * Defaults to `null` when no Router is present in the tree —
 * the `usePathname` hook throws a descriptive error in this
 * case. Consumed by the `usePathname` hook and the `Link`
 * component for active link detection.
 * @example `<PathnameContext value="/docs"><Link href="/docs">Docs</Link></PathnameContext>`
 */
export const PathnameContext = createContext<string | null>(null)

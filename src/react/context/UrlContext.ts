import { createContext } from 'react'

/**
 * Provides the full committed URL string to descendant
 * components. Updated by the Router on every navigation
 * with the destination URL. Defaults to `null` when no
 * Router is present in the tree.
 *
 * Consumed by `useSearchParams` to derive search parameters
 * from React state rather than reading the mutable
 * `navigation.currentEntry` during render — preventing
 * subscription tearing in concurrent mode.
 */
export const UrlContext = createContext<string | null>(null)

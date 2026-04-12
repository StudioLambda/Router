import { createContext } from 'react'

/**
 * Provides the route parameters extracted from the matched URL
 * pattern as a string-keyed record. Defaults to `null` when no
 * Router is present in the tree — the `useParams` hook throws
 * a descriptive error in this case.
 *
 * The Router component updates this context on every successful
 * navigation with the newly extracted parameters.
 */
export const ParamsContext = createContext<Record<string, string> | null>(null)

import { createContext } from 'react'

/**
 * Provides the route parameters extracted from the matched URL
 * pattern as a string-keyed record. Defaults to `null` when no
 * Router is present in the tree — the `useParams` hook throws
 * a descriptive error in this case.
 *
 * The Router component updates this context on every successful
 * route update with the newly extracted parameters. Treat the shared record
 * as read-only. Parameter values remain URL-encoded.
 * @example `<ParamsContext value={{ id: '42' }}><UserPage /></ParamsContext>`
 */
export const ParamsContext = createContext<Record<string, string> | null>(null)

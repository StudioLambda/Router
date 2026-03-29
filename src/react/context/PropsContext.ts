import { createContext } from 'react'

/**
 * Provides the route parameters extracted from the matched URL
 * pattern as a string-keyed record. Defaults to an empty object
 * when no route has been matched yet.
 *
 * Consumed via the `useParams` hook. The Router component
 * updates this context on every successful navigation with
 * the newly extracted parameters.
 */
export const ParamsContext = createContext<Record<string, string>>({})

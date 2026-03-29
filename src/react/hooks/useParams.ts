import { use } from 'react'
import { ParamsContext } from 'router/react:context/PropsContext'

/**
 * Returns the dynamic route parameters extracted from the
 * currently matched URL pattern. The keys correspond to the
 * `:param` names defined in the route pattern, and the values
 * are the matching URL segments.
 *
 * Must be used inside a `<Router>` component tree where
 * `ParamsContext` is provided.
 *
 * @returns A record of parameter names to their string values.
 *
 * @example
 * ```tsx
 * // Route pattern: "/user/:id"
 * // URL: "/user/42"
 * const { id } = useParams() // id === "42"
 * ```
 */
export function useParams() {
  return use(ParamsContext)
}

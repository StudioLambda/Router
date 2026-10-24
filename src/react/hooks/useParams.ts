import { use } from 'react'
import { ParamsContext } from 'router/react:context/ParamsContext'

/**
 * Returns the dynamic route parameters extracted from the
 * currently matched URL pattern. The keys correspond to the
 * `:param` names defined in the route pattern, and the values
 * are the matching URL segments without decoding. Wildcard captures use
 * their `*param` name and join remaining segments with `/`. Treat the shared
 * record as read-only; do not mutate context state.
 *
 * Must be used inside a `<Router>` component tree where
 * `ParamsContext` is provided.
 *
 * @returns A record of parameter names to their string values.
 * @throws When used outside a Router or ParamsContext provider.
 *
 * @example
 * ```tsx
 * // Route pattern: "/user/:id"
 * // URL: "/user/42"
 * function UserPage() {
 *   const { id } = useParams() // id === '42'
 *   return <h1>User {id}</h1>
 * }
 * ```
 */
export function useParams(): Record<string, string> {
  const params = use(ParamsContext)

  if (params === null) {
    throw new Error('useParams requires a <Router> or <ParamsContext> provider')
  }

  return params
}

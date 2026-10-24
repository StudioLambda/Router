import { useNavigation } from 'router/react:hooks/useNavigation'

/**
 * Returns a function to programmatically navigate to a URL
 * with full Navigation API options support (`state`, `info`,
 * `history`). This is a thin convenience wrapper around
 * `navigation.navigate()`.
 *
 * @returns A navigate function that accepts a URL string and
 *   optional `NavigationNavigateOptions`.
 *   Observe `committed` and `finished` for native navigation failures. The
 *   memory adapter returns resolved promises without changing location.
 * @throws Error when no NavigationContext provider is available; native
 *   navigate errors retain the browser API's synchronous/promise semantics.
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const navigate = useNavigate()
 *
 *   return (
 *     <button onClick={function () {
 *       const result = navigate('/login', { history: 'replace' })
 *       Promise.all([result.committed, result.finished]).catch(console.error)
 *     }}>
 *       Log Out
 *     </button>
 *   )
 * }
 * ```
 */
export function useNavigate() {
  const navigation = useNavigation()

  /**
   * Programmatically navigates to the given URL. Delegates
   * to the native `navigation.navigate()` method, which
   * fires the `navigate` event intercepted by the Router.
   *
   * @param url - The destination URL to navigate to.
   * @param options - Optional Navigation API options including
   *   `state`, `info`, and `history` behavior.
   * @returns The NavigationResult from the Navigation API.
   */
  return function (url: string, options?: NavigationNavigateOptions) {
    return navigation.navigate(url, options)
  }
}

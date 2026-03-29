import { useNavigation } from 'router/react:hooks/useNavigation'

/**
 * Returns a function to programmatically navigate to a URL
 * with full Navigation API options support (`state`, `info`,
 * `history`). This is a thin convenience wrapper around
 * `navigation.navigate()`.
 *
 * @returns A navigate function that accepts a URL string and
 *   optional `NavigationNavigateOptions`.
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

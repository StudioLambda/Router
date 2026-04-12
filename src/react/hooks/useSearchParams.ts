import { use } from 'react'
import { UrlContext } from 'router/react:context/UrlContext'
import { useNavigation } from 'router/react:hooks/useNavigation'

/**
 * Updater function signature for setting search params.
 * Accepts either a new URLSearchParams instance, a plain
 * record of string key-value pairs, or a function that
 * receives the current params and returns updated params.
 */
export type SearchParamsUpdater =
  | URLSearchParams
  | Record<string, string>
  | ((current: URLSearchParams) => URLSearchParams | Record<string, string>)

/**
 * Options for the search params navigation performed by
 * the setter function returned from `useSearchParams`.
 */
export interface SetSearchParamsOptions {
  /**
   * History behavior for the navigation. Defaults to
   * `'replace'` since search param changes typically
   * should not create new history entries.
   */
  history?: NavigationHistoryBehavior
}

/**
 * Returns the current URL's search parameters as a
 * `URLSearchParams` instance and a setter function to
 * update them via navigation.
 *
 * The getter derives search params from `UrlContext` —
 * React state managed by the Router — rather than reading
 * the mutable `navigation.currentEntry` during render.
 * This prevents subscription tearing in concurrent mode
 * where two components could otherwise see different
 * search params if a navigation fires mid-render.
 *
 * The setter preserves the existing hash fragment when
 * updating search parameters.
 *
 * The React Compiler handles memoization of the setter,
 * so no manual `useCallback` is needed.
 *
 * Must be used inside a `<Router>` component tree.
 *
 * @returns A tuple of `[searchParams, setSearchParams]`.
 *
 * @example
 * ```tsx
 * function SearchPage() {
 *   const [searchParams, setSearchParams] = useSearchParams()
 *   const query = searchParams.get('q') ?? ''
 *
 *   return (
 *     <input
 *       value={query}
 *       onChange={function (event) {
 *         setSearchParams({ q: event.target.value })
 *       }}
 *     />
 *   )
 * }
 * ```
 */
export function useSearchParams(): [
  URLSearchParams,
  (updater: SearchParamsUpdater, options?: SetSearchParamsOptions) => NavigationResult,
] {
  const navigation = useNavigation()
  const currentUrl = use(UrlContext)

  const searchParams = currentUrl
    ? new URL(currentUrl, 'http://localhost').searchParams
    : new URLSearchParams()

  /**
   * Navigates to the current pathname with updated search
   * parameters. Accepts a URLSearchParams instance, a plain
   * record, or a function that receives the current params
   * and returns new ones. Preserves the existing hash
   * fragment.
   */
  function setSearchParams(updater: SearchParamsUpdater, options?: SetSearchParamsOptions) {
    const url = new URL(currentUrl ?? '/', 'http://localhost')

    const next = typeof updater === 'function' ? updater(url.searchParams) : updater

    const nextParams = next instanceof URLSearchParams ? next : new URLSearchParams(next)

    const search = nextParams.toString()
    const destination = url.pathname + (search ? '?' + search : '') + url.hash

    return navigation.navigate(destination, {
      history: options?.history ?? 'replace',
    })
  }

  return [searchParams, setSearchParams]
}

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
 * The getter reads from `navigation.currentEntry.url`
 * on each render, so it always reflects the committed
 * URL. The setter performs a navigation with the updated
 * search string, defaulting to `history: 'replace'` to
 * avoid polluting the history stack with parameter changes.
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

  const currentUrl = navigation.currentEntry?.url

  const searchParams = currentUrl ? new URL(currentUrl).searchParams : new URLSearchParams()

  /**
   * Navigates to the current pathname with updated search
   * parameters. Accepts a URLSearchParams instance, a plain
   * record, or a function that receives the current params
   * and returns new ones.
   */
  function setSearchParams(updater: SearchParamsUpdater, options?: SetSearchParamsOptions) {
    const currentEntry = navigation.currentEntry
    const url = new URL(currentEntry?.url ?? '/', 'http://localhost')

    const next = typeof updater === 'function' ? updater(url.searchParams) : updater

    const nextParams = next instanceof URLSearchParams ? next : new URLSearchParams(next)

    const search = nextParams.toString()
    const destination = url.pathname + (search ? '?' + search : '')

    return navigation.navigate(destination, {
      history: options?.history ?? 'replace',
    })
  }

  return [searchParams, setSearchParams]
}

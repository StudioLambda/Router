import { use } from 'react'
import { UrlContext } from 'router/react:context/UrlContext'
import { useNavigation } from 'router/react:hooks/useNavigation'

/**
 * Updater function signature for setting search params.
 * Accepts either a new URLSearchParams instance, a plain
 * record of string key-value pairs, or a function that
 * receives the current params and returns updated params.
 * Each update replaces the complete query. Mutating the current params
 * inside an updater is supported: they come from a newly parsed URL, not
 * shared context. Mutating the hook's getter alone does not navigate.
 * @example
 * ```ts
 * const update: SearchParamsUpdater = current => {
 *   current.set('page', '2')
 *   return current
 * }
 * setSearchParams(update)
 * ```
 */
export type SearchParamsUpdater =
  | URLSearchParams
  | Record<string, string>
  | ((current: URLSearchParams) => URLSearchParams | Record<string, string>)

/**
 * Options for the search params navigation performed by
 * the setter function returned from `useSearchParams`.
 * @example `setSearchParams({ page: '2' }, { history: 'push' })`
 */
export interface SetSearchParamsOptions {
  /**
   * History behavior for the navigation. Defaults to
   * `'replace'` since search param changes typically
   * should not create new history entries.
   * @example `setSearchParams({ q: 'router' }, { history: 'replace' })`
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
 *   The setter returns the native NavigationResult; observe its promises
 *   for navigation failures. Memory navigation does not change the query.
 * @throws Error without NavigationContext; malformed context URLs throw
 *   TypeError. Setter errors from the updater or native API propagate.
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
 *         const result = setSearchParams({ q: event.target.value })
 *         Promise.all([result.committed, result.finished]).catch(console.error)
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
   * @param updater - Replacement query or function of a fresh mutable copy.
   * @param options - Native history behavior, defaulting to replace.
   * @returns Native committed/finished promises; no router-owned retry.
   * @example `setSearchParams({ q: 'router' }, { history: 'push' })`
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

import { use } from 'react'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { type Handler, type PrefetchContext } from 'router/react:router'
import { type Matcher } from 'router:matcher'

/**
 * Options for the `usePrefetch` hook.
 */
export interface PrefetchOptions {
  /**
   * Optional matcher override. When omitted the hook reads
   * from `MatcherContext`.
   */
  matcher?: Matcher<Handler>
}

/**
 * Tracks URL pathnames that have already been prefetched,
 * keyed by matcher instance. Using a WeakMap ensures that
 * each matcher (and therefore each Router) gets its own
 * dedup set, and the set is garbage-collected when the
 * matcher is no longer referenced. This prevents cross-
 * contamination between independent Router instances and
 * between isolated test environments.
 */
const prefetchedByMatcher = new WeakMap<Matcher<Handler>, Set<string>>()

/**
 * Clears the prefetch deduplication cache for a specific
 * matcher instance. After clearing, subsequent calls to the
 * prefetch function will re-execute handlers for pathnames
 * that were previously skipped.
 *
 * Useful when cached data becomes stale — for example after
 * a user logs out, a form submission invalidates server
 * state, or a known data expiry occurs.
 *
 * When called without a matcher argument, has no effect.
 * The cache is automatically garbage-collected when the
 * matcher instance is no longer referenced, so explicit
 * clearing is only needed for long-lived matchers.
 *
 * @param matcher - The matcher whose prefetch cache should
 *   be cleared.
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const navigate = useNavigate()
 *   const matcher = use(MatcherContext)
 *
 *   return (
 *     <button onClick={function () {
 *       clearPrefetchCache(matcher)
 *       navigate('/login', { history: 'replace' })
 *     }}>
 *       Log Out
 *     </button>
 *   )
 * }
 * ```
 */
export function clearPrefetchCache(matcher: Matcher<Handler>) {
  prefetchedByMatcher.delete(matcher)
}

/**
 * Returns a function that triggers the prefetch logic for a
 * given URL by resolving it against the matcher and calling
 * the route's prefetch function. Used by the Link component
 * for hover and viewport prefetch strategies.
 *
 * Each pathname is prefetched at most once per matcher
 * instance per page session. Subsequent calls with the same
 * pathname are no-ops, preventing thundering-herd problems
 * when many Links point to the same destination.
 *
 * Since prefetch triggered from Link happens outside of a
 * navigation event, a stub NavigationPrecommitController is
 * passed (the redirect capability is not meaningful here).
 *
 * @param options - Optional matcher override.
 * @returns A function that accepts a URL string and invokes
 *   the matched route's prefetch handler, if any.
 *
 * @example
 * ```tsx
 * function PrefetchOnHover({ href, children }: Props) {
 *   const prefetch = usePrefetch()
 *
 *   return (
 *     <a
 *       href={href}
 *       onMouseEnter={function () { prefetch(href) }}
 *     >
 *       {children}
 *     </a>
 *   )
 * }
 * ```
 */
export function usePrefetch(options?: PrefetchOptions) {
  const matcher = options?.matcher ?? use(MatcherContext)

  /**
   * Triggers prefetch for the given URL by matching it against
   * registered routes and calling the route's prefetch function
   * with a context containing the matched params, the parsed
   * URL, and a stub controller. Extracts the pathname from the
   * URL before matching to handle both absolute and relative URLs.
   *
   * Returns early without calling the handler when the pathname
   * has already been prefetched or is currently in-flight for
   * this matcher instance.
   *
   * @param url - The URL or path to prefetch data for.
   * @returns The prefetch promise, or undefined if no prefetch
   *   handler is registered for the matched route or if the
   *   pathname has already been prefetched.
   */
  return function (url: string) {
    const parsed = new URL(url, 'http://localhost')
    const match = matcher.match(parsed.pathname)

    if (match?.handler.prefetch === undefined) {
      return
    }

    let prefetched = prefetchedByMatcher.get(matcher)

    if (prefetched === undefined) {
      prefetched = new Set()
      prefetchedByMatcher.set(matcher, prefetched)
    }

    if (prefetched.has(parsed.pathname)) {
      return
    }

    prefetched.add(parsed.pathname)

    /**
     * Stub controller for prefetch outside of navigation events.
     * Redirect and addHandler are no-ops in this context since
     * there is no actual navigation to modify.
     */
    const stubController: NavigationPrecommitController = {
      redirect() {},
      addHandler() {},
    }

    const context: PrefetchContext = {
      params: match.params,
      url: parsed,
      controller: stubController,
    }

    return match.handler.prefetch(context)
  }
}

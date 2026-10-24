import { use } from 'react'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { type Handler, type PrefetchContext } from 'router/react:router'
import { type Matcher } from 'router:matcher'

/**
 * Route table selection for speculative preloading. Omission uses the
 * nearest MatcherContext, whose default is an empty route table.
 * @example `const prefetch = usePrefetch({ matcher })`
 */
export interface PrefetchOptions {
  /**
   * Optional matcher override. When omitted the hook reads
   * from `MatcherContext`.
   * @example `const prefetch = usePrefetch({ matcher })`
   */
  matcher?: Matcher<Handler>
}

/**
 * Tracks URL pathnames that have already been prefetched,
 * keyed by matcher instance. Routers sharing a matcher share this attempt
 * cache. Independent matchers do not share attempts. The WeakMap permits
 * collection when the matcher is no longer referenced. Entries are added
 * before calling prefetch and remain after failures; query/hash are ignored.
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
 * Requires the exact matcher used for speculative prefetch. This only
 * clears attempt bookkeeping, not application data, in-flight promises,
 * module caches, or one-shot DOM listeners/observers.
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
 * instance until clearPrefetchCache is called. Subsequent calls with the same
 * pathname are no-ops, preventing thundering-herd problems
 * when many Links point to the same destination.
 * The cache records attempts, not success: failures remain cached, query
 * variants share a key, and duplicate callers receive undefined rather than
 * the in-flight promise. `once={false}` does not bypass this cache. Real
 * navigation prefetch does not use it. Guards never run speculatively, so
 * preload only safe requests and authorize each request on the server.
 *
 * Since prefetch triggered from Link happens outside of a
 * navigation event, a stub NavigationPrecommitController is
 * passed (the redirect capability is not meaningful here).
 *
 * @param options - Optional matcher override.
 * @returns A function that accepts a URL string and invokes
 *   the matched route's prefetch handler, if any.
 * @throws TypeError for malformed URLs or any synchronous prefetch error.
 *   Async failures reject the returned promise. Link/usePrefetchEffect do
 *   not observe rejections; handle expected failures in the preload itself.
 *
 * @example
 * ```tsx
 * function PrefetchOnHover({ href }: { href: string }) {
 *   const prefetch = usePrefetch()
 *
 *   return (
 *     <a
 *       href={href}
 *       onMouseEnter={function () {
 *         try {
 *           Promise.resolve(prefetch(href)).catch(console.error)
 *         } catch (error) {
 *           console.error(error)
 *         }
 *       }}
 *     >
 *       Open page
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

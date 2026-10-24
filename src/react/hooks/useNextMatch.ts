import { type ComponentType, use } from 'react'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { type Handler } from 'router/react:router'
import { type Matcher, type Resolved } from 'router:matcher'

/**
 * Route table selection for URL resolution. This only matches; it does not
 * execute guards or prefetch and is not a safe replacement for Router.
 * @example `const resolve = useNextMatch({ matcher })`
 */
export interface NextMatchOptions {
  /**
   * Optional matcher override. When omitted the hook reads
   * from `MatcherContext`.
   * Defaults to an empty matcher without a provider.
   * @example `const resolve = useNextMatch({ matcher })`
   */
  matcher?: Matcher<Handler>
}

/**
 * Returns a function that resolves a destination URL into a
 * route match. When no route matches, a fallback `Resolved`
 * is returned using the provided `notFound` component.
 *
 * Used internally by the Router to determine which component
 * to render for an incoming navigation event.
 * This resolver does not run guards, prefetch, redirects, or middleware.
 * Relative URLs resolve against `http://localhost/`; null/empty destinations
 * return the fallback match with empty params, without matching `/`.
 *
 * @param options - Optional matcher override.
 * @returns A resolver function that takes a destination URL
 *   and a not-found component, returning the resolved match.
 * @throws TypeError from the returned resolver for a malformed URL.
 *
 * @example
 * ```tsx
 * function MatchPreview() {
 *   const resolve = useNextMatch()
 *   const match = resolve('/users/42', NotFound)
 *
 *   return <pre>{JSON.stringify(match.params)}</pre>
 * }
 * ```
 */
export function useNextMatch(options?: NextMatchOptions) {
  const matcher = options?.matcher ?? use(MatcherContext)

  /**
   * Resolves a destination URL string into a route match.
   * Falls back to a synthetic match wrapping the `notFound`
   * component when the URL doesn't match any registered route.
   *
   * @param destination - The full destination URL string, or
   *   `null` when no URL is available (e.g. initial load
   *   without a current entry).
   * @param notFound - The component to render when no route
   *   matches the destination.
   * @returns The resolved route match with handler and params.
   */
  return function (destination: string | null, notFound: ComponentType): Resolved<Handler> {
    const handler: Handler = { component: notFound }
    const fallbackResolved: Resolved<Handler> = { handler, params: {} }

    if (!destination) {
      return fallbackResolved
    }

    return matcher.match(new URL(destination, 'http://localhost').pathname) ?? fallbackResolved
  }
}

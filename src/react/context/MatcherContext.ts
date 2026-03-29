import { createContext } from 'react'
import { type Handler } from 'router/react:router'
import { createMatcher, type Matcher } from 'router:matcher'

/**
 * Provides the route Matcher instance through React context.
 * Defaults to an empty matcher with no registered routes.
 *
 * The Router component and hooks like `useNextMatch` and
 * `usePrefetch` consume this context to resolve URLs against
 * registered route patterns. Override by passing a `matcher`
 * prop to Router or wrapping with `<MatcherContext value={...}>`.
 */
export const MatcherContext = createContext<Matcher<Handler>>(createMatcher())

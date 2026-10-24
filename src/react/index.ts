/**
 * React 19 routing on the browser Navigation API. Register components with
 * createRouter and mount Router; use middleware for layouts and mandatory
 * guards for initial/navigation checks, never as server authorization.
 * For SSR, supply createMemoryNavigation with the request URL. It is a
 * fixed-location adapter, not a client history implementation or polyfill.
 *
 * @example
 * ```tsx
 * import { createRouter, Router } from '@studiolambda/router/react'
 * const matcher = createRouter(route => {
 *   route('/').render(() => <h1>Home</h1>)
 * })
 * const app = <Router matcher={matcher} />
 * ```
 */
export * from 'router/react:components/Middlewares'
export * from 'router/react:components/Router'
export * from 'router/react:components/NotFound'
export * from 'router/react:components/Link'

export * from 'router/react:context/MatcherContext'
export * from 'router/react:context/TransitionContext'
export * from 'router/react:context/ParamsContext'
export * from 'router/react:context/NavigationContext'
export * from 'router/react:context/NavigationSignalContext'
export * from 'router/react:context/NavigationTypeContext'
export * from 'router/react:context/PathnameContext'
export * from 'router/react:context/UrlContext'

export * from 'router/react:hooks/useNavigation'
export * from 'router/react:hooks/useNavigate'
export * from 'router/react:hooks/useNavigationSignal'
export * from 'router/react:hooks/useNavigationType'
export * from 'router/react:hooks/usePrefetch'
export * from 'router/react:hooks/useNextMatch'
export * from 'router/react:hooks/useNavigationHandlers'
export * from 'router/react:hooks/useParams'
export * from 'router/react:hooks/useIsPending'
export * from 'router/react:hooks/usePathname'
export * from 'router/react:hooks/useSearchParams'
export * from 'router/react:hooks/useBack'
export * from 'router/react:hooks/useForward'
export * from 'router/react:hooks/useNavigationEvents'
export * from 'router/react:hooks/useActiveLinkProps'
export * from 'router/react:hooks/usePrefetchEffect'

export * from 'router/react:navigation/createMemoryNavigation'

export * from 'router/react:extractPathname'

export * from 'router/react:createRouter'

export * from 'router/react:router'

import {
  type ComponentType,
  type ReactNode,
  Suspense,
  use,
  useEffectEvent,
  useState,
  useTransition,
} from 'react'
import { type Handler } from 'router/react:router'
import { type Matcher } from 'router:matcher'
import { ParamsContext } from 'router/react:context/PropsContext'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { NavigationSignalContext } from 'router/react:context/NavigationSignalContext'
import { NavigationTypeContext } from 'router/react:context/NavigationTypeContext'
import { type Resolved } from 'router:matcher'
import { Middlewares } from 'router/react:components/Middlewares'
import { NotFound } from 'router/react:components/NotFound'
import { useNavigationHandlers } from 'router/react:hooks/useNavigationHandlers'
import { useNextMatch } from 'router/react:hooks/useNextMatch'
import { useNavigationEvents } from 'router/react:hooks/useNavigationEvents'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { TransitionContext } from 'router/react:context/TransitionContext'
import { PathnameContext } from 'router/react:context/PathnameContext'
import { extractPathname } from 'router/react:extractPathname'

/**
 * Internal state tracked alongside the resolved route match.
 * Includes the AbortSignal and navigation type from the
 * NavigateEvent that produced this match.
 */
interface CurrentState {
  /**
   * The resolved route match containing the handler
   * configuration and extracted URL parameters.
   */
  match: Resolved<Handler>

  /**
   * The AbortSignal from the NavigateEvent that produced
   * this match. Aborts when the navigation is cancelled
   * by a newer navigation or the user pressing Stop.
   * Null for the initial render before any navigation event.
   */
  signal: AbortSignal | null

  /**
   * The type of navigation that produced this match
   * (`push`, `replace`, `reload`, or `traverse`).
   * Null for the initial render before any navigation event.
   */
  navigationType: NavigationType | null

  /**
   * The pathname extracted from the destination URL for this
   * navigation. Used by descendant components to determine
   * active links and read the current location.
   */
  pathname: string
}

/**
 * Props accepted by the Router component.
 */
export interface RouterProps {
  /**
   * Route matcher instance with registered routes. When
   * omitted, falls back to the value from MatcherContext.
   */
  matcher?: Matcher<Handler>

  /**
   * Component to render when no route matches the current
   * URL. Defaults to the built-in NotFound component.
   */
  notFound?: ComponentType

  /**
   * Suspense fallback shown while lazy route components
   * or suspended middleware are loading.
   */
  fallback?: ReactNode

  /**
   * Native Navigation object override. Defaults to the value
   * from NavigationContext, which itself falls back to
   * `window.navigation`. Useful for testing or providing
   * a custom navigation instance.
   */
  navigation?: Navigation

  /**
   * Optional `useTransition()` tuple override. When omitted
   * the Router calls `useTransition()` internally. Provide
   * this when you need to read `isPending` above the Router
   * in the component tree, or to share a single transition
   * across multiple Routers.
   */
  transition?: ReturnType<typeof useTransition>

  /**
   * Callback invoked after a navigation completes successfully.
   * Fires in sync with the Navigation API's `navigatesuccess`
   * event. Wrapped in `useEffectEvent` internally so inline
   * arrow functions don't cause effect churn.
   */
  onNavigateSuccess?: () => void

  /**
   * Callback invoked when a navigation fails. Receives the
   * error from the Navigation API's `navigateerror` event.
   * Wrapped in `useEffectEvent` internally so inline arrow
   * functions don't cause effect churn.
   *
   * @param error - The error that caused the navigation
   *   to fail.
   */
  onNavigateError?: (error: unknown) => void
}

/**
 * Top-level router component that listens to the Navigation API's
 * `navigate` event, matches the destination URL against registered
 * routes, and renders the matched component inside Suspense with
 * middleware support.
 *
 * Calls `useTransition()` internally to wrap navigation state
 * updates in concurrent transitions. An optional `transition` prop
 * allows overriding this when the consuming code needs to read
 * `isPending` above the Router in the tree.
 *
 * Accepts optional `navigation` and `matcher` overrides; falls back
 * to context values when not provided. The navigation object
 * ultimately falls back to `window.navigation` when neither a prop
 * nor a context value is available.
 *
 * Provides several contexts to descendant components:
 * - `TransitionContext` — the `[isPending, startTransition]` tuple
 * - `NavigationContext` — the Navigation object
 * - `MatcherContext` — the route matcher
 * - `NavigationTypeContext` — the current navigation type
 * - `NavigationSignalContext` — the current AbortSignal
 * - `PathnameContext` — the current URL pathname
 * - `ParamsContext` — the extracted route parameters
 */
export function Router(options: RouterProps) {
  const contextNavigation = use(NavigationContext)
  const navigation: Navigation =
    options.navigation ??
    contextNavigation ??
    (typeof window !== 'undefined' ? window.navigation : undefined)!

  if (navigation === undefined || navigation === null) {
    throw new Error(
      'Router requires a navigation prop, NavigationContext provider, ' +
        'or browser Navigation API support. ' +
        'Use createMemoryNavigation() for SSR or non-browser environments.'
    )
  }
  const matcher: Matcher<Handler> = options.matcher ?? use(MatcherContext)
  const internalTransition = useTransition()
  const transition = options.transition ?? internalTransition
  const next = useNextMatch({ matcher })
  const notFound = options.notFound ?? NotFound

  const [current, setCurrent] = useState<CurrentState>(function () {
    const url = navigation.currentEntry?.url ?? null

    return {
      match: next(url, notFound),
      signal: null,
      navigationType: null,
      pathname: extractPathname(url),
    }
  })

  /**
   * Extracts navigation handler factories using the resolved
   * transition tuple directly, bypassing TransitionContext.
   * This is necessary because Router provides TransitionContext
   * in its JSX return, which hasn't rendered at this point.
   */
  const { createPrecommitHandler, createHandler } = useNavigationHandlers(transition)

  /**
   * Central navigate event handler. Intercepts all same-document
   * navigations including link clicks, form submissions,
   * back/forward buttons, and programmatic navigation.
   *
   * Skips non-interceptable navigations, hash-only changes,
   * and download requests. For form submissions with a dedicated
   * `formHandler`, delegates to that handler instead of the
   * normal component render flow.
   */
  const onNavigate = useEffectEvent(function (event: NavigateEvent) {
    if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) {
      return
    }

    const match = next(event.destination.url, notFound)

    if (event.formData !== null && match.handler.formHandler !== undefined) {
      event.intercept({
        scroll: match.handler.scroll,
        focusReset: match.handler.focusReset,
        async handler() {
          await match.handler.formHandler!(event.formData!, event)
        },
      })

      return
    }

    const precommitHandler = createPrecommitHandler({
      prefetch: match.handler.prefetch,
      params: match.params,
      url: new URL(event.destination.url),
    })

    const handler = createHandler(function () {
      setCurrent({
        match,
        signal: event.signal,
        navigationType: event.navigationType,
        pathname: extractPathname(event.destination.url),
      })
    })

    event.intercept({
      handler,
      precommitHandler,
      scroll: match.handler.scroll,
      focusReset: match.handler.focusReset,
    })
  })

  useNavigationEvents(navigation, {
    onNavigate,
    onNavigateSuccess: options.onNavigateSuccess,
    onNavigateError: options.onNavigateError,
  })

  const CurrentComponent = current.match.handler.component
  const middlewares = current.match.handler.middlewares

  return (
    <TransitionContext value={transition}>
      <NavigationContext value={navigation}>
        <MatcherContext value={matcher}>
          <NavigationTypeContext value={current.navigationType}>
            <NavigationSignalContext value={current.signal}>
              <PathnameContext value={current.pathname}>
                <ParamsContext value={current.match.params}>
                  <Suspense fallback={options.fallback}>
                    <Middlewares value={middlewares}>
                      <CurrentComponent />
                    </Middlewares>
                  </Suspense>
                </ParamsContext>
              </PathnameContext>
            </NavigationSignalContext>
          </NavigationTypeContext>
        </MatcherContext>
      </NavigationContext>
    </TransitionContext>
  )
}

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
import { ParamsContext } from 'router/react:context/ParamsContext'
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
import { UrlContext } from 'router/react:context/UrlContext'
import { extractPathname } from 'router/react:extractPathname'
import { runPrefetch } from '../runPrefetch'

/**
 * Maximum redirect hops within one navigate event. A fixed bound prevents
 * dynamic redirects from creating an infinite chain of distinct URLs.
 */
const MAX_REDIRECTS = 20

/**
 * Preserves the prefetch context shape when the browser cannot delay commit.
 * Unlike hover prefetch, navigation must not silently ignore redirect or
 * handler-registration requests: neither operation is valid after commit.
 */
const postcommitController: NavigationPrecommitController = {
  /**
   * Rejects redirects because the destination has already committed.
   * The rejection propagates through the intercepted navigation promise.
   */
  redirect() {
    throw new DOMException('cannot redirect after navigation commit', 'InvalidStateError')
  },
  /**
   * Rejects precommit-only handler registration rather than dropping work.
   * Prefetch should await its own work on this post-commit path instead.
   */
  addHandler() {
    throw new DOMException(
      'cannot add a precommit handler after navigation commit',
      'InvalidStateError'
    )
  },
}

/**
 * Internal state tracked alongside the resolved route match.
 * Includes the AbortSignal and navigation type from the
 * NavigateEvent that produced this match.
 */
interface CurrentState {
  /**
   * Pending initial check, retained above Suspense so retries do not restart
   * it. Navigation matches omit this because their checks already completed.
   */
  initialCheck?: Promise<void>

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

  /**
   * The full destination URL string for this navigation.
   * Used by `useSearchParams` to derive search parameters
   * from React state rather than reading the mutable
   * `navigation.currentEntry` during render.
   */
  url: string | null
}

/**
 * Waits for an asynchronous initial check inside the Router's Suspense
 * boundary, before rendering middleware or route content. Rejections reach
 * the application's error boundary; synchronous checks run in initialization.
 */
function InitialGuard(props: { check?: Promise<void>; children: ReactNode }) {
  if (props.check !== undefined) {
    use(props.check)
  }

  return props.children
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
 * POST form submissions remain native browser navigations unless
 * the destination route explicitly provides a `formHandler`.
 * GET forms follow the normal route rendering flow.
 *
 * Provides several contexts to descendant components:
 * - `TransitionContext` — the `[isPending, startTransition]` tuple
 * - `NavigationContext` — the Navigation object
 * - `MatcherContext` — the route matcher
 * - `NavigationTypeContext` — the current navigation type
 * - `NavigationSignalContext` — the current AbortSignal
 * - `PathnameContext` — the current URL pathname
 * - `ParamsContext` — the extracted route parameters
 *
 * Mandatory route guards run before initial content, including SSR. Async
 * initial guards show `fallback`; rejected checks reach an ancestor error
 * boundary (or the SSR host). Checks must be idempotent because React can
 * repeat initialization, including under StrictMode. Initial prefetch is
 * deliberately not executed: move access checks to `.guard()` instead.
 *
 * @example
 * ```tsx
 * const matcher = createRouter(route => {
 *   route('/private').guard(requireSession).render(PrivatePage)
 * })
 * <Router matcher={matcher} fallback={<p>Checking access…</p>} />
 * ```
 *
 * Redirect destinations are matched and prefetched before commit. Repeated
 * URLs or chains exceeding 20 redirects reject the navigation. Scroll and
 * focus options remain those of the first route: the Navigation API only
 * permits intercept options to be set during event dispatch.
 *
 * Noncancelable, interceptable events run guards then prefetch after URL
 * commit and before the React update. Rejection fails the handler without
 * rolling back the committed URL or updating the route. Their prefetch
 * controller rejects `redirect()` and `addHandler()` with InvalidStateError.
 * Native redirects also reject during traverse/reload, even if cancelable;
 * this Router does not emulate redirects with a second navigation.
 * A redirected custom form renders the checked destination without executing
 * either the abandoned action or a destination action with the original body.
 * See the HTML Standard's NavigateEvent.intercept() restrictions:
 * https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-navigateevent-intercept
 *
 * @example
 * ```tsx
 * import { createRoot } from 'react-dom/client'
 * import { createMatcher } from '@studiolambda/router'
 * import { Router, type Handler } from '@studiolambda/router/react'
 *
 * const matcher = createMatcher<Handler>()
 * matcher.register('/', { component: () => <form method="post" action="/server-post" /> })
 * // The browser submits this form because /server-post has no formHandler.
 * const container = document.createElement('div')
 * document.body.appendChild(container)
 * createRoot(container).render(<Router matcher={matcher} />)
 * ```
 */
export function Router(props: RouterProps) {
  const contextNavigation = use(NavigationContext)
  const navigation: Navigation =
    props.navigation ??
    contextNavigation ??
    (typeof window !== 'undefined' ? window.navigation : undefined)!

  if (navigation === undefined || navigation === null) {
    throw new Error(
      'Router requires a navigation prop, NavigationContext provider, ' +
        'or browser Navigation API support. ' +
        'Use createMemoryNavigation() for SSR or non-browser environments.'
    )
  }
  const matcher: Matcher<Handler> = props.matcher ?? use(MatcherContext)
  const internalTransition = useTransition()
  const transition = props.transition ?? internalTransition
  const next = useNextMatch({ matcher })
  const notFound = props.notFound ?? NotFound

  const [current, setCurrent] = useState<CurrentState>(function () {
    const url = navigation.currentEntry?.url ?? null
    const match = next(url, notFound)
    /**
     * A real URL is available from browser/memory navigation. Match the
     * existing root fallback when an implementation has no current entry.
     */
    const check = match.handler.guard?.({
      params: match.params,
      url: new URL(url ?? '/', 'http://localhost'),
    })

    /**
     * StrictMode may discard an initializer result. Observe its rejection
     * even in that case; the retained original promise still rejects through
     * React's use() and reaches the error boundary, never granting access.
     */
    check?.catch(() => {})

    return {
      match,
      initialCheck: check ?? undefined,
      signal: null,
      navigationType: null,
      pathname: extractPathname(url),
      url,
    }
  })

  /**
   * Extracts navigation handler factories using the resolved
   * transition tuple directly, bypassing TransitionContext.
   * This is necessary because Router provides TransitionContext
   * in its JSX return, which hasn't rendered at this point.
   */
  const { createHandler } = useNavigationHandlers(transition)

  /**
   * Central navigate event handler. Intercepts eligible
   * navigations including link clicks, opted-in POST submissions,
   * back/forward buttons, and programmatic navigation.
   *
   * Skips non-interceptable navigations, hash-only changes,
   * and download requests. For form submissions with a dedicated
   * `formHandler`, delegates to that handler instead of the
   * normal component render flow. Leaves other POST submissions
   * untouched so the browser sends their bodies to the server.
   */
  const onNavigate = useEffectEvent(function (event: NavigateEvent) {
    if (!event.canIntercept || event.hashChange || event.downloadRequest !== null) {
      return
    }

    /** Original URL owns a form body; redirects must never forward it. */
    const initialUrl = event.destination.url
    /** Original route supplies an action only while its URL is unchanged. */
    const initialMatch = next(initialUrl, notFound)
    /** Final render match, replaced as redirects are processed in precommit. */
    let match = initialMatch
    /** Native POST ownership is decided before running any route checks. */
    if (event.formData !== null && initialMatch.handler.formHandler === undefined) {
      return
    }

    /**
     * Follows mutations of this event's destination, not new navigate events.
     * Each destination runs its own guards before any React state is updated.
     * The hop bound also catches dynamic loops that generate unique URLs.
     */
    async function precommitHandler(controller: NavigationPrecommitController) {
      /** Full URLs already processed, including query and fragment. */
      const visited = new Set<string>()

      for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        /** Snapshot used for this route's params and prefetch context. */
        const url = event.destination.url

        if (visited.has(url)) {
          throw new Error(`redirect cycle detected: ${url}`)
        }

        visited.add(url)
        /** Shared destination snapshot for its guard and subsequent preload. */
        const context = { params: match.params, url: new URL(url) }

        if (match.handler.guard !== undefined) {
          await match.handler.guard(context)
        }

        /** True even for a redirect back to the same destination URL. */
        const hasRedirected = await runPrefetch(match.handler.prefetch, {
          ...context,
          controller,
        })

        if (!hasRedirected) return

        match = next(event.destination.url, notFound)
      }

      throw new Error(`redirect limit exceeded: maximum ${MAX_REDIRECTS} redirects`)
    }

    const handler = createHandler(async function () {
      if (event.formData !== null && event.destination.url === initialUrl) {
        await initialMatch.handler.formHandler!(event.formData, event)
        return
      }

      setCurrent({
        match,
        signal: event.signal,
        navigationType: event.navigationType,
        pathname: extractPathname(event.destination.url),
        url: event.destination.url,
      })
    })

    /** Both kinds of checks obey the same native precommit restrictions. */
    const checks = initialMatch.handler.guard ?? initialMatch.handler.prefetch

    if (!event.cancelable && checks !== undefined) {
      event.intercept({
        async handler() {
          await precommitHandler(postcommitController)
          await handler()
        },
        scroll: match.handler.scroll,
        focusReset: match.handler.focusReset,
      })

      return
    }

    event.intercept({
      handler,
      precommitHandler: checks === undefined ? undefined : precommitHandler,
      scroll: match.handler.scroll,
      focusReset: match.handler.focusReset,
    })
  })

  useNavigationEvents(navigation, {
    onNavigate,
    onNavigateSuccess: props.onNavigateSuccess,
    onNavigateError: props.onNavigateError,
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
                <UrlContext value={current.url}>
                  <ParamsContext value={current.match.params}>
                    <Suspense fallback={props.fallback}>
                      <InitialGuard check={current.initialCheck}>
                        <Middlewares value={middlewares}>
                          <CurrentComponent />
                        </Middlewares>
                      </InitialGuard>
                    </Suspense>
                  </ParamsContext>
                </UrlContext>
              </PathnameContext>
            </NavigationSignalContext>
          </NavigationTypeContext>
        </MatcherContext>
      </NavigationContext>
    </TransitionContext>
  )
}

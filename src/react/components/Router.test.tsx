import { describe, it, vi } from 'vitest'
import { type ComponentType, createElement, type ReactNode, use } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { Router } from './Router'
import { createMatcher } from 'router:matcher'
import { type Handler } from 'router/react:router'
import { PathnameContext } from 'router/react:context/PathnameContext'
import { ParamsContext } from 'router/react:context/PropsContext'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { TransitionContext } from 'router/react:context/TransitionContext'

/**
 * Creates a mock Navigation backed by a real EventTarget so
 * that event dispatch and listener management work natively.
 * The `currentEntry.url` returns the provided initial URL.
 */
function createTestNavigation(url: string): Navigation & EventTarget {
  const target = new EventTarget()

  const entry = {
    url,
    key: 'test-key',
    id: 'test-id',
    index: 0,
    sameDocument: true,
    getState: function () { return undefined },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ondispose: null,
  } as unknown as NavigationHistoryEntry

  return Object.assign(target, {
    currentEntry: entry,
    canGoBack: false,
    canGoForward: false,
    transition: null,
    navigate: vi.fn(function () {
      return {
        committed: Promise.resolve(entry),
        finished: Promise.resolve(entry),
      }
    }),
    entries: vi.fn(function () { return [entry] }),
    back: vi.fn(),
    forward: vi.fn(),
    traverseTo: vi.fn(),
    updateCurrentEntry: vi.fn(),
    activation: null,
  }) as unknown as Navigation & EventTarget
}

/**
 * Renders a Router with the given props inside a container and
 * returns the container and cleanup function. Handles the full
 * act() lifecycle.
 */
function renderRouter(options: {
  url?: string
  matcher?: ReturnType<typeof createMatcher<Handler>>
  notFound?: ComponentType
  fallback?: ReactNode
  transition?: [boolean, (cb: () => void) => void]
  onNavigateSuccess?: () => void
  onNavigateError?: (error: unknown) => void
}) {
  const url = options.url ?? 'https://example.com/'
  const navigation = createTestNavigation(url)
  const matcher = options.matcher ?? createMatcher<Handler>()
  const container = document.createElement('div')

  document.body.appendChild(container)

  const root = createRoot(container)

  act(function () {
    root.render(
      createElement(Router, {
        navigation,
        matcher,
        notFound: options.notFound,
        fallback: options.fallback,
        transition: options.transition,
        onNavigateSuccess: options.onNavigateSuccess,
        onNavigateError: options.onNavigateError,
      }),
    )
  })

  return {
    container,
    navigation,
    unmount() {
      act(function () {
        root.unmount()
      })

      container.remove()
    },
  }
}

describe('Router', { concurrent: true }, function () {
  it('renders the matched route component for the initial URL', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Home page component that renders identifiable text.
     */
    function HomePage() {
      return createElement('div', null, 'Home Page')
    }

    matcher.register('/', { component: HomePage })

    const { container, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    expect(container.textContent).toBe('Home Page')
  })

  it('renders the notFound component when no route matches', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    const { container, unmount } = renderRouter({
      url: 'https://example.com/nonexistent',
      matcher,
    })

    onTestFinished(unmount)

    expect(container.textContent).toBe('Not Found')
  })

  it('renders a custom notFound component when provided', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Custom 404 component with identifiable text.
     */
    function Custom404() {
      return createElement('div', null, '404 Custom')
    }

    const { container, unmount } = renderRouter({
      url: 'https://example.com/missing',
      matcher,
      notFound: Custom404,
    })

    onTestFinished(unmount)

    expect(container.textContent).toBe('404 Custom')
  })

  it('provides ParamsContext to route components', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    let capturedParams: Record<string, string> = {}

    /**
     * Component that reads and captures route params
     * from context for assertion.
     */
    function UserPage() {
      capturedParams = use(ParamsContext)

      return createElement('div', null, 'User')
    }

    matcher.register('/user/:id', { component: UserPage })

    const { container, unmount } = renderRouter({
      url: 'https://example.com/user/42',
      matcher,
    })

    onTestFinished(unmount)

    expect(container.textContent).toBe('User')
    expect(capturedParams).toEqual({ id: '42' })
  })

  it('provides PathnameContext to route components', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    let capturedPathname = ''

    /**
     * Component that reads the pathname from context
     * for assertion.
     */
    function AboutPage() {
      capturedPathname = use(PathnameContext)

      return createElement('div', null, 'About')
    }

    matcher.register('/about', { component: AboutPage })

    const { container, unmount } = renderRouter({
      url: 'https://example.com/about',
      matcher,
    })

    onTestFinished(unmount)

    expect(container.textContent).toBe('About')
    expect(capturedPathname).toBe('/about')
  })

  it('provides NavigationContext to descendant components', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    let capturedNav: Navigation | null = null

    /**
     * Component that reads the navigation object from
     * context for assertion.
     */
    function NavPage() {
      capturedNav = use(NavigationContext)

      return createElement('div', null, 'Nav')
    }

    matcher.register('/', { component: NavPage })

    const { navigation, container, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    expect(container.textContent).toBe('Nav')
    expect(capturedNav).toBe(navigation)
  })

  it('provides TransitionContext to descendant components', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    let capturedTransition: ReturnType<typeof import('react').useTransition> | null = null

    /**
     * Component that reads the transition tuple from
     * context for assertion.
     */
    function TransitionPage() {
      capturedTransition = use(TransitionContext)

      return createElement('div', null, 'Transition')
    }

    matcher.register('/', { component: TransitionPage })

    const { container, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    expect(container.textContent).toBe('Transition')
    expect(capturedTransition).not.toBeNull()
    expect(Array.isArray(capturedTransition)).toBe(true)
    expect(typeof capturedTransition![0]).toBe('boolean')
    expect(typeof capturedTransition![1]).toBe('function')
  })

  it('wraps the route component with middlewares', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Middleware that wraps children in a section element
     * with an identifiable attribute.
     */
    function AuthMiddleware({ children }: { children: ReactNode }) {
      return createElement('section', { 'data-testid': 'auth' }, children)
    }

    /**
     * Protected page content rendered inside the middleware.
     */
    function ProtectedPage() {
      return createElement('div', null, 'Protected')
    }

    matcher.register('/', {
      component: ProtectedPage,
      middlewares: [AuthMiddleware],
    })

    const { container, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    const auth = container.querySelector('[data-testid="auth"]')

    expect(auth).not.toBeNull()
    expect(auth?.textContent).toBe('Protected')
  })

  it('intercepts navigate events and updates the rendered route', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Home page component.
     */
    function Home() {
      return createElement('div', null, 'Home')
    }

    /**
     * About page component.
     */
    function About() {
      return createElement('div', null, 'About')
    }

    matcher.register('/', { component: Home })
    matcher.register('/about', { component: About })

    const url = 'https://example.com/'
    const navigation = createTestNavigation(url)
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)

    /**
     * Custom transition tuple that invokes the callback
     * synchronously. This avoids the need for async act()
     * which interferes with concurrent tests by holding
     * React's global scheduler open. The Router uses this
     * tuple instead of calling useTransition() internally.
     */
    const transition: [boolean, (cb: () => void) => void] = [
      false,
      function (cb) { cb() },
    ]

    act(function () {
      root.render(
        createElement(Router, { navigation, matcher, transition }),
      )
    })

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    expect(container.textContent).toBe('Home')

    /**
     * Simulates a NavigateEvent dispatched by the Navigation
     * API when the user navigates. The Router's onNavigate
     * handler will call event.intercept() with handler and
     * precommitHandler functions that we capture and invoke.
     */
    const interceptOptions: { handler?: () => Promise<void>, precommitHandler?: Function } = {}

    act(function () {
      const event = {
        canIntercept: true,
        hashChange: false,
        downloadRequest: null,
        formData: null,
        destination: { url: 'https://example.com/about' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: vi.fn(function (opts: typeof interceptOptions) {
          interceptOptions.handler = opts.handler
          interceptOptions.precommitHandler = opts.precommitHandler
        }),
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))

      expect(interceptOptions.handler).toBeDefined()

      /**
       * Invoke the handler inside the same act() block.
       * Because we injected a synchronous startTransition,
       * the state update (setCurrent) fires immediately,
       * and act() flushes React's render synchronously.
       */
      void interceptOptions.handler!()
    })

    expect(container.textContent).toBe('About')
  })

  it('skips non-interceptable navigations', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Page component for the non-interceptable test.
     */
    function Page() {
      return createElement('div', null, 'Page')
    }

    matcher.register('/', { component: Page })

    const { container, navigation, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    act(function () {
      const event = {
        canIntercept: false,
        hashChange: false,
        downloadRequest: null,
        formData: null,
        destination: { url: 'https://other.com/page' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: vi.fn(),
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))
    })

    expect(container.textContent).toBe('Page')
  })

  it('skips hash-only navigations', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Page component for the hash change test.
     */
    function Page() {
      return createElement('div', null, 'Page')
    }

    matcher.register('/', { component: Page })

    const { navigation, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    act(function () {
      const event = {
        canIntercept: true,
        hashChange: true,
        downloadRequest: null,
        formData: null,
        destination: { url: 'https://example.com/#section' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: vi.fn(),
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))

      expect(event.intercept).not.toHaveBeenCalled()
    })
  })

  it('skips download request navigations', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Page component for the download request test.
     */
    function Page() {
      return createElement('div', null, 'Page')
    }

    matcher.register('/', { component: Page })

    const { navigation, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    act(function () {
      const event = {
        canIntercept: true,
        hashChange: false,
        downloadRequest: 'file.pdf',
        formData: null,
        destination: { url: 'https://example.com/file.pdf' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: vi.fn(),
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))

      expect(event.intercept).not.toHaveBeenCalled()
    })
  })

  it('calls precommitHandler with prefetch when route has prefetch', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const prefetchSpy = vi.fn()

    /**
     * Page with prefetch enabled for testing precommit flow.
     */
    function PrefetchPage() {
      return createElement('div', null, 'Prefetch')
    }

    matcher.register('/prefetch', {
      component: PrefetchPage,
      prefetch: prefetchSpy,
    })
    matcher.register('/', { component: PrefetchPage })

    const { navigation, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    act(function () {
      const interceptOptions: { precommitHandler?: (controller: unknown) => Promise<void> } = {}

      const event = {
        canIntercept: true,
        hashChange: false,
        downloadRequest: null,
        formData: null,
        destination: { url: 'https://example.com/prefetch' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: vi.fn(function (opts: typeof interceptOptions) {
          interceptOptions.precommitHandler = opts.precommitHandler
        }),
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))

      expect(event.intercept).toHaveBeenCalled()
      expect(typeof interceptOptions.precommitHandler).toBe('function')
    })
  })

  it('handles form submissions with a dedicated formHandler', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const formHandlerSpy = vi.fn()

    /**
     * Form page component.
     */
    function FormPage() {
      return createElement('div', null, 'Form')
    }

    matcher.register('/submit', {
      component: FormPage,
      formHandler: formHandlerSpy,
    })
    matcher.register('/', { component: FormPage })

    const { navigation, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    act(function () {
      const interceptOptions: { handler?: () => Promise<void> } = {}
      const formData = new FormData()

      formData.set('name', 'test')

      const event = {
        canIntercept: true,
        hashChange: false,
        downloadRequest: null,
        formData,
        destination: { url: 'https://example.com/submit' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: vi.fn(function (opts: typeof interceptOptions) {
          interceptOptions.handler = opts.handler
        }),
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))

      expect(event.intercept).toHaveBeenCalled()

      if (interceptOptions.handler) {
        void interceptOptions.handler()
      }
    })

    expect(formHandlerSpy).toHaveBeenCalledTimes(1)
    expect(formHandlerSpy.mock.calls[0][0]).toBeInstanceOf(FormData)
  })

  it('fires onNavigateSuccess callback', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const onNavigateSuccess = vi.fn()

    /**
     * Simple page for the success callback test.
     */
    function Page() {
      return createElement('div', null, 'Page')
    }

    matcher.register('/', { component: Page })

    const { navigation, unmount } = renderRouter({
      matcher,
      onNavigateSuccess,
    })

    onTestFinished(unmount)

    act(function () {
      navigation.dispatchEvent(new Event('navigatesuccess'))
    })

    expect(onNavigateSuccess).toHaveBeenCalledTimes(1)
  })

  it('fires onNavigateError callback with the error', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const onNavigateError = vi.fn()

    /**
     * Simple page for the error callback test.
     */
    function Page() {
      return createElement('div', null, 'Page')
    }

    matcher.register('/', { component: Page })

    const { navigation, unmount } = renderRouter({
      matcher,
      onNavigateError,
    })

    onTestFinished(unmount)

    act(function () {
      navigation.dispatchEvent(
        new ErrorEvent('navigateerror', { error: new Error('fail') }),
      )
    })

    expect(onNavigateError).toHaveBeenCalledTimes(1)
    expect(onNavigateError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('passes scroll and focusReset options to event.intercept', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    /**
     * Page with custom scroll and focus reset behavior.
     */
    function ScrollPage() {
      return createElement('div', null, 'Scroll')
    }

    matcher.register('/scroll', {
      component: ScrollPage,
      scroll: 'manual',
      focusReset: 'manual',
    })
    matcher.register('/', { component: ScrollPage })

    const { navigation, unmount } = renderRouter({ matcher })

    onTestFinished(unmount)

    act(function () {
      const interceptSpy = vi.fn()

      const event = {
        canIntercept: true,
        hashChange: false,
        downloadRequest: null,
        formData: null,
        destination: { url: 'https://example.com/scroll' },
        signal: new AbortController().signal,
        navigationType: 'push' as NavigationType,
        intercept: interceptSpy,
      }

      navigation.dispatchEvent(Object.assign(new Event('navigate'), event))

      expect(interceptSpy).toHaveBeenCalled()

      const interceptArgs = interceptSpy.mock.calls[0][0]

      expect(interceptArgs.scroll).toBe('manual')
      expect(interceptArgs.focusReset).toBe('manual')
    })
  })

  it('extracts pathname from initial URL with query and hash', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    let capturedPathname = ''

    /**
     * Component that captures the pathname context value.
     */
    function SearchPage() {
      capturedPathname = use(PathnameContext)

      return createElement('div', null, 'Search')
    }

    matcher.register('/search', { component: SearchPage })

    const { container, unmount } = renderRouter({
      url: 'https://example.com/search?q=hello#results',
      matcher,
    })

    onTestFinished(unmount)

    expect(container.textContent).toBe('Search')
    expect(capturedPathname).toBe('/search')
  })

  it('uses the provided transition prop instead of internal useTransition', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    let capturedTransition: ReturnType<typeof import('react').useTransition> | null = null

    /**
     * Component that reads the transition tuple from context
     * to verify it matches the injected prop value.
     */
    function TransitionTestPage() {
      capturedTransition = use(TransitionContext)

      return createElement('div', null, 'Content')
    }

    matcher.register('/', { component: TransitionTestPage })

    /**
     * Custom transition tuple injected via the transition prop.
     * The isPending value is set to true so we can distinguish
     * it from the internal useTransition which starts as false.
     */
    const customTransition: [boolean, (cb: () => void) => void] = [
      true,
      function (_cb) {},
    ]

    const { container, unmount } = renderRouter({
      matcher,
      transition: customTransition,
    })

    onTestFinished(unmount)

    expect(container.textContent).toBe('Content')
    expect(capturedTransition).not.toBeNull()
    expect(capturedTransition![0]).toBe(true)
  })
})

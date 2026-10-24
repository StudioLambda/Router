import { act, createElement, use } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { createMatcher } from 'router:matcher'
import { type Handler, type PrefetchFunc } from 'router/react:router'
import { ParamsContext } from 'router/react:context/ParamsContext'
import { PathnameContext } from 'router/react:context/PathnameContext'
import { UrlContext } from 'router/react:context/UrlContext'
import { NavigationSignalContext } from 'router/react:context/NavigationSignalContext'
import { NavigationTypeContext } from 'router/react:context/NavigationTypeContext'
import { Router } from './Router'

/**
 * Creates a strict browser event double. In particular, interceptability
 * does not imply cancelability, and a forbidden precommit callback throws
 * synchronously rather than hiding the browser capability error.
 */
function createNavigateEvent(options: {
  cancelable: boolean
  navigationType: NavigationType
  formData?: FormData
}) {
  const event = new Event('navigate', { cancelable: options.cancelable })
  const intercept = vi.fn((interceptOptions: NavigationInterceptOptions) => {
    if (!event.cancelable && interceptOptions.precommitHandler !== undefined) {
      throw new DOMException('precommit requires cancelability', 'InvalidStateError')
    }
  })

  return Object.assign(event, {
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
    formData: options.formData ?? null,
    destination: { url: 'https://example.com/user/42?tab=profile' },
    signal: new AbortController().signal,
    navigationType: options.navigationType,
    intercept,
  })
}

/**
 * Mounts two routes against an EventTarget-backed navigation double.
 * Tests explicitly commit the mutable entry before invoking the captured
 * post-commit handler, so prefetch can observe the browser's URL ordering.
 */
function renderHistoryRouter(prefetch: PrefetchFunc) {
  const entry = { url: 'https://example.com/' }
  const navigation = Object.assign(new EventTarget(), {
    currentEntry: entry,
  }) as unknown as Navigation
  const matcher = createMatcher<Handler>()
  const container = document.createElement('div')

  /**
   * Identifies the unchanged initial route while async prefetch is pending.
   * No initial prefetch is needed for these navigation capability tests.
   */
  function Home() {
    return 'Home'
  }

  /**
   * Renders all destination contexts to detect stale route state after
   * traversal, including params, URL, navigation type, and event signal.
   */
  function User() {
    return JSON.stringify({
      params: use(ParamsContext),
      pathname: use(PathnameContext),
      url: use(UrlContext),
      navigationType: use(NavigationTypeContext),
      hasSignal: use(NavigationSignalContext) !== null,
    })
  }

  matcher.register('/', { component: Home })
  matcher.register('/user/:id', {
    component: User,
    prefetch,
    scroll: 'manual',
    focusReset: 'manual',
  })

  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(createElement(Router, { matcher, navigation })))

  return {
    navigation,
    entry,
    container,
    /**
     * Unmounts the root and removes the test DOM even when an assertion
     * fails. Registered with Vitest's per-test cleanup callback.
     */
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe('Router history navigation capabilities', () => {
  it('leaves noncancelable POSTs to prefetched routes with the browser', ({ onTestFinished }) => {
    const prefetch = vi.fn()
    const view = renderHistoryRouter(prefetch)
    onTestFinished(view.unmount)
    const formData = new FormData()
    formData.set('message', 'send to the server')
    const event = createNavigateEvent({
      cancelable: false,
      navigationType: 'push',
      formData,
    })

    act(() => {
      view.navigation.dispatchEvent(event)
    })

    expect(event.intercept).not.toHaveBeenCalled()
    expect(prefetch).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    expect(event.formData?.get('message')).toBe('send to the server')
    expect(view.container.textContent).toBe('Home')
  })

  it('awaits noncancelable traversal prefetch after commit before updating contexts', async ({
    onTestFinished,
  }) => {
    const pending = Promise.withResolvers<void>()
    const prefetch = vi.fn<PrefetchFunc>(async (context) => {
      expect(view.entry.url).toBe('https://example.com/user/42?tab=profile')
      expect(context.params).toEqual({ id: '42' })
      expect(context.url.href).toBe('https://example.com/user/42?tab=profile')
      await pending.promise
    })
    const view = renderHistoryRouter(prefetch)
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: false, navigationType: 'traverse' })

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    const options = event.intercept.mock.calls[0][0]
    expect(options).not.toHaveProperty('precommitHandler')
    expect(options.scroll).toBe('manual')
    expect(options.focusReset).toBe('manual')
    expect(prefetch).not.toHaveBeenCalled()

    view.entry.url = event.destination.url
    const handled = options.handler!()
    expect(prefetch).toHaveBeenCalledOnce()
    expect(view.container.textContent).toBe('Home')

    await act(async () => {
      pending.resolve()
      await handled
    })
    expect(view.container.textContent).toBe(
      JSON.stringify({
        params: { id: '42' },
        pathname: '/user/42',
        url: 'https://example.com/user/42?tab=profile',
        navigationType: 'traverse',
        hasSignal: true,
      })
    )
  })

  it('keeps cancelable push prefetch before commit with the native controller', async ({
    onTestFinished,
  }) => {
    const prefetch = vi.fn()
    const view = renderHistoryRouter(prefetch)
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: true, navigationType: 'push' })
    const controller = { redirect: vi.fn(), addHandler: vi.fn() }

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    const options = event.intercept.mock.calls[0][0]
    await options.precommitHandler!(controller)
    expect(view.entry.url).toBe('https://example.com/')
    expect(view.container.textContent).toBe('Home')
    expect(prefetch).toHaveBeenCalledWith({
      params: { id: '42' },
      url: new URL('https://example.com/user/42?tab=profile'),
      controller,
    })

    view.entry.url = event.destination.url
    await act(async () => {
      await options.handler!()
    })
    expect(view.container.textContent).toContain('"navigationType":"push"')
  })

  it('propagates post-commit prefetch rejection without updating the route', async ({
    onTestFinished,
  }) => {
    const error = new Error('prefetch failed')
    const view = renderHistoryRouter(vi.fn().mockRejectedValue(error))
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: false, navigationType: 'traverse' })

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    view.entry.url = event.destination.url
    await expect(event.intercept.mock.calls[0][0].handler!()).rejects.toBe(error)
    expect(view.container.textContent).toBe('Home')
    expect(view.entry.url).toBe('https://example.com/user/42?tab=profile')
  })

  it('rejects post-commit redirects instead of silently pretending to redirect', async ({
    onTestFinished,
  }) => {
    const view = renderHistoryRouter(({ controller }) => controller.redirect('/login'))
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: false, navigationType: 'traverse' })

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    view.entry.url = event.destination.url
    await expect(event.intercept.mock.calls[0][0].handler!()).rejects.toMatchObject({
      name: 'InvalidStateError',
      message: 'cannot redirect after navigation commit',
    })
    expect(view.entry.url).toBe(event.destination.url)
    expect(view.container.textContent).toBe('Home')
  })

  it('rejects precommit-only handler registration after commit', async ({ onTestFinished }) => {
    const extraHandler = vi.fn()
    const view = renderHistoryRouter(({ controller }) => controller.addHandler(extraHandler))
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: false, navigationType: 'traverse' })

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    view.entry.url = event.destination.url
    await expect(event.intercept.mock.calls[0][0].handler!()).rejects.toMatchObject({
      name: 'InvalidStateError',
    })
    expect(extraHandler).not.toHaveBeenCalled()
    expect(view.container.textContent).toBe('Home')
  })

  it('does not mask native redirect rejection for cancelable traversals', async ({
    onTestFinished,
  }) => {
    const view = renderHistoryRouter(({ controller }) => controller.redirect('/login'))
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: true, navigationType: 'traverse' })
    const error = new DOMException('cannot redirect a traversal', 'InvalidStateError')
    const controller = {
      redirect: vi.fn(() => {
        throw error
      }),
      addHandler: vi.fn(),
    }

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    await expect(event.intercept.mock.calls[0][0].precommitHandler!(controller)).rejects.toBe(error)
    expect(controller.redirect).toHaveBeenCalledWith('/login')
    expect(view.entry.url).toBe('https://example.com/')
    expect(view.container.textContent).toBe('Home')
  })

  it('does not mask native redirect rejection for cancelable reloads', async ({
    onTestFinished,
  }) => {
    const view = renderHistoryRouter(({ controller }) => controller.redirect('/login'))
    onTestFinished(view.unmount)
    const event = createNavigateEvent({ cancelable: true, navigationType: 'reload' })
    const error = new DOMException('cannot redirect a reload', 'InvalidStateError')
    const controller = {
      redirect: vi.fn(() => {
        throw error
      }),
      addHandler: vi.fn(),
    }

    act(() => {
      view.navigation.dispatchEvent(event)
    })
    await expect(event.intercept.mock.calls[0][0].precommitHandler!(controller)).rejects.toBe(error)
    expect(controller.redirect).toHaveBeenCalledWith('/login')
    expect(view.entry.url).toBe('https://example.com/')
    expect(view.container.textContent).toBe('Home')
  })
})

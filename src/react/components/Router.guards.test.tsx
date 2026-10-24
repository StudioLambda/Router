import { describe, expect, it, vi } from 'vitest'
import { act, Component, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToReadableStream, renderToString } from 'react-dom/server'
import { Router } from './Router'
import { createRouter } from 'router/react:createRouter'
import { createMemoryNavigation } from 'router/react:navigation/createMemoryNavigation'
import { usePrefetch } from 'router/react:hooks/usePrefetch'
import { renderHook } from 'router/react:test-helpers'

/**
 * Captures initial guard errors without letting React log expected failures.
 * Its fallback is distinguishable from both protected content and Suspense.
 */
class GuardBoundary extends Component<{ children: ReactNode }> {
  /** Tracks denial only; the actual error is asserted through guard spies. */
  state = { isDenied: false }

  /** Converts a rejected check into a deterministic error fallback. */
  static getDerivedStateFromError() {
    return { isDenied: true }
  }

  /** Renders children only until an initial check fails. */
  render() {
    return this.state.isDenied ? 'Denied' : this.props.children
  }
}

/**
 * Mounts arbitrary router markup and exposes explicit cleanup. The caller
 * owns act() around asynchronous resolution and cleanup registration.
 */
async function mount(element: ReactNode) {
  const container = document.createElement('div')
  const root = createRoot(container, { onCaughtError: () => {} })
  await act(async () => root.render(element))

  return {
    container,
    unmount() {
      act(() => root.unmount())
    },
  }
}

/**
 * Adds event dispatch to the memory navigation used in tests, then captures
 * the real Router's intercept options. The returned runner models the native
 * precommit-before-handler ordering and propagates rejection to the caller.
 */
function navigationAttempt(options: { url: string; formData: FormData | null }) {
  const target = new EventTarget()
  const navigation = Object.assign(createMemoryNavigation({ url: 'https://example.com/' }), {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  })

  return {
    navigation,
    async run() {
      let interception: NavigationInterceptOptions | undefined
      const event = Object.assign(new Event('navigate', { cancelable: true }), {
        canIntercept: true,
        hashChange: false,
        downloadRequest: null,
        formData: options.formData,
        destination: { url: options.url },
        signal: new AbortController().signal,
        navigationType: 'push',
        intercept(value: NavigationInterceptOptions) {
          interception = value
        },
      })
      target.dispatchEvent(event)
      if (interception === undefined) throw new Error('expected interception')
      await interception.precommitHandler?.({ redirect: vi.fn(), addHandler: vi.fn() })
      await interception.handler?.()
    },
  }
}

describe('mandatory route guards', function () {
  it('blocks initial content and middleware before a synchronous denial', function () {
    const content = vi.fn(() => 'Private')
    const middleware = vi.fn(({ children }: { children: ReactNode }) => children)
    const matcher = createRouter((route) => {
      route('/private')
        .guard(() => {
          throw new Error('access denied')
        })
        .middleware([middleware])
        .render(content)
    })
    const navigation = createMemoryNavigation({ url: 'https://example.com/private' })

    expect(() => renderToString(<Router matcher={matcher} navigation={navigation} />)).toThrow(
      'access denied'
    )
    expect(content).not.toHaveBeenCalled()
    expect(middleware).not.toHaveBeenCalled()
  })

  it('waits for async initial checks under StrictMode without rendering content first', async function ({
    onTestFinished,
  }) {
    let allow!: () => void
    const pending = new Promise<void>((resolve) => {
      allow = resolve
    })
    const guard = vi.fn(() => pending)
    const content = vi.fn(() => 'Private')
    const matcher = createRouter((route) => route('/private/:id').guard(guard).render(content))
    const navigation = createMemoryNavigation({ url: 'https://example.com/private/42?tab=posts' })
    const { container, unmount } = await mount(
      <StrictMode>
        <Router matcher={matcher} navigation={navigation} fallback="Checking" />
      </StrictMode>
    )
    onTestFinished(unmount)

    expect(container.textContent).toBe('Checking')
    expect(content).not.toHaveBeenCalled()
    expect(guard).toHaveBeenCalledWith({
      params: { id: '42' },
      url: new URL('https://example.com/private/42?tab=posts'),
    })
    const callsBeforeRetry = guard.mock.calls.length
    await act(async () => allow())
    expect(container.textContent).toBe('Private')
    expect(guard).toHaveBeenCalledTimes(callsBeforeRetry)
  })

  it('rejects an async initial check into the error boundary under StrictMode', async function ({
    onTestFinished,
  }) {
    let deny!: (error: Error) => void
    const pending = new Promise<void>((_, reject) => {
      deny = reject
    })
    const content = vi.fn(() => 'Private')
    const matcher = createRouter((route) =>
      route('/private')
        .guard(() => pending)
        .render(content)
    )
    const navigation = createMemoryNavigation({ url: 'https://example.com/private' })
    const { container, unmount } = await mount(
      <StrictMode>
        <GuardBoundary>
          <Router matcher={matcher} navigation={navigation} fallback="Checking" />
        </GuardBoundary>
      </StrictMode>
    )
    onTestFinished(unmount)

    expect(content).not.toHaveBeenCalled()
    await act(async () => deny(new Error('access denied')))
    expect(container.textContent).toBe('Denied')
    expect(content).not.toHaveBeenCalled()
  })

  it('waits for async checks during streaming SSR', async function () {
    let allow!: () => void
    const pending = new Promise<void>((resolve) => {
      allow = resolve
    })
    const content = vi.fn(() => 'Private')
    const matcher = createRouter((route) =>
      route('/private')
        .guard(() => pending)
        .render(content)
    )
    const navigation = createMemoryNavigation({ url: 'https://example.com/private' })
    const stream = await renderToReadableStream(
      <Router matcher={matcher} navigation={navigation} fallback="Checking" />
    )

    expect(content).not.toHaveBeenCalled()
    allow()
    await stream.allReady
    expect(await new Response(stream).text()).toContain('Private')
  })

  it('observes discarded StrictMode checks when each invocation creates a rejected promise', async function ({
    onTestFinished,
  }) {
    const content = vi.fn(() => 'Private')
    const guard = vi.fn(async () => {
      throw new Error('access denied')
    })
    const matcher = createRouter((route) => route('/private').guard(guard).render(content))
    const navigation = createMemoryNavigation({ url: 'https://example.com/private' })
    const { container, unmount } = await mount(
      <StrictMode>
        <GuardBoundary>
          <Router matcher={matcher} navigation={navigation} />
        </GuardBoundary>
      </StrictMode>
    )
    onTestFinished(unmount)

    expect(container.textContent).toBe('Denied')
    expect(guard.mock.calls.length).toBeGreaterThan(1)
    expect(content).not.toHaveBeenCalled()
  })

  it('does not emit protected HTML when an async SSR check rejects', async function () {
    const content = vi.fn(() => 'Private')
    const error = new Error('access denied')
    const onError = vi.fn()
    const matcher = createRouter((route) =>
      route('/private')
        .guard(async () => {
          throw error
        })
        .render(content)
    )
    const navigation = createMemoryNavigation({ url: 'https://example.com/private' })
    const stream = await renderToReadableStream(
      <Router matcher={matcher} navigation={navigation} fallback="Checking" />,
      { onError }
    )
    await stream.allReady

    expect(await new Response(stream).text()).not.toContain('Private')
    expect(content).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(error, expect.anything())
  })

  it('preserves initial prefetch behavior while running the new guard', function () {
    const guard = vi.fn()
    const prefetch = vi.fn()
    const matcher = createRouter((route) =>
      route('/private')
        .guard(guard)
        .prefetch(prefetch)
        .render(() => 'Private')
    )
    const navigation = createMemoryNavigation({ url: 'https://example.com/private' })

    expect(renderToString(<Router matcher={matcher} navigation={navigation} />)).toContain(
      'Private'
    )
    expect(guard).toHaveBeenCalledTimes(1)
    expect(prefetch).not.toHaveBeenCalled()
  })

  it('keeps speculative prefetch separate from mandatory guards', async function ({
    onTestFinished,
  }) {
    const guard = vi.fn(() => {
      throw new Error('access denied')
    })
    const prefetch = vi.fn()
    const matcher = createRouter((route) =>
      route('/private')
        .guard(guard)
        .prefetch(prefetch)
        .render(() => 'Private')
    )
    const { current: prefetchRoute, unmount } = renderHook(() => usePrefetch({ matcher }))
    onTestFinished(unmount)

    await prefetchRoute('/private')
    expect(prefetch).toHaveBeenCalledTimes(1)
    expect(guard).not.toHaveBeenCalled()
  })

  it('rejects navigation before prefetch and content render', async function ({ onTestFinished }) {
    const prefetch = vi.fn()
    const content = vi.fn(() => 'Private')
    const matcher = createRouter((route) => {
      route('/').render(() => 'Home')
      route('/private')
        .guard(async () => {
          throw new Error('access denied')
        })
        .prefetch(prefetch)
        .render(content)
    })
    const attempt = navigationAttempt({ url: 'https://example.com/private', formData: null })
    const { container, unmount } = await mount(
      <Router matcher={matcher} navigation={attempt.navigation} />
    )
    onTestFinished(unmount)

    await expect(attempt.run()).rejects.toThrow('access denied')
    expect(container.textContent).toBe('Home')
    expect(prefetch).not.toHaveBeenCalled()
    expect(content).not.toHaveBeenCalled()
  })

  it('rejects legacy prefetch before executing a custom form action', async function ({
    onTestFinished,
  }) {
    const action = vi.fn()
    const matcher = createRouter((route) => {
      route('/').render(() => 'Home')
      route('/private')
        .prefetch(() => {
          throw new Error('access denied')
        })
        .formHandler(action)
        .render(() => 'Private')
    })
    const attempt = navigationAttempt({
      url: 'https://example.com/private',
      formData: new FormData(),
    })
    const { unmount } = await mount(<Router matcher={matcher} navigation={attempt.navigation} />)
    onTestFinished(unmount)

    await expect(attempt.run()).rejects.toThrow('access denied')
    expect(action).not.toHaveBeenCalled()
  })

  it('rejects a mandatory form guard before prefetch or action', async function ({
    onTestFinished,
  }) {
    const action = vi.fn()
    const prefetch = vi.fn()
    const childGuard = vi.fn()
    const matcher = createRouter((route) => {
      route('/').render(() => 'Home')
      const privateRoutes = route()
        .guard(async () => {
          throw new Error('access denied')
        })
        .group()
      privateRoutes('/private')
        .guard(childGuard)
        .prefetch(prefetch)
        .formHandler(action)
        .render(() => 'Private')
    })
    const attempt = navigationAttempt({
      url: 'https://example.com/private',
      formData: new FormData(),
    })
    const { unmount } = await mount(<Router matcher={matcher} navigation={attempt.navigation} />)
    onTestFinished(unmount)

    await expect(attempt.run()).rejects.toThrow('access denied')
    expect(prefetch).not.toHaveBeenCalled()
    expect(childGuard).not.toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
  })

  it('awaits inherited guards and prefetch before executing a custom action', async function ({
    onTestFinished,
  }) {
    let allow!: () => void
    const pending = new Promise<void>((resolve) => {
      allow = resolve
    })
    const calls: string[] = []
    const matcher = createRouter((route) => {
      route('/').render(() => 'Home')
      const privateRoutes = route('/private')
        .guard(() => pending)
        .guard(() => {
          calls.push('parent')
        })
        .group()
      privateRoutes('/submit')
        .guard(() => {
          calls.push('child')
        })
        .prefetch(async () => {
          await Promise.resolve()
          calls.push('prefetch')
        })
        .formHandler(() => {
          calls.push('action')
        })
        .render(() => 'Private')
    })
    const attempt = navigationAttempt({
      url: 'https://example.com/private/submit',
      formData: new FormData(),
    })
    const { unmount } = await mount(<Router matcher={matcher} navigation={attempt.navigation} />)
    onTestFinished(unmount)

    const finished = attempt.run()
    expect(calls).toEqual([])
    allow()
    await finished
    expect(calls).toEqual(['parent', 'child', 'prefetch', 'action'])
  })
})

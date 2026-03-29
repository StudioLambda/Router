import { describe, it, vi } from 'vitest'
import { type ComponentType, createElement, type ReactNode, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { usePrefetchEffect } from './usePrefetchEffect'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { createMatcher } from 'router:matcher'
import { type Handler } from 'router/react:router'

/**
 * Creates a stub component that renders null for route
 * registration in the matcher.
 */
function createStub(): ComponentType {
  return function () {
    return null
  }
}

/**
 * Sets up a full render environment for testing
 * `usePrefetchEffect`. Returns a mounted DOM element that
 * the hook's ref points to, plus cleanup utilities.
 *
 * The hook is rendered inside a component that creates a
 * real ref pointing to a `<div>` element, wrapped with
 * a `MatcherContext` provider so `usePrefetch` can resolve
 * routes.
 */
function renderPrefetchEffect(options: {
  href: string | undefined
  on: 'hover' | 'viewport' | undefined
  once?: boolean
  prefetch?: () => void
}) {
  const matcher = createMatcher<Handler>()

  if (options.href !== undefined) {
    matcher.register(new URL(options.href, 'http://localhost').pathname, {
      component: createStub(),
      prefetch: options.prefetch,
    })
  }

  const container = document.createElement('div')

  document.body.appendChild(container)

  const root = createRoot(container)
  let targetElement: HTMLDivElement | null = null

  /**
   * Test component that renders a div element with a ref
   * and calls `usePrefetchEffect` with that ref and the
   * provided options.
   */
  function TestComponent() {
    const ref = useRef<HTMLDivElement>(null)

    usePrefetchEffect(ref, {
      href: options.href,
      on: options.on,
      once: options.once,
      matcher,
    })

    return createElement('div', {
      'ref': function (el: HTMLDivElement | null) {
        ref.current = el
        targetElement = el
      },
      'data-testid': 'target',
    })
  }

  /**
   * Wrapper providing the matcher through context for
   * the usePrefetch hook that usePrefetchEffect calls
   * internally.
   */
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MatcherContext, { value: matcher }, children)
  }

  act(function () {
    root.render(createElement(Wrapper, null, createElement(TestComponent)))
  })

  return {
    get target() {
      return targetElement!
    },
    unmount() {
      act(function () {
        root.unmount()
      })

      container.remove()
    },
  }
}

describe('usePrefetchEffect', { concurrent: true }, function () {
  it('is a no-op when on is undefined', function ({ expect, onTestFinished }) {
    const prefetchSpy = vi.fn()

    const { target, unmount } = renderPrefetchEffect({
      href: '/page',
      on: undefined,
      prefetch: prefetchSpy,
    })

    onTestFinished(unmount)

    target.dispatchEvent(new Event('mouseenter'))

    expect(prefetchSpy).not.toHaveBeenCalled()
  })

  it('is a no-op when href is undefined', function ({ expect, onTestFinished }) {
    const { target, unmount } = renderPrefetchEffect({
      href: undefined,
      on: 'hover',
    })

    onTestFinished(unmount)

    expect(target).toBeDefined()
  })

  it('triggers prefetch on mouseenter with hover strategy', function ({ expect, onTestFinished }) {
    const prefetchSpy = vi.fn()

    const { target, unmount } = renderPrefetchEffect({
      href: '/about',
      on: 'hover',
      prefetch: prefetchSpy,
    })

    onTestFinished(unmount)

    target.dispatchEvent(new Event('mouseenter'))

    expect(prefetchSpy).toHaveBeenCalledTimes(1)
  })

  it('removes hover listener on unmount', function ({ expect }) {
    const prefetchSpy = vi.fn()

    const { target, unmount } = renderPrefetchEffect({
      href: '/about',
      on: 'hover',
      prefetch: prefetchSpy,
    })

    unmount()

    target.dispatchEvent(new Event('mouseenter'))

    expect(prefetchSpy).not.toHaveBeenCalled()
  })

  it('sets up IntersectionObserver with viewport strategy', function ({ expect, onTestFinished }) {
    const observeSpy = vi.spyOn(IntersectionObserver.prototype, 'observe')

    const { target, unmount } = renderPrefetchEffect({
      href: '/page',
      on: 'viewport',
      prefetch: vi.fn(),
    })

    onTestFinished(function () {
      unmount()
      observeSpy.mockRestore()
    })

    expect(observeSpy).toHaveBeenCalledWith(target)
  })

  it('disconnects IntersectionObserver on unmount', function ({ expect }) {
    const disconnectSpy = vi.spyOn(IntersectionObserver.prototype, 'disconnect')

    const { unmount } = renderPrefetchEffect({
      href: '/page',
      on: 'viewport',
      prefetch: vi.fn(),
    })

    unmount()

    expect(disconnectSpy).toHaveBeenCalled()

    disconnectSpy.mockRestore()
  })

  it('triggers prefetch when the element enters the viewport', function ({
    expect,
    onTestFinished,
  }) {
    let observerCallback: IntersectionObserverCallback | null = null

    /**
     * Captures the IntersectionObserver callback so we can
     * invoke it manually to simulate an intersection event.
     */
    const OriginalObserver = IntersectionObserver

    vi.stubGlobal(
      'IntersectionObserver',
      function (this: IntersectionObserver, cb: IntersectionObserverCallback) {
        observerCallback = cb

        const instance = new OriginalObserver(cb)

        return instance
      }
    )

    const prefetchSpy = vi.fn()

    const { unmount } = renderPrefetchEffect({
      href: '/page',
      on: 'viewport',
      prefetch: prefetchSpy,
    })

    onTestFinished(function () {
      unmount()
      vi.unstubAllGlobals()
    })

    expect(observerCallback).not.toBeNull()

    /**
     * Simulate an intersection where the element is visible.
     * The callback should invoke the prefetch function.
     */
    const mockEntry = { isIntersecting: true } as IntersectionObserverEntry
    const mockObserver = { disconnect: vi.fn() } as unknown as IntersectionObserver

    observerCallback!([mockEntry], mockObserver)

    expect(prefetchSpy).toHaveBeenCalledTimes(1)
  })

  it('disconnects observer after first intersection when once is true', function ({
    expect,
    onTestFinished,
  }) {
    let observerCallback: IntersectionObserverCallback | null = null

    const OriginalObserver = IntersectionObserver

    vi.stubGlobal(
      'IntersectionObserver',
      function (this: IntersectionObserver, cb: IntersectionObserverCallback) {
        observerCallback = cb

        const instance = new OriginalObserver(cb)

        return instance
      }
    )

    const prefetchSpy = vi.fn()

    const { unmount } = renderPrefetchEffect({
      href: '/page',
      on: 'viewport',
      once: true,
      prefetch: prefetchSpy,
    })

    onTestFinished(function () {
      unmount()
      vi.unstubAllGlobals()
    })

    const disconnectSpy = vi.fn()
    const mockEntry = { isIntersecting: true } as IntersectionObserverEntry
    const mockObserver = { disconnect: disconnectSpy } as unknown as IntersectionObserver

    observerCallback!([mockEntry], mockObserver)

    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('does not disconnect observer after intersection when once is false', function ({
    expect,
    onTestFinished,
  }) {
    let observerCallback: IntersectionObserverCallback | null = null

    const OriginalObserver = IntersectionObserver

    vi.stubGlobal(
      'IntersectionObserver',
      function (this: IntersectionObserver, cb: IntersectionObserverCallback) {
        observerCallback = cb

        const instance = new OriginalObserver(cb)

        return instance
      }
    )

    const prefetchSpy = vi.fn()

    const { unmount } = renderPrefetchEffect({
      href: '/page',
      on: 'viewport',
      once: false,
      prefetch: prefetchSpy,
    })

    onTestFinished(function () {
      unmount()
      vi.unstubAllGlobals()
    })

    const disconnectSpy = vi.fn()
    const mockEntry = { isIntersecting: true } as IntersectionObserverEntry
    const mockObserver = { disconnect: disconnectSpy } as unknown as IntersectionObserver

    observerCallback!([mockEntry], mockObserver)

    expect(prefetchSpy).toHaveBeenCalledTimes(1)
    expect(disconnectSpy).not.toHaveBeenCalled()
  })

  it('skips prefetch when intersection entry is not intersecting', function ({
    expect,
    onTestFinished,
  }) {
    let observerCallback: IntersectionObserverCallback | null = null

    const OriginalObserver = IntersectionObserver

    vi.stubGlobal(
      'IntersectionObserver',
      function (this: IntersectionObserver, cb: IntersectionObserverCallback) {
        observerCallback = cb

        const instance = new OriginalObserver(cb)

        return instance
      }
    )

    const prefetchSpy = vi.fn()

    const { unmount } = renderPrefetchEffect({
      href: '/page',
      on: 'viewport',
      prefetch: prefetchSpy,
    })

    onTestFinished(function () {
      unmount()
      vi.unstubAllGlobals()
    })

    const mockEntry = { isIntersecting: false } as IntersectionObserverEntry
    const mockObserver = { disconnect: vi.fn() } as unknown as IntersectionObserver

    observerCallback!([mockEntry], mockObserver)

    expect(prefetchSpy).not.toHaveBeenCalled()
  })

  it('is a no-op when the ref element is null', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const prefetchSpy = vi.fn()

    matcher.register('/page', {
      component: createStub(),
      prefetch: prefetchSpy,
    })

    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)

    /**
     * Test component that passes a ref whose current value
     * is always null to usePrefetchEffect, simulating an
     * unmounted or missing DOM element.
     */
    function NullRefComponent() {
      const ref = useRef<HTMLDivElement>(null)

      usePrefetchEffect(ref, {
        href: '/page',
        on: 'viewport',
        matcher,
      })

      return null
    }

    /**
     * Wrapper providing the matcher through context.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(MatcherContext, { value: matcher }, children)
    }

    act(function () {
      root.render(createElement(Wrapper, null, createElement(NullRefComponent)))
    })

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    /**
     * The prefetch function should never be called because
     * the ref element is null, so the effect returns early
     * before setting up any observer or listener.
     */
    expect(prefetchSpy).not.toHaveBeenCalled()
  })
})

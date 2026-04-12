import { describe, it, vi } from 'vitest'
import { type ComponentType, createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { clearPrefetchCache, usePrefetch } from './usePrefetch'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { createMatcher } from 'router:matcher'
import { type Handler } from 'router/react:router'

/**
 * Creates a stub React component that renders null.
 */
function createStub(): ComponentType {
  return function () {
    return null
  }
}

describe('usePrefetch', { concurrent: true }, function () {
  it('returns a function', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    expect(typeof current).toBe('function')
  })

  it('calls the matched route prefetch handler with a PrefetchContext', function ({
    expect,
    onTestFinished,
  }) {
    const prefetchSpy = vi.fn()
    const matcher = createMatcher<Handler>()

    matcher.register('/about', {
      component: createStub(),
      prefetch: prefetchSpy,
    })

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    current('/about')

    expect(prefetchSpy).toHaveBeenCalledTimes(1)

    const context = prefetchSpy.mock.calls[0][0]

    expect(context.params).toStrictEqual({})
    expect(context.url).toBeInstanceOf(URL)
    expect(context.url.pathname).toBe('/about')
    expect(typeof context.controller.redirect).toBe('function')
    expect(typeof context.controller.addHandler).toBe('function')
  })

  it('returns undefined when no route matches', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    const result = current('/nonexistent')

    expect(result).toBeUndefined()
  })

  it('returns undefined when matched route has no prefetch handler', function ({
    expect,
    onTestFinished,
  }) {
    const matcher = createMatcher<Handler>()

    matcher.register('/home', { component: createStub() })

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    const result = current('/home')

    expect(result).toBeUndefined()
  })

  it('handles absolute URLs by extracting pathname', function ({ expect, onTestFinished }) {
    const prefetchSpy = vi.fn()
    const matcher = createMatcher<Handler>()

    matcher.register('/page', {
      component: createStub(),
      prefetch: prefetchSpy,
    })

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    current('https://example.com/page?q=1')

    expect(prefetchSpy).toHaveBeenCalledTimes(1)
  })

  it('reads matcher from MatcherContext when no option is passed', function ({
    expect,
    onTestFinished,
  }) {
    const prefetchSpy = vi.fn()
    const matcher = createMatcher<Handler>()

    matcher.register('/ctx-route', {
      component: createStub(),
      prefetch: prefetchSpy,
    })

    /**
     * Wrapper providing the matcher through context.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(MatcherContext, { value: matcher }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return usePrefetch()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    current('/ctx-route')

    expect(prefetchSpy).toHaveBeenCalledTimes(1)
  })

  it('deduplicates prefetch calls for the same pathname', function ({ expect, onTestFinished }) {
    const prefetchSpy = vi.fn()
    const matcher = createMatcher<Handler>()

    matcher.register('/dedup', {
      component: createStub(),
      prefetch: prefetchSpy,
    })

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    current('/dedup')
    current('/dedup')
    current('/dedup')

    expect(prefetchSpy).toHaveBeenCalledTimes(1)
  })

  it('allows re-prefetch after clearPrefetchCache', function ({ expect, onTestFinished }) {
    const prefetchSpy = vi.fn()
    const matcher = createMatcher<Handler>()

    matcher.register('/clearable', {
      component: createStub(),
      prefetch: prefetchSpy,
    })

    const { current, unmount } = renderHook(function () {
      return usePrefetch({ matcher })
    })

    onTestFinished(unmount)

    current('/clearable')

    expect(prefetchSpy).toHaveBeenCalledTimes(1)

    clearPrefetchCache(matcher)

    current('/clearable')

    expect(prefetchSpy).toHaveBeenCalledTimes(2)
  })

  it('clearPrefetchCache does not affect other matchers', function ({ expect, onTestFinished }) {
    const prefetchSpy1 = vi.fn()
    const prefetchSpy2 = vi.fn()

    const matcher1 = createMatcher<Handler>()
    const matcher2 = createMatcher<Handler>()

    matcher1.register('/shared', {
      component: createStub(),
      prefetch: prefetchSpy1,
    })

    matcher2.register('/shared', {
      component: createStub(),
      prefetch: prefetchSpy2,
    })

    const { current: prefetch1, unmount: unmount1 } = renderHook(function () {
      return usePrefetch({ matcher: matcher1 })
    })

    const { current: prefetch2, unmount: unmount2 } = renderHook(function () {
      return usePrefetch({ matcher: matcher2 })
    })

    onTestFinished(unmount1)
    onTestFinished(unmount2)

    prefetch1('/shared')
    prefetch2('/shared')

    expect(prefetchSpy1).toHaveBeenCalledTimes(1)
    expect(prefetchSpy2).toHaveBeenCalledTimes(1)

    clearPrefetchCache(matcher1)

    prefetch1('/shared')
    prefetch2('/shared')

    expect(prefetchSpy1).toHaveBeenCalledTimes(2)
    expect(prefetchSpy2).toHaveBeenCalledTimes(1)
  })
})

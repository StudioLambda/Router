import { describe, it } from 'vitest'
import { type ComponentType, createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNextMatch } from './useNextMatch'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { createMatcher } from 'router:matcher'
import { type Handler } from 'router/react:router'

/**
 * Creates a stub React component that renders null. Each
 * call produces a unique function identity for reference
 * equality checks.
 */
function createStub(): ComponentType {
  return function () {
    return null
  }
}

describe('useNextMatch', { concurrent: true }, function () {
  it('matches a registered route and returns its handler', function ({ expect, onTestFinished }) {
    const Home = createStub()
    const matcher = createMatcher<Handler>()

    matcher.register('/', { component: Home })

    const { current, unmount } = renderHook(function () {
      return useNextMatch({ matcher })
    })

    onTestFinished(unmount)

    const NotFound = createStub()
    const result = current('http://localhost/', NotFound)

    expect(result.handler.component).toBe(Home)
    expect(result.params).toEqual({})
  })

  it('falls back to notFound component when no route matches', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const NotFound = createStub()

    const { current, unmount } = renderHook(function () {
      return useNextMatch({ matcher })
    })

    onTestFinished(unmount)

    const result = current('http://localhost/nonexistent', NotFound)

    expect(result.handler.component).toBe(NotFound)
    expect(result.params).toEqual({})
  })

  it('falls back to notFound when destination is null', function ({ expect, onTestFinished }) {
    const matcher = createMatcher<Handler>()
    const NotFound = createStub()

    const { current, unmount } = renderHook(function () {
      return useNextMatch({ matcher })
    })

    onTestFinished(unmount)

    const result = current(null, NotFound)

    expect(result.handler.component).toBe(NotFound)
  })

  it('extracts dynamic params from the matched route', function ({ expect, onTestFinished }) {
    const UserPage = createStub()
    const matcher = createMatcher<Handler>()

    matcher.register('/user/:id', { component: UserPage })

    const { current, unmount } = renderHook(function () {
      return useNextMatch({ matcher })
    })

    onTestFinished(unmount)

    const NotFound = createStub()
    const result = current('http://localhost/user/42', NotFound)

    expect(result.handler.component).toBe(UserPage)
    expect(result.params).toEqual({ id: '42' })
  })

  it('reads matcher from MatcherContext when no option is passed', function ({ expect, onTestFinished }) {
    const Home = createStub()
    const matcher = createMatcher<Handler>()

    matcher.register('/', { component: Home })

    /**
     * Wrapper providing the matcher through context instead
     * of the options parameter.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(MatcherContext, { value: matcher }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNextMatch()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    const NotFound = createStub()
    const result = current('http://localhost/', NotFound)

    expect(result.handler.component).toBe(Home)
  })
})

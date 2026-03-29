import { describe, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useSearchParams } from './useSearchParams'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { createMemoryNavigation } from 'router/react:navigation/createMemoryNavigation'

/**
 * Creates a wrapper providing NavigationContext with a memory
 * navigation instance at the given URL.
 */
function createNavigationWrapper(url: string) {
  const navigation = createMemoryNavigation({ url })

  return { navigation, Wrapper }

  /**
   * React wrapper component that provides the memory
   * navigation via NavigationContext.
   */
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(NavigationContext, { value: navigation }, children)
  }
}

describe('useSearchParams', { concurrent: true }, function () {
  it('returns current search params from the URL', function ({ expect, onTestFinished }) {
    const { Wrapper } = createNavigationWrapper('https://example.com/page?q=hello&page=2')

    const { current, unmount } = renderHook(
      function () {
        return useSearchParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    const [searchParams] = current

    expect(searchParams.get('q')).toBe('hello')
    expect(searchParams.get('page')).toBe('2')
  })

  it('returns empty search params when URL has no query string', function ({
    expect,
    onTestFinished,
  }) {
    const { Wrapper } = createNavigationWrapper('https://example.com/page')

    const { current, unmount } = renderHook(
      function () {
        return useSearchParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    const [searchParams] = current

    expect(searchParams.toString()).toBe('')
  })

  it('setter navigates with a record of params using replace by default', function ({
    expect,
    onTestFinished,
  }) {
    const { navigation, Wrapper } = createNavigationWrapper('https://example.com/page')

    const navigateSpy = vi.spyOn(navigation, 'navigate')

    const { current, unmount } = renderHook(
      function () {
        return useSearchParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    const [, setSearchParams] = current

    setSearchParams({ q: 'test' })

    expect(navigateSpy).toHaveBeenCalledWith('/page?q=test', { history: 'replace' })
  })

  it('setter accepts URLSearchParams directly', function ({ expect, onTestFinished }) {
    const { navigation, Wrapper } = createNavigationWrapper('https://example.com/page')

    const navigateSpy = vi.spyOn(navigation, 'navigate')

    const { current, unmount } = renderHook(
      function () {
        return useSearchParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    const [, setSearchParams] = current

    setSearchParams(new URLSearchParams('foo=bar'))

    expect(navigateSpy).toHaveBeenCalledWith('/page?foo=bar', { history: 'replace' })
  })

  it('setter accepts a function updater', function ({ expect, onTestFinished }) {
    const { navigation, Wrapper } = createNavigationWrapper('https://example.com/page?existing=1')

    const navigateSpy = vi.spyOn(navigation, 'navigate')

    const { current, unmount } = renderHook(
      function () {
        return useSearchParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    const [, setSearchParams] = current

    setSearchParams(function (params) {
      params.set('added', '2')

      return params
    })

    expect(navigateSpy).toHaveBeenCalledWith('/page?existing=1&added=2', { history: 'replace' })
  })

  it('setter respects custom history option', function ({ expect, onTestFinished }) {
    const { navigation, Wrapper } = createNavigationWrapper('https://example.com/page')

    const navigateSpy = vi.spyOn(navigation, 'navigate')

    const { current, unmount } = renderHook(
      function () {
        return useSearchParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    const [, setSearchParams] = current

    setSearchParams({ q: 'push' }, { history: 'push' })

    expect(navigateSpy).toHaveBeenCalledWith('/page?q=push', { history: 'push' })
  })
})

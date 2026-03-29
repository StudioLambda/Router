import { describe, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigate } from './useNavigate'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { createMemoryNavigation } from 'router/react:navigation/createMemoryNavigation'

describe('useNavigate', { concurrent: true }, function () {
  it('returns a function', function ({ expect, onTestFinished }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    /**
     * Wrapper providing NavigationContext for useNavigate.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigate()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(typeof current).toBe('function')
  })

  it('delegates to navigation.navigate with correct arguments', function ({
    expect,
    onTestFinished,
  }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    const navigateSpy = vi.spyOn(navigation, 'navigate')

    /**
     * Wrapper providing the spied navigation via context.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigate()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    current('/about', { history: 'replace' })

    expect(navigateSpy).toHaveBeenCalledWith('/about', { history: 'replace' })
  })
})

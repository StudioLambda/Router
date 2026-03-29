import { describe, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useForward } from './useForward'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { createMemoryNavigation } from 'router/react:navigation/createMemoryNavigation'

describe('useForward', { concurrent: true }, function () {
  it('returns canGoForward as false for memory navigation', function ({ expect, onTestFinished }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    /**
     * Wrapper providing NavigationContext for useForward.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useForward()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    expect(current.canGoForward).toBe(false)
    expect(typeof current.forward).toBe('function')
  })

  it('delegates forward() to navigation.forward()', function ({ expect, onTestFinished }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    /**
     * Mock forward method on the navigation object to verify
     * that useForward delegates correctly.
     */
    const forwardSpy = vi.fn(function () {
      return {
        committed: Promise.resolve({} as NavigationHistoryEntry),
        finished: Promise.resolve({} as NavigationHistoryEntry),
      }
    })

    ;(navigation as unknown as Record<string, unknown>).forward = forwardSpy

    /**
     * Wrapper providing the mocked navigation via context.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useForward()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    current.forward()

    expect(forwardSpy).toHaveBeenCalled()
  })
})

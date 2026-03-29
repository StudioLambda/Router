import { describe, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useBack } from './useBack'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { createMemoryNavigation } from 'router/react:navigation/createMemoryNavigation'

describe('useBack', { concurrent: true }, function () {
  it('returns canGoBack as false for memory navigation', function ({ expect, onTestFinished }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    /**
     * Wrapper providing NavigationContext for useBack.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useBack()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    expect(current.canGoBack).toBe(false)
    expect(typeof current.back).toBe('function')
  })

  it('delegates back() to navigation.back()', function ({ expect, onTestFinished }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    /**
     * Mock back method on the navigation object to verify
     * that useBack delegates correctly.
     */
    const backSpy = vi.fn(function () {
      return {
        committed: Promise.resolve({} as NavigationHistoryEntry),
        finished: Promise.resolve({} as NavigationHistoryEntry),
      }
    })

    ;(navigation as unknown as Record<string, unknown>).back = backSpy

    /**
     * Wrapper providing the mocked navigation via context.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useBack()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    current.back()

    expect(backSpy).toHaveBeenCalled()
  })
})

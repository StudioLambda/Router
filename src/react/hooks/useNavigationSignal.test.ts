import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigationSignal } from './useNavigationSignal'
import { NavigationSignalContext } from 'router/react:context/NavigationSignalContext'

describe('useNavigationSignal', { concurrent: true }, function () {
  it('throws when used outside a provider', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return useNavigationSignal()
      })
    }).toThrow('useNavigationSignal requires a <Router> or <NavigationSignalContext> provider')
  })

  it('returns null when provider gives null (initial render)', function ({
    expect,
    onTestFinished,
  }) {
    /**
     * Wrapper providing null signal, simulating the initial
     * render before any navigation event has fired.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationSignalContext, { value: null }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigationSignal()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toBeNull()
  })

  it('returns signal from context', function ({ expect, onTestFinished }) {
    const controller = new AbortController()

    /**
     * Wrapper providing an AbortSignal via context for
     * testing signal retrieval.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationSignalContext, { value: controller.signal }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigationSignal()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toBe(controller.signal)
  })
})

import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigationSignal } from './useNavigationSignal'
import { NavigationSignalContext } from 'router/react:context/NavigationSignalContext'

describe('useNavigationSignal', { concurrent: true }, function () {
  it('returns null by default', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(function () {
      return useNavigationSignal()
    })

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

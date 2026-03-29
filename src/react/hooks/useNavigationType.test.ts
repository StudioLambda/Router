import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigationType } from './useNavigationType'
import { NavigationTypeContext } from 'router/react:context/NavigationTypeContext'

describe('useNavigationType', { concurrent: true }, function () {
  it('returns null by default', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(function () {
      return useNavigationType()
    })

    onTestFinished(unmount)

    expect(current).toBeNull()
  })

  it('returns navigation type from context', function ({ expect, onTestFinished }) {
    /**
     * Wrapper providing a "push" navigation type via context.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationTypeContext, { value: 'push' }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigationType()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toBe('push')
  })
})

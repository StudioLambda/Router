import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigationType } from './useNavigationType'
import { NavigationTypeContext } from 'router/react:context/NavigationTypeContext'

describe('useNavigationType', { concurrent: true }, function () {
  it('throws when used outside a provider', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return useNavigationType()
      })
    }).toThrow('useNavigationType requires a <Router> or <NavigationTypeContext> provider')
  })

  it('returns null when provider gives null (initial render)', function ({
    expect,
    onTestFinished,
  }) {
    /**
     * Wrapper providing null navigation type, simulating the
     * initial render before any navigation event has fired.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationTypeContext, { value: null }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigationType()
      },
      { wrapper: Wrapper }
    )

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

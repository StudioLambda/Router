import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { usePathname } from './usePathname'
import { PathnameContext } from 'router/react:context/PathnameContext'

describe('usePathname', { concurrent: true }, function () {
  it('throws when used outside a provider', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return usePathname()
      })
    }).toThrow('usePathname requires a <Router> or <PathnameContext> provider')
  })

  it('returns pathname from context', function ({ expect, onTestFinished }) {
    /**
     * Wrapper providing a specific pathname for testing.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(PathnameContext, { value: '/users/42' }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return usePathname()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toBe('/users/42')
  })
})

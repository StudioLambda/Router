import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigation } from './useNavigation'
import { NavigationContext } from 'router/react:context/NavigationContext'
import { createMemoryNavigation } from 'router/react:navigation/createMemoryNavigation'

describe('useNavigation', { concurrent: true }, function () {
  it('throws when used outside a provider', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return useNavigation()
      })
    }).toThrow('useNavigation requires a <Router> or <NavigationContext> provider')
  })

  it('returns the navigation from context', function ({ expect, onTestFinished }) {
    const navigation = createMemoryNavigation({ url: 'https://example.com/' })

    /**
     * Wrapper that provides a NavigationContext with the
     * memory navigation instance for testing.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(NavigationContext, { value: navigation }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigation()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toBe(navigation)
  })
})

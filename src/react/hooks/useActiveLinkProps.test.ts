import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useActiveLinkProps } from './useActiveLinkProps'
import { PathnameContext } from 'router/react:context/PathnameContext'

/**
 * Creates a wrapper component that provides PathnameContext
 * with the given pathname value.
 */
function createPathnameWrapper(pathname: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(PathnameContext, { value: pathname }, children)
  }
}

describe('useActiveLinkProps', { concurrent: true }, function () {
  it('returns active state for exact pathname match', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps('/about')
      },
      { wrapper: createPathnameWrapper('/about') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(true)
    expect(current.props['data-active']).toBe(true)
    expect(current.props['aria-current']).toBe('page')
  })

  it('returns inactive state when pathname does not match', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps('/about')
      },
      { wrapper: createPathnameWrapper('/contact') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(false)
    expect(current.props['data-active']).toBeUndefined()
    expect(current.props['aria-current']).toBeUndefined()
  })

  it('returns inactive when href is undefined', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps(undefined)
      },
      { wrapper: createPathnameWrapper('/about') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(false)
  })

  it('supports prefix matching with exact: false', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps('/users', { exact: false })
      },
      { wrapper: createPathnameWrapper('/users/42') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(true)
    expect(current.props['data-active']).toBe(true)
  })

  it('does not prefix match when exact is true (default)', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps('/users')
      },
      { wrapper: createPathnameWrapper('/users/42') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(false)
  })

  it('prefix match is active when pathname equals href exactly', function ({
    expect,
    onTestFinished,
  }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps('/users', { exact: false })
      },
      { wrapper: createPathnameWrapper('/users') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(true)
  })

  it('handles href with query string by comparing only pathname', function ({
    expect,
    onTestFinished,
  }) {
    const { current, unmount } = renderHook(
      function () {
        return useActiveLinkProps('/search?q=hello')
      },
      { wrapper: createPathnameWrapper('/search') }
    )

    onTestFinished(unmount)

    expect(current.isActive).toBe(true)
  })
})

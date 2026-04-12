import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useParams } from './useParams'
import { ParamsContext } from 'router/react:context/ParamsContext'

describe('useParams', { concurrent: true }, function () {
  it('throws when used outside a provider', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return useParams()
      })
    }).toThrow('useParams requires a <Router> or <ParamsContext> provider')
  })

  it('returns params from context', function ({ expect, onTestFinished }) {
    const params = { id: '42', slug: 'hello' }

    /**
     * Wrapper providing ParamsContext with test params.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(ParamsContext, { value: params }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toEqual({ id: '42', slug: 'hello' })
  })

  it('returns empty params when provider gives empty object', function ({
    expect,
    onTestFinished,
  }) {
    /**
     * Wrapper providing ParamsContext with an empty object,
     * simulating a route with no dynamic segments.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(ParamsContext, { value: {} }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useParams()
      },
      { wrapper: Wrapper }
    )

    onTestFinished(unmount)

    expect(current).toEqual({})
  })
})

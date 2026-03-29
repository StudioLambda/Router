import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useParams } from './useParams'
import { ParamsContext } from 'router/react:context/PropsContext'

describe('useParams', { concurrent: true }, function () {
  it('returns empty object by default', function ({ expect, onTestFinished }) {
    const { current, unmount } = renderHook(function () {
      return useParams()
    })

    onTestFinished(unmount)

    expect(current).toEqual({})
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
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    expect(current).toEqual({ id: '42', slug: 'hello' })
  })
})

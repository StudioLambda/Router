import { describe, it } from 'vitest'
import { createElement, type ReactNode, type TransitionFunction } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useIsPending } from './useIsPending'
import { TransitionContext } from 'router/react:context/TransitionContext'

describe('useIsPending', { concurrent: true }, function () {
  it('throws when used outside a provider', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return useIsPending()
      })
    }).toThrow('useIsPending requires a <Router> or <TransitionContext> provider')
  })

  it('returns false when transition is not pending', function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition that is never called during
     * this test. Only the isPending boolean matters.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    /**
     * Wrapper providing TransitionContext with a non-pending
     * transition tuple.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(TransitionContext, { value: tuple }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useIsPending()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    expect(current).toBe(false)
  })

  it('returns true when transition is pending', function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition for the pending state test.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [true, startTransition]

    /**
     * Wrapper providing TransitionContext with a pending
     * transition tuple.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(TransitionContext, { value: tuple }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useIsPending()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    expect(current).toBe(true)
  })
})

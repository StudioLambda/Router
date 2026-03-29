import { describe, it, vi } from 'vitest'
import { createElement, type ReactNode, type TransitionFunction } from 'react'
import { renderHook } from 'router/react:test-helpers'
import { useNavigationHandlers } from './useNavigationHandlers'
import { TransitionContext } from 'router/react:context/TransitionContext'

describe('useNavigationHandlers', { concurrent: true }, function () {
  it('throws when used outside a provider and no transition is passed', function ({ expect }) {
    expect(function () {
      renderHook(function () {
        return useNavigationHandlers()
      })
    }).toThrow('useNavigationHandlers requires a <Router> or <TransitionContext> provider')
  })

  it('returns createPrecommitHandler and createHandler functions', function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition for testing handler creation.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    const { current, unmount } = renderHook(function () {
      return useNavigationHandlers(tuple)
    })

    onTestFinished(unmount)

    expect(typeof current.createPrecommitHandler).toBe('function')
    expect(typeof current.createHandler).toBe('function')
  })

  it('createPrecommitHandler returns undefined when no prefetch is given', function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition for the undefined prefetch test.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    const { current, unmount } = renderHook(function () {
      return useNavigationHandlers(tuple)
    })

    onTestFinished(unmount)

    const result = current.createPrecommitHandler()

    expect(result).toBeUndefined()
  })

  it('createPrecommitHandler returns a function when prefetch is given', function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition for the prefetch test.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    const { current, unmount } = renderHook(function () {
      return useNavigationHandlers(tuple)
    })

    onTestFinished(unmount)

    const prefetchSpy = vi.fn()
    const handler = current.createPrecommitHandler(prefetchSpy)

    expect(typeof handler).toBe('function')
  })

  it('createPrecommitHandler calls the prefetch function with the controller', async function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition for the prefetch invocation test.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    const { current, unmount } = renderHook(function () {
      return useNavigationHandlers(tuple)
    })

    onTestFinished(unmount)

    const prefetchSpy = vi.fn()
    const handler = current.createPrecommitHandler(prefetchSpy)!

    const mockController = {
      redirect: vi.fn(),
      addHandler: vi.fn(),
    } as unknown as NavigationPrecommitController

    await handler(mockController)

    expect(prefetchSpy).toHaveBeenCalledWith(mockController)
  })

  it('createHandler returns a function that wraps callback in startTransition', function ({ expect, onTestFinished }) {
    const transitionCalls: TransitionFunction[] = []

    /**
     * Captures the callback passed to startTransition so
     * we can verify it was called correctly.
     */
    function startTransition(cb: TransitionFunction) {
      transitionCalls.push(cb)
    }

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    const { current, unmount } = renderHook(function () {
      return useNavigationHandlers(tuple)
    })

    onTestFinished(unmount)

    const callbackSpy = vi.fn()
    const handler = current.createHandler(callbackSpy)

    expect(typeof handler).toBe('function')

    handler()

    expect(transitionCalls).toHaveLength(1)
  })

  it('reads transition from TransitionContext when not passed directly', function ({ expect, onTestFinished }) {
    /**
     * Stub startTransition for the context-based test.
     */
    function startTransition(_cb: TransitionFunction) {}

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    /**
     * Wrapper providing TransitionContext for the hook
     * to read from when no direct argument is given.
     */
    function Wrapper({ children }: { children: ReactNode }) {
      return createElement(TransitionContext, { value: tuple }, children)
    }

    const { current, unmount } = renderHook(
      function () {
        return useNavigationHandlers()
      },
      { wrapper: Wrapper },
    )

    onTestFinished(unmount)

    expect(typeof current.createPrecommitHandler).toBe('function')
    expect(typeof current.createHandler).toBe('function')
  })

  it('createHandler rejects the promise when the callback throws', async function ({ expect, onTestFinished }) {
    /**
     * Custom startTransition that immediately invokes the
     * callback so errors propagate synchronously through
     * the promise chain. This simulates how React's async
     * transition works when the callback rejects.
     */
    function startTransition(cb: TransitionFunction) {
      void cb()
    }

    const tuple: [boolean, typeof startTransition] = [false, startTransition]

    const { current, unmount } = renderHook(function () {
      return useNavigationHandlers(tuple)
    })

    onTestFinished(unmount)

    const testError = new Error('transition failed')

    /**
     * Callback that throws an error, which should be caught
     * by the try/catch inside createHandler and forwarded
     * to the promise rejection.
     */
    const throwingCallback: TransitionFunction = async function () {
      throw testError
    }

    const handler = current.createHandler(throwingCallback)

    await expect(handler()).rejects.toBe(testError)
  })
})

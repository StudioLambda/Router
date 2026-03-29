import { type TransitionFunction, use, useTransition } from 'react'
import { TransitionContext } from 'router/react:context/TransitionContext'
import { type PrefetchFunc, type PrefetchContext } from 'router/react:router'

/**
 * Options for creating a precommit handler that forwards
 * route context to the prefetch function.
 */
export interface PrecommitHandlerOptions {
  /**
   * The prefetch function from the matched route handler.
   * When undefined, no precommit handler is created.
   */
  readonly prefetch?: PrefetchFunc

  /**
   * Dynamic route parameters extracted from the matched
   * URL pattern.
   */
  readonly params: Record<string, string>

  /**
   * The destination URL being navigated to.
   */
  readonly url: URL
}

/**
 * Creates handler functions for the Navigation API's
 * `event.intercept()` method. The precommit handler runs
 * prefetch logic before the URL commits; the handler runs
 * the React state transition after the URL commits.
 *
 * Accepts an optional `transition` tuple to use directly.
 * When omitted, reads from TransitionContext instead. The
 * Router component passes its own transition tuple here to
 * avoid a circular dependency — the Router provides the
 * TransitionContext in its JSX return, but needs the
 * handlers during render before that provider exists in
 * the tree.
 *
 * @param transition - Optional `useTransition()` tuple to
 *   use instead of reading from TransitionContext. Pass
 *   this when calling from within the component that
 *   provides TransitionContext.
 * @throws When no transition tuple is provided and the
 *   hook is used outside a TransitionContext provider.
 */
export function useNavigationHandlers(transition?: ReturnType<typeof useTransition>) {
  const contextTransition = transition ?? use(TransitionContext)

  if (contextTransition === null) {
    throw new Error('useNavigationHandlers requires a <Router> or <TransitionContext> provider')
  }

  const [, startTransition] = contextTransition

  /**
   * Creates a precommit handler that constructs a
   * `PrefetchContext` from the matched route information
   * and forwards it to the route's prefetch function.
   * Runs before the URL commits, so no React state
   * transitions are needed here.
   */
  function createPrecommitHandler(options: PrecommitHandlerOptions) {
    if (options.prefetch === undefined) {
      return undefined
    }

    const prefetch = options.prefetch

    return async function (controller: NavigationPrecommitController) {
      const context: PrefetchContext = {
        params: options.params,
        url: options.url,
        controller,
      }

      await prefetch(context)
    }
  }

  /**
   * Creates a post-commit handler that wraps the state
   * update in a React async transition for concurrent
   * rendering. The promise resolves only after the async
   * transition callback completes, ensuring the Navigation
   * API waits for React to finish rendering before firing
   * `navigatesuccess` and performing scroll restoration.
   *
   * @param callback - The transition function containing
   *   the state update to perform after the URL commits.
   */
  function createHandler(callback: TransitionFunction) {
    return function handler() {
      return new Promise<void>(function (resolve, reject) {
        startTransition(async function () {
          try {
            await callback()
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })
    }
  }

  return { createPrecommitHandler, createHandler }
}

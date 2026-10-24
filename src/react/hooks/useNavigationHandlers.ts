import { type TransitionFunction, use, useTransition } from 'react'
import { TransitionContext } from 'router/react:context/TransitionContext'
import { type GuardFunc, type PrefetchFunc, type PrefetchContext } from 'router/react:router'

/**
 * Options for creating a precommit handler that forwards
 * route context to mandatory guards and optional prefetch functions.
 *
 * @example
 * ```ts
 * createPrecommitHandler({ guard: requireSession, params: {}, url })
 * ```
 */
export interface PrecommitHandlerOptions {
  /**
   * Mandatory check awaited before prefetch. Failure rejects precommit,
   * preventing the associated content update or custom form action.
   * @example
   * ```ts
   * createPrecommitHandler({ guard: requireSession, params: {}, url })
   * ```
   */
  readonly guard?: GuardFunc

  /**
   * The prefetch function from the matched route handler.
   * When both prefetch and guard are undefined, no handler is created.
   *
   * @example
   * ```ts
   * createPrecommitHandler({ prefetch: loadPageData, params: {}, url })
   * ```
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
 * mandatory guards then prefetch before the URL commits; the handler runs
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
 *
 * @example
 * ```tsx
 * function CustomRouter() {
 *   const transition = useTransition()
 *   const { createHandler } = useNavigationHandlers(transition)
 *   // use createHandler to build intercept handlers
 * }
 * ```
 */
export function useNavigationHandlers(transition?: ReturnType<typeof useTransition>) {
  const contextTransition = transition ?? use(TransitionContext)

  if (contextTransition === null) {
    throw new Error('useNavigationHandlers requires a <Router> or <TransitionContext> provider')
  }

  const [, startTransition] = contextTransition

  /**
   * Creates a precommit handler that constructs a
   * `PrefetchContext` from the matched route information, awaits mandatory
   * guards, and only then forwards context to optional prefetch. Rejection
   * propagates to the Navigation API and prevents the post-commit handler.
   * Runs before the URL commits, so no React state
   * transitions are needed here.
   */
  function createPrecommitHandler(options: PrecommitHandlerOptions) {
    if (options.guard === undefined && options.prefetch === undefined) {
      return undefined
    }

    return async function (controller: NavigationPrecommitController) {
      const context: PrefetchContext = {
        params: options.params,
        url: options.url,
        controller,
      }

      await options.guard?.({ params: options.params, url: options.url })
      await options.prefetch?.(context)
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

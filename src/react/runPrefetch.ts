import { type PrefetchContext, type PrefetchFunc } from './router'

/**
 * Runs one prefetch and reports successful controller redirects, including
 * redirects to the same URL. The native controller retains ownership of URL
 * validation, history options, and added postcommit handlers. Errors propagate
 * so the Navigation API can reject the navigation before commit.
 *
 * @example
 * const redirected = await runPrefetch(handler.prefetch, context)
 * if (redirected) return
 */
export async function runPrefetch(
  prefetch: PrefetchFunc | undefined,
  context: PrefetchContext
): Promise<boolean> {
  /** Tracks redirects even when the destination URL does not change. */
  let hasRedirected = false

  await prefetch?.({
    ...context,
    controller: {
      /**
       * Forwards native validation and history/state options unchanged.
       * Failed redirects throw without marking the prefetch as redirected.
       */
      redirect(url, options) {
        context.controller.redirect(url, options)
        hasRedirected = true
      },
      /**
       * Registers postcommit work on the original controller, preserving
       * the native receiver required by Web IDL methods.
       */
      addHandler(handler) {
        context.controller.addHandler(handler)
      },
    },
  })

  return hasRedirected
}

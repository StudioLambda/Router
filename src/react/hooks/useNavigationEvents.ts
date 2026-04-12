import { useEffect, useEffectEvent } from 'react'

/**
 * Callbacks for navigation lifecycle events. All callbacks
 * are optional — only provided callbacks are subscribed.
 */
export interface NavigationEventHandlers {
  /**
   * Called when a same-document navigation is initiated.
   * The Router uses this to intercept the event, match
   * the destination URL, and trigger a React transition.
   */
  readonly onNavigate?: (event: NavigateEvent) => void

  /**
   * Called after a navigation completes successfully.
   * Fires in sync with the Navigation API's
   * `navigatesuccess` event.
   */
  readonly onNavigateSuccess?: () => void

  /**
   * Called when a navigation fails. Receives the error
   * extracted from the Navigation API's `navigateerror`
   * ErrorEvent.
   *
   * @param error - The error that caused the navigation
   *   to fail.
   */
  readonly onNavigateError?: (error: unknown) => void
}

/**
 * Subscribes to the Navigation API's `navigate`,
 * `navigatesuccess`, and `navigateerror` events on the
 * given navigation object. All callbacks are wrapped in
 * `useEffectEvent` so the effects only depend on the
 * navigation instance itself — inline arrow functions
 * from the caller don't cause unnecessary re-subscriptions.
 *
 * Cleans up all listeners on unmount or when the navigation
 * instance changes.
 *
 * @param navigation - The Navigation object to subscribe to.
 * @param handlers - Callbacks for each navigation lifecycle
 *   event. All are optional.
 *
 * @example
 * ```tsx
 * function NavigationLogger() {
 *   const navigation = useNavigation()
 *
 *   useNavigationEvents(navigation, {
 *     onNavigateSuccess() {
 *       console.log('navigation completed')
 *     },
 *     onNavigateError(error) {
 *       console.error('navigation failed', error)
 *     },
 *   })
 *
 *   return null
 * }
 * ```
 */
export function useNavigationEvents(navigation: Navigation, handlers: NavigationEventHandlers) {
  /**
   * Stable wrapper for the navigate event callback. Reads
   * the latest `onNavigate` handler on each invocation
   * without causing the subscription effect to re-run.
   */
  const onNavigate = useEffectEvent(function (event: NavigateEvent) {
    handlers.onNavigate?.(event)
  })

  /**
   * Stable wrapper for the navigatesuccess callback.
   */
  const onSuccess = useEffectEvent(function () {
    handlers.onNavigateSuccess?.()
  })

  /**
   * Stable wrapper for the navigateerror callback.
   * Extracts the error from the ErrorEvent before
   * forwarding to the handler.
   */
  const onError = useEffectEvent(function (event: Event) {
    handlers.onNavigateError?.((event as ErrorEvent).error)
  })

  /**
   * Subscribes to all three navigation lifecycle events.
   * A single effect handles all subscriptions since they
   * share the same dependency (the navigation object) and
   * the same lifecycle (subscribe on mount, clean up on
   * unmount or navigation change).
   */
  useEffect(
    function () {
      navigation.addEventListener('navigate', onNavigate)
      navigation.addEventListener('navigatesuccess', onSuccess)
      navigation.addEventListener('navigateerror', onError)

      return function () {
        navigation.removeEventListener('navigate', onNavigate)
        navigation.removeEventListener('navigatesuccess', onSuccess)
        navigation.removeEventListener('navigateerror', onError)
      }
    },
    [navigation]
  )
}

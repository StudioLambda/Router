import { useEffect, useState } from 'react'
import { useNavigation } from 'router/react:hooks/useNavigation'

/**
 * Return value from the `useForward` hook, providing both
 * a traversal function and a boolean indicating whether
 * forward navigation is possible.
 */
export interface UseForwardResult {
  /**
   * Navigates forward in the session history. Delegates
   * to `navigation.forward()` from the Navigation API.
   *
   * @param options - Optional navigation options such as
   *   `info` to pass data to the navigate event handler.
   * @returns The NavigationResult with `committed` and
   *   `finished` promises.
   */
  readonly forward: (options?: NavigationOptions) => NavigationResult

  /**
   * Whether forward navigation is possible. Mirrors
   * `navigation.canGoForward` from the Navigation API.
   * Reactively updates when navigations change the
   * history stack. When false, calling `forward()` will
   * throw.
   */
  readonly canGoForward: boolean
}

/**
 * Provides forward navigation capabilities using the
 * Navigation API. Returns a `forward` function and a
 * `canGoForward` boolean that reflects whether the history
 * stack has a next entry to traverse to.
 *
 * The `canGoForward` value is kept in React state and
 * updated via the `currententrychange` event, ensuring
 * it stays reactive across navigations — including those
 * triggered outside of React (e.g. browser forward button).
 *
 * Must be used inside a `<Router>` component tree.
 *
 * @returns An object with `forward` and `canGoForward`.
 *
 * @example
 * ```tsx
 * function ForwardButton() {
 *   const { forward, canGoForward } = useForward()
 *
 *   return (
 *     <button onClick={forward} disabled={!canGoForward}>
 *       Go Forward
 *     </button>
 *   )
 * }
 * ```
 */
export function useForward(): UseForwardResult {
  const navigation = useNavigation()
  const [canGoForward, setCanGoForward] = useState(navigation.canGoForward)

  useEffect(
    function () {
      /**
       * Syncs the React state with the Navigation API's
       * `canGoForward` property whenever the current entry
       * changes.
       */
      function onEntryChange() {
        setCanGoForward(navigation.canGoForward)
      }

      navigation.addEventListener('currententrychange', onEntryChange)

      return function () {
        navigation.removeEventListener('currententrychange', onEntryChange)
      }
    },
    [navigation]
  )

  /**
   * Traverses forward in the session history by
   * delegating to `navigation.forward()`.
   */
  function forward(options?: NavigationOptions) {
    return navigation.forward(options)
  }

  return {
    forward,
    canGoForward,
  }
}

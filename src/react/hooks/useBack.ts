import { useEffect, useState } from 'react'
import { useNavigation } from 'router/react:hooks/useNavigation'

/**
 * Return value from the `useBack` hook, providing both
 * a traversal function and a boolean indicating whether
 * backward navigation is possible.
 */
export interface UseBackResult {
  /**
   * Navigates backward in the session history. Delegates
   * to `navigation.back()` from the Navigation API.
   *
   * @param options - Optional navigation options such as
   *   `info` to pass data to the navigate event handler.
   * @returns The NavigationResult with `committed` and
   *   `finished` promises.
   */
  readonly back: (options?: NavigationOptions) => NavigationResult

  /**
   * Whether backward navigation is possible. Mirrors
   * `navigation.canGoBack` from the Navigation API.
   * Reactively updates when navigations change the
   * history stack. When false, calling `back()` will throw.
   */
  readonly canGoBack: boolean
}

/**
 * Provides backward navigation capabilities using the
 * Navigation API. Returns a `back` function and a
 * `canGoBack` boolean that reflects whether the history
 * stack has a previous entry to traverse to.
 *
 * The `canGoBack` value is kept in React state and
 * updated via the `currententrychange` event, ensuring
 * it stays reactive across navigations — including those
 * triggered outside of React (e.g. browser back button).
 *
 * Must be used inside a `<Router>` component tree.
 *
 * @returns An object with `back` and `canGoBack`.
 *
 * @example
 * ```tsx
 * function BackButton() {
 *   const { back, canGoBack } = useBack()
 *
 *   return (
 *     <button onClick={back} disabled={!canGoBack}>
 *       Go Back
 *     </button>
 *   )
 * }
 * ```
 */
export function useBack(): UseBackResult {
  const navigation = useNavigation()
  const [canGoBack, setCanGoBack] = useState(navigation.canGoBack)

  useEffect(
    function () {
      /**
       * Syncs the React state with the Navigation API's
       * `canGoBack` property whenever the current entry
       * changes.
       */
      function onEntryChange() {
        setCanGoBack(navigation.canGoBack)
      }

      navigation.addEventListener('currententrychange', onEntryChange)

      return function () {
        navigation.removeEventListener('currententrychange', onEntryChange)
      }
    },
    [navigation]
  )

  /**
   * Traverses backward in the session history by
   * delegating to `navigation.back()`.
   */
  function back(options?: NavigationOptions) {
    return navigation.back(options)
  }

  return {
    back,
    canGoBack,
  }
}

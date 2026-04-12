import { use } from 'react'
import { NavigationContext } from 'router/react:context/NavigationContext'

/**
 * Returns the native browser Navigation object from context.
 * Gives full access to the Navigation API: `entries()`,
 * `traverseTo()`, `updateCurrentEntry()`, `canGoBack`,
 * `canGoForward`, `transition`, `currentEntry`, etc.
 *
 * Must be used inside a `<Router>` or a component tree
 * that provides a `<NavigationContext>` value.
 *
 * @returns The Navigation object from the nearest provider.
 * @throws When used outside a NavigationContext provider.
 *
 * @example
 * ```tsx
 * function HistoryDebug() {
 *   const navigation = useNavigation()
 *   const entries = navigation.entries()
 *
 *   return <pre>{JSON.stringify(entries.map(e => e.url))}</pre>
 * }
 * ```
 */
export function useNavigation(): Navigation {
  const navigation = use(NavigationContext)

  if (navigation === null) {
    throw new Error('useNavigation requires a <Router> or <NavigationContext> provider')
  }

  return navigation
}

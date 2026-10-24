import { createContext } from 'react'

/**
 * Provides the native browser Navigation object through React context.
 *
 * Defaults to `null` — the Router component provides the real value.
 * This avoids accessing `window.navigation` at module scope, which
 * would crash in SSR, testing, or non-browser environments.
 *
 * The `useNavigation` hook throws a descriptive error when consumed
 * without a provider.
 * @example
 * ```tsx
 * const navigation = createMemoryNavigation({ url: 'https://example.com/' })
 * const app = <NavigationContext value={navigation}><Router matcher={matcher} /></NavigationContext>
 * ```
 */
export const NavigationContext = createContext<Navigation | null>(null)

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
 */
export const NavigationContext = createContext<Navigation>(null as unknown as Navigation)

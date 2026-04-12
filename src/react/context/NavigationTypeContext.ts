import { createContext } from 'react'

/**
 * Provides the navigation type of the most recent NavigateEvent
 * (`push`, `replace`, `reload`, or `traverse`). Allows route
 * components to vary behavior based on how they were reached.
 *
 * Defaults to `undefined` when no Router is present — the
 * `useNavigationType` hook throws in this case. The Router
 * provides `null` on initial render (before any navigation
 * event), which is distinct from the `undefined` sentinel.
 */
export const NavigationTypeContext = createContext<NavigationType | null | undefined>(undefined)

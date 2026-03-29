import { createContext } from 'react'

/**
 * Provides the navigation type of the most recent NavigateEvent
 * (`push`, `replace`, `reload`, or `traverse`). Allows route
 * components to vary behavior based on how they were reached.
 */
export const NavigationTypeContext = createContext<NavigationType | null>(null)

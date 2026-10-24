import { createContext } from 'react'

/**
 * Provides the navigation type associated with the rendered route
 * (`push`, `replace`, `reload`, or `traverse`). Allows route
 * components to vary behavior based on how they were reached.
 *
 * Defaults to `undefined` when no Router is present — the
 * `useNavigationType` hook throws in this case. The Router
 * provides `null` initially, distinct from the `undefined` sentinel. Failed
 * checks and unchanged custom form actions do not replace the stored type.
 * @example
 * ```tsx
 * const view = <NavigationTypeContext value="traverse"><Page /></NavigationTypeContext>
 * // Page can call useNavigationType() to select a traversal animation.
 * ```
 */
export const NavigationTypeContext = createContext<NavigationType | null | undefined>(undefined)

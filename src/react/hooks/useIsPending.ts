import { use } from 'react'
import { TransitionContext } from 'router/react:context/TransitionContext'

/**
 * Returns whether a navigation transition is currently pending.
 * This reflects the `isPending` value from the `useTransition`
 * tuple managed by the Router component.
 *
 * Useful for displaying loading indicators, progress bars, or
 * adjusting UI opacity while a route transition is in progress.
 *
 * Must be used inside a `<Router>` component tree or a
 * `<TransitionContext>` provider.
 *
 * @returns `true` while a navigation transition is pending,
 *   `false` otherwise.
 * @throws When used outside a TransitionContext provider.
 *
 * @example
 * ```tsx
 * function NavBar() {
 *   const isPending = useIsPending()
 *
 *   return (
 *     <nav style={{ opacity: isPending ? 0.7 : 1 }}>
 *       ...
 *     </nav>
 *   )
 * }
 * ```
 */
export function useIsPending(): boolean {
  const transition = use(TransitionContext)

  if (transition === null) {
    throw new Error('useIsPending requires a <Router> or <TransitionContext> provider')
  }

  return transition[0]
}

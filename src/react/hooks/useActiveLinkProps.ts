import { use } from 'react'
import { PathnameContext } from 'router/react:context/PathnameContext'
import { extractPathname } from 'router/react:extractPathname'

/**
 * Options for the `useActiveLinkProps` hook.
 */
export interface ActiveLinkOptions {
  /**
   * When true, the link is only considered active when
   * the current pathname exactly matches the href
   * pathname. When false, the link is active when the
   * current pathname starts with the href pathname,
   * which is useful for parent navigation items that
   * should highlight when any child route is active.
   *
   * Defaults to `true`.
   */
  exact?: boolean
}

/**
 * Props returned by the hook to spread onto an anchor
 * element for active link styling and accessibility.
 */
export interface ActiveLinkProps {
  /**
   * Present (set to `true`) when the link is active.
   * Absent (`undefined`) when inactive. Use the
   * `a[data-active]` CSS selector for styling.
   */
  'data-active': true | undefined

  /**
   * Set to `'page'` when the link is active to indicate
   * to assistive technologies that this link represents
   * the current page. Absent when inactive.
   */
  'aria-current': 'page' | undefined
}

/**
 * Computes active link attributes for an anchor element
 * by comparing its href against the current pathname from
 * the Router's PathnameContext.
 *
 * Returns a props object containing `data-active` and
 * `aria-current` attributes ready to spread onto an `<a>`
 * element or any element that should reflect active state.
 *
 * Also returns an `isActive` boolean for conditional logic
 * like dynamic class names.
 *
 * Must be used inside a `<Router>` component tree where
 * `PathnameContext` is provided.
 *
 * @param href - The href to compare against the current
 *   pathname. When undefined, the link is never active.
 * @param options - Optional configuration for exact vs
 *   prefix matching.
 * @returns An object with `isActive` boolean and `props`
 *   to spread onto the element.
 *
 * @example
 * ```tsx
 * function NavItem({ href, children }: NavItemProps) {
 *   const { isActive, props } = useActiveLinkProps(href)
 *
 *   return (
 *     <a href={href} className={isActive ? 'active' : ''} {...props}>
 *       {children}
 *     </a>
 *   )
 * }
 * ```
 */
export function useActiveLinkProps(
  href: string | undefined,
  options?: ActiveLinkOptions
): { isActive: boolean; props: ActiveLinkProps } {
  const currentPathname = use(PathnameContext)

  if (currentPathname === null) {
    return {
      isActive: false,
      props: {
        'data-active': undefined,
        'aria-current': undefined,
      },
    }
  }

  const isExact = options?.exact ?? true

  const isActive = isActiveHref(href, currentPathname, isExact)

  return {
    isActive,
    props: {
      'data-active': isActive || undefined,
      'aria-current': isActive ? 'page' : undefined,
    },
  }
}

/**
 * Determines whether an href should be considered active
 * by comparing its pathname against the current router
 * pathname. Handles undefined hrefs, exact matching, and
 * prefix matching for parent-level navigation items.
 *
 * @param href - The href string to test. Returns false
 *   when undefined.
 * @param currentPathname - The current pathname from the
 *   router's PathnameContext.
 * @param isExact - Whether to require an exact match or
 *   allow prefix matching.
 * @returns True when the href should be marked as active.
 */
function isActiveHref(
  href: string | undefined,
  currentPathname: string,
  isExact: boolean
): boolean {
  if (href === undefined) {
    return false
  }

  const linkPathname = extractPathname(href)

  if (isExact) {
    return linkPathname === currentPathname
  }

  return currentPathname === linkPathname || currentPathname.startsWith(linkPathname + '/')
}

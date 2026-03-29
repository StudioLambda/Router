import { type AnchorHTMLAttributes, useRef } from 'react'
import { useActiveLinkProps } from 'router/react:hooks/useActiveLinkProps'
import { type PrefetchStrategy, usePrefetchEffect } from 'router/react:hooks/usePrefetchEffect'
import { type Handler } from 'router/react:router'
import { type Matcher } from 'router:matcher'

/**
 * State passed to the className function variant, allowing
 * consumers to dynamically compute class names based on the
 * link's active state.
 */
export interface LinkRenderProps {
  /**
   * Whether this link's href matches the current pathname.
   * True for both exact and prefix matches depending on
   * the `activeExact` prop.
   */
  readonly isActive: boolean
}

/**
 * Props for the Link component, extending standard anchor
 * element attributes with router-specific prefetch behavior
 * and active link detection.
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  /**
   * Prefetch trigger strategy. When set to `'hover'`,
   * prefetch fires on mouseenter. When set to `'viewport'`,
   * prefetch fires when the link enters the viewport via
   * IntersectionObserver. When omitted, no proactive
   * prefetch is performed — the Navigation API handles
   * it during the click navigation.
   */
  prefetch?: PrefetchStrategy

  /**
   * Whether to only prefetch once. When true, hover
   * listeners use the `{ once }` option and viewport
   * observers disconnect after the first intersection.
   * Defaults to `true`.
   */
  once?: boolean

  /**
   * Optional matcher override. When omitted, reads from
   * `MatcherContext`. Useful when you need to prefetch
   * against a specific set of routes.
   */
  matcher?: Matcher<Handler>

  /**
   * CSS class name(s) for the anchor element. Accepts either
   * a static string or a function that receives the link's
   * active state and returns a class name string. The function
   * form is useful for conditional styling based on whether
   * the link is currently active.
   *
   * @example
   * ```tsx
   * <Link
   *   href="/about"
   *   className={({ isActive }) => isActive ? 'nav-active' : 'nav-link'}
   * />
   * ```
   */
  className?: string | ((props: LinkRenderProps) => string)

  /**
   * When true, the link is only considered active when the
   * current pathname exactly matches the href pathname.
   * When false, the link is active when the current
   * pathname starts with the href pathname, which is useful
   * for parent navigation items that should highlight when
   * any child route is active.
   *
   * Defaults to `true`.
   */
  activeExact?: boolean
}

/**
 * Renders an anchor element that integrates with the router's
 * prefetch system and active link detection. The Navigation
 * API intercepts the click natively, so no `onClick` or
 * `preventDefault` is needed.
 *
 * Supports two proactive prefetch strategies: `hover`
 * (prefetch on mouseenter) and `viewport` (prefetch when
 * the link scrolls into view via IntersectionObserver).
 * When `prefetch` is omitted, no proactive prefetch is
 * performed.
 *
 * When the link's href matches the current pathname, the
 * component adds `data-active` and `aria-current="page"`
 * attributes. The `className` prop can be a function that
 * receives `{ isActive }` for dynamic class computation.
 */
export function Link({
  prefetch,
  once = true,
  href,
  matcher,
  className,
  activeExact = true,
  ...props
}: LinkProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const { isActive, props: activeProps } = useActiveLinkProps(href, { exact: activeExact })

  usePrefetchEffect(ref, { href, on: prefetch, once, matcher })

  const resolvedClassName = typeof className === 'function'
    ? className({ isActive })
    : className

  return (
    <a
      ref={ref}
      href={href}
      className={resolvedClassName}
      {...activeProps}
      {...props}
    />
  )
}

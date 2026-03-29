import { type ReactNode, type ComponentType } from 'react'

/**
 * Defines the route handler configuration for a matched route.
 * Contains the component to render, optional prefetch logic,
 * middleware components, scroll/focus behavior, and form handling.
 */
export interface Handler {
  /**
   * The React component to render for this route.
   * Can be a regular component or a `lazy()` component
   * for code-split routes.
   */
  readonly component: ComponentType

  /**
   * Optional prefetch function invoked during the precommit phase.
   * Receives a context with matched route params, destination URL,
   * and the precommit controller for redirects.
   */
  readonly prefetch?: PrefetchFunc

  /**
   * Middleware components that wrap the route component.
   * Applied via reduceRight so the first middleware in
   * the array wraps outermost, and the last wraps innermost.
   */
  readonly middlewares?: ComponentType<MiddlewareProps>[]

  /**
   * Controls whether the browser performs scroll restoration
   * after the navigation handler completes.
   * - `after-transition` (default): browser handles scrolling
   *   after the handler promise resolves.
   * - `manual`: disables automatic scrolling so the route
   *   component can call `event.scroll()` manually.
   */
  readonly scroll?: NavigationScrollBehavior

  /**
   * Controls whether the browser resets focus after navigation.
   * - `after-transition` (default): focuses the first autofocus
   *   element or the body after the handler resolves.
   * - `manual`: disables automatic focus reset so the route
   *   component can manage focus manually.
   */
  readonly focusReset?: NavigationFocusReset

  /**
   * Optional handler for form submissions (POST navigations).
   * When a navigation includes FormData and the matched route
   * has a formHandler, it is called instead of the normal
   * component render flow.
   */
  readonly formHandler?: FormHandler
}

/**
 * Context passed to prefetch functions during the precommit
 * phase of a navigation. Provides the matched route parameters,
 * the destination URL, and the Navigation API's precommit
 * controller for redirects.
 */
export interface PrefetchContext {
  /**
   * Dynamic route parameters extracted from the matched URL
   * pattern. For example, a route registered as `/user/:id`
   * matching `/user/42` produces `{ id: '42' }`.
   */
  readonly params: Record<string, string>

  /**
   * The full destination URL being navigated to. Includes
   * the pathname, search parameters, and hash. Useful for
   * constructing query keys or reading search params during
   * prefetch.
   */
  readonly url: URL

  /**
   * The precommit controller from the Navigation API,
   * providing `redirect()` to abort the current navigation
   * and redirect elsewhere, and `addHandler()` to register
   * additional post-commit handlers. When prefetch is
   * triggered outside a real navigation (e.g. Link hover),
   * this is a stub with no-op methods.
   */
  readonly controller: NavigationPrecommitController
}

/**
 * Function invoked during the precommit phase of a navigation.
 * Receives a context object with the matched route parameters,
 * destination URL, and the Navigation API's precommit controller
 * for redirects or additional handler registration.
 *
 * @param context - The prefetch context containing route params,
 *   destination URL, and the precommit controller.
 * @returns Void or a promise that resolves when prefetching
 *   is complete.
 */
export type PrefetchFunc = {
  (context: PrefetchContext): void | Promise<void>
}

/**
 * Handler invoked when a form submission navigation matches
 * this route. Receives the submitted FormData and the original
 * NavigateEvent for full access to the navigation context.
 *
 * @param formData - The FormData from the submitted form.
 * @param event - The original NavigateEvent that triggered
 *   the form submission.
 * @returns Void or a promise that resolves when the form
 *   submission handling is complete.
 */
export type FormHandler = {
  (formData: FormData, event: NavigateEvent): void | Promise<void>
}

/**
 * Props passed to middleware wrapper components. Each middleware
 * receives `children` and decides whether to render them,
 * enabling patterns like authentication guards and layout
 * wrappers.
 */
export interface MiddlewareProps {
  /**
   * The downstream content to render. A middleware can choose
   * to render this directly, wrap it in additional providers,
   * or omit it entirely (e.g. for auth redirects).
   */
  children: ReactNode
}

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
   * Optional prefetch awaited before updating the rendered route.
   * Runs before URL commit for cancelable navigations, but after commit
   * for noncancelable, interceptable events such as history traversal.
   * Rejection prevents the route update; an already committed URL remains.
   * See {@link PrefetchContext.controller} for redirect limitations.
   *
   * @example
   * ```ts
   * matcher.register('/user/:id', {
   *   component: UserPage,
   *   prefetch: async ({ params }) => { await loadUser(params.id) },
   * })
   * ```
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
 * Context passed to prefetch functions before the rendered route updates.
 * Noncancelable navigations run prefetch after URL commit; their controller
 * rejects precommit-only operations instead of emulating a redirect.
 * Hover prefetch is speculative and uses a no-op controller instead.
 *
 * @example
 * ```ts
 * const prefetch = async ({ params, url }: PrefetchContext) => {
 *   await loadUser(params.id, url.searchParams.get('tab'))
 * }
 * ```
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
   * providing `redirect()` to retarget a push/replace navigation
   * before commit, and `addHandler()` to register
   * additional post-commit handlers. When prefetch is
   * triggered outside a real navigation (e.g. Link hover),
   * this is a stub with no-op methods. For noncancelable navigations,
   * prefetch runs after commit and both methods throw InvalidStateError.
   * Native `redirect()` only supports push/replace, not traverse/reload
   * even when cancelable. No follow-up navigation is synthesized.
   *
   * @example
   * ```ts
   * // Only during a cancelable push/replace navigation:
   * const prefetch: PrefetchFunc = ({ controller }) => {
   *   controller.redirect('/login')
   * }
   * ```
   */
  readonly controller: NavigationPrecommitController
}

/**
 * Function awaited before updating the rendered route. It runs before
 * commit when cancelable, otherwise after commit. Receives matched params
 * and destination URL; controller capabilities depend on the phase and
 * navigation type (see {@link PrefetchContext.controller}).
 *
 * @param context - The prefetch context containing route params,
 *   destination URL, and the precommit controller.
 * @returns Void or a promise that resolves when prefetching
 *   is complete.
 * @example
 * ```ts
 * const prefetch: PrefetchFunc = async ({ params }) => {
 *   await loadUser(params.id)
 * }
 * ```
 */
export type PrefetchFunc = {
  (context: PrefetchContext): void | Promise<void>
}

/**
 * Target for a redirect route. Can be a static absolute path
 * string, or a callback that receives the prefetch context and
 * returns the path to redirect to. The callback form enables
 * dynamic redirects that use matched route parameters or the
 * destination URL to compute the target.
 *
 * @example
 * ```ts
 * // Static redirect
 * route('/old').redirect('/new')
 *
 * // Dynamic redirect using route params
 * route('/old-user/:id').redirect(({ params }) => `/user/${params.id}`)
 * ```
 */
export type RedirectTarget = string | ((context: PrefetchContext) => string)

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

import { type ReactNode, type ComponentType } from 'react'

/**
 * Defines the route handler configuration for a matched route.
 * Contains the component to render, optional prefetch logic,
 * middleware components, scroll/focus behavior, and form handling.
 *
 * @example
 * ```ts
 * const handler: Handler = { component: PrivatePage, guard: requireSession }
 * matcher.register('/private', handler)
 * ```
 */
export interface Handler {
  /**
   * Mandatory check before initial content, navigation, or a custom action.
   * Unlike prefetch, this never runs speculatively on hover. Throw or reject
   * to deny access; server endpoints must still authorize every request.
   *
   * @example
   * ```ts
   * const handler: Handler = { component: PrivatePage, guard: requireSession }
   * ```
   */
  readonly guard?: GuardFunc

  /**
   * The React component to render for this route.
   * Can be a regular component or a `lazy()` component
   * for code-split routes.
   * @example `const handler: Handler = { component: () => null }`
   */
  readonly component: ComponentType

  /**
   * Optional preload invoked after guards during navigation/action
   * checks, or speculatively without guards by Link/usePrefetch.
   * Not invoked on initial rendering; use `guard` for mandatory checks.
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
   * These run during rendering, after mandatory checks; they cannot gate
   * speculative prefetch or custom actions.
   * @example `const handler: Handler = { component: Page, middlewares: [Layout] }`
   */
  readonly middlewares?: ComponentType<MiddlewareProps>[]

  /**
   * Controls whether the browser performs scroll restoration
   * after the navigation handler completes.
   * - `after-transition` (default): browser handles scrolling
   *   after the handler promise resolves.
   * - `manual`: disables automatic scrolling so the route
   *   application manages scrolling. Route components receive no event prop.
   * @example `const handler: Handler = { component: Feed, scroll: 'manual' }`
   */
  readonly scroll?: NavigationScrollBehavior

  /**
   * Controls whether the browser resets focus after navigation.
   * - `after-transition` (default): focuses the first autofocus
   *   element or the body after the handler resolves.
   * - `manual`: disables automatic focus reset so the route
   *   component can manage focus manually.
   * @example `const handler: Handler = { component: Editor, focusReset: 'manual' }`
   */
  readonly focusReset?: NavigationFocusReset

  /**
   * Optional handler for form submissions (POST navigations).
   * When a navigation includes FormData and the matched route
   * has a formHandler, it is called instead of the normal
   * component render flow, after guards and prefetch complete. A check
   * failure prevents the action; backend authorization remains required.
   * When absent, POST remains native without running guards or prefetch.
   * Redirected custom actions render the checked target and do not dispatch
   * the submitted body to either the source or target action.
   *
   * @example
   * ```ts
   * const handler: Handler = { component: Page, formHandler: saveForm }
   * ```
   */
  readonly formHandler?: FormHandler
}

/**
 * Route information available to mandatory checks, including during SSR.
 * There is no redirect controller: returning permits access, while throwing
 * denies it. Handle initial failures with a React error boundary or the SSR
 * host; handle navigation failures through `onNavigateError`.
 * Objects are shared with prefetch on navigations. Treat params and URL as
 * read-only even though their JavaScript contents are mutable.
 *
 * @example
 * ```ts
 * const requireSession: GuardFunc = ({ url }) => {
 *   if (!session.canRead(url.pathname)) throw new Error('access denied')
 * }
 * ```
 */
export interface GuardContext {
  /**
   * Parameters extracted from the destination pathname, without mutation.
   * @example
   * ```ts
   * const guard: GuardFunc = ({ params }) => checkAccount(params.id)
   * ```
   */
  readonly params: Record<string, string>

  /**
   * Destination URL, including search and hash. Treat it as read-only.
   * @example
   * ```ts
   * const guard: GuardFunc = ({ url }) => checkPath(url.pathname)
   * ```
   */
  readonly url: URL
}

/**
 * Mandatory, idempotent route check. Return normally (or resolve) to allow
 * access; throw or reject to prevent content rendering or action execution.
 * Runs on initial render, including SSR, and before prefetch on intercepted
 * navigations and custom form actions. Never runs for speculative prefetch.
 *
 * Checks may repeat on remount, SSR/hydration, and React StrictMode retries;
 * they must not perform mutations. This is a UI gate, not a replacement for
 * server authorization. Asynchronous initial checks suspend the route subtree.
 * Multiple inherited checks are chained asynchronously even if each check
 * is synchronous. A lone synchronous initial check can throw immediately.
 * Noncancelable events run checks after commit: denial cannot undo that URL.
 *
 * @param context - Matched params and destination URL; do not mutate them.
 * @returns Nothing, or a promise that resolves to allow access.
 * @throws Any thrown error or rejected promise denies content/action dispatch.
 *
 * @example
 * ```ts
 * const requireSession: GuardFunc = async ({ params }) => {
 *   if (!(await session.canRead(params.id))) throw new Error('access denied')
 * }
 * ```
 */
export type GuardFunc = (context: GuardContext) => void | Promise<void>

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
   * Treat the record as read-only; values remain URL-encoded.
   * @example `const prefetch: PrefetchFunc = ({ params }) => loadUser(params.id)`
   */
  readonly params: Record<string, string>

  /**
   * The full destination URL being navigated to. Includes
   * the pathname, search parameters, and hash. Useful for
   * constructing query keys or reading search params during
   * prefetch.
   * Treat the URL as read-only; redirects use the controller instead.
   * @example `const prefetch: PrefetchFunc = ({ url }) => loadSearch(url.search)`
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
   * Router rematches successful precommit redirects, runs destination guards
   * then prefetch before commit, and stops the abandoned callback chain.
   * During speculation a redirect does not navigate or preload the target,
   * though the builder's chained prefetch stops later source callbacks.
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
 * @throws Errors and rejections propagate to intercepted navigation/action
 *   failure. Speculative callers must handle failures themselves; the once-
 *   per-pathname cache records attempts even when they fail. Never rely on
 *   prefetch for mandatory checks or assume guards ran before speculation.
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
 * @throws Errors/rejections fail the intercepted navigation. Router does not
 *   turn them into a rendered error page or undo server-side mutations.
 * @example
 * ```ts
 * const save: FormHandler = async (data, event) => {
 *   const response = await fetch('/api/contact', {
 *     method: 'POST', body: data, signal: event.signal,
 *   })
 *   if (!response.ok) throw new Error('contact submission failed')
 * }
 * ```
 */
export type FormHandler = {
  (formData: FormData, event: NavigateEvent): void | Promise<void>
}

/**
 * Props passed to middleware wrapper components. Each middleware
 * receives `children` and decides whether to render them,
 * enabling layouts and context providers. Render-time conditional content
 * is not a mandatory check: use GuardFunc to gate navigation and actions.
 * @example
 * ```tsx
 * function Layout({ children }: MiddlewareProps) {
 *   return <main>{children}</main>
 * }
 * const handler: Handler = { component: Page, middlewares: [Layout] }
 * ```
 */
export interface MiddlewareProps {
  /**
   * The downstream content to render. A middleware can choose
   * to render this directly, wrap it in additional providers,
   * or omit it entirely. Omitting content does not prevent route prefetch or
   * form actions, which have already passed the mandatory guard phase.
   * @example `function Layout({ children }: MiddlewareProps) { return <main>{children}</main> }`
   */
  children: ReactNode
}

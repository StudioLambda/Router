import { type ComponentType } from 'react'
import { createMatcher, type Matcher } from 'router:matcher'
import {
  type FormHandler,
  type Handler,
  type MiddlewareProps,
  type PrefetchContext,
  type PrefetchFunc,
  type RedirectTarget,
} from 'router/react:router'

/**
 * Accumulated configuration inherited from parent groups.
 * Passed down through nested `.group()` calls so that child
 * routes merge their own configuration with the parent's.
 */
interface InheritedConfig {
  /**
   * Path prefix accumulated from parent groups. Each group
   * that specifies a path appends it to this prefix. Child
   * route paths are concatenated after this prefix when
   * registering on the matcher.
   */
  readonly prefix: string

  /**
   * Middleware components inherited from parent groups.
   * Child routes prepend these before their own middlewares
   * so that outermost group middlewares wrap outermost.
   */
  readonly middlewares: ComponentType<MiddlewareProps>[]

  /**
   * Prefetch functions inherited from parent groups. When
   * a child route also defines a prefetch, the parent
   * functions run first (in order) followed by the child's.
   */
  readonly prefetches: PrefetchFunc[]
}

/**
 * Mutable state accumulated on a single route builder
 * instance via its chainable methods. Merged with the
 * inherited config when a terminal method is called.
 */
interface BuilderState {
  /**
   * The path segment for this route, or undefined when the
   * builder is used purely for group-level configuration.
   */
  path: string | undefined

  /**
   * Middleware components added via `.middleware()` on this
   * builder. Appended after inherited middlewares.
   */
  middlewares: ComponentType<MiddlewareProps>[]

  /**
   * Prefetch functions added via `.prefetch()` on this
   * builder. Appended after inherited prefetches.
   */
  prefetches: PrefetchFunc[]

  /**
   * Scroll restoration behavior for this route. Set via
   * `.scroll()`. Undefined means the browser default.
   */
  scroll: NavigationScrollBehavior | undefined

  /**
   * Focus reset behavior for this route. Set via
   * `.focusReset()`. Undefined means the browser default.
   */
  focusReset: NavigationFocusReset | undefined

  /**
   * Form submission handler for this route. Set via
   * `.formHandler()`.
   */
  formHandler: FormHandler | undefined
}

/**
 * Chainable route builder returned by the `route()` factory.
 * Accumulates handler configuration through method calls and
 * terminates with `.render()`, `.redirect()`, or `.group()`.
 *
 * Chainable methods (return the builder for further chaining):
 * - `.middleware()` — appends middleware components
 * - `.prefetch()` — adds a prefetch function to the chain
 * - `.scroll()` — sets scroll restoration behavior
 * - `.focusReset()` — sets focus reset behavior
 * - `.formHandler()` — sets the form submission handler
 *
 * Terminal methods:
 * - `.render()` — registers a route with a component
 * - `.redirect()` — registers a precommit redirect
 * - `.group()` — returns a scoped `RouteFactory` that
 *   inherits this builder's config
 */
export interface RouteBuilder {
  /**
   * Appends middleware components to this route or group.
   * Middlewares are applied outermost-first: inherited group
   * middlewares wrap before this route's middlewares, and
   * within the array the first element wraps outermost.
   *
   * @param list - Middleware components to append.
   * @returns The builder for further chaining.
   */
  middleware(list: ComponentType<MiddlewareProps>[]): RouteBuilder

  /**
   * Adds a prefetch function to the chain for this route
   * or group. When multiple prefetch functions are chained
   * (from parent groups and the route itself), they execute
   * sequentially: parent prefetches run first, then this
   * route's, in the order they were added.
   *
   * @param fn - The prefetch function to add.
   * @returns The builder for further chaining.
   */
  prefetch(fn: PrefetchFunc): RouteBuilder

  /**
   * Sets the scroll restoration behavior for this route.
   * - `'after-transition'` — browser handles scroll after
   *   the handler promise resolves (default).
   * - `'manual'` — disables automatic scrolling so the
   *   route component can call `event.scroll()` manually.
   *
   * @param behavior - The scroll behavior to use.
   * @returns The builder for further chaining.
   */
  scroll(behavior: NavigationScrollBehavior): RouteBuilder

  /**
   * Sets the focus reset behavior for this route.
   * - `'after-transition'` — focuses the first autofocus
   *   element after the handler resolves (default).
   * - `'manual'` — disables automatic focus reset.
   *
   * @param behavior - The focus reset behavior to use.
   * @returns The builder for further chaining.
   */
  focusReset(behavior: NavigationFocusReset): RouteBuilder

  /**
   * Sets the form submission handler for this route. When
   * a navigation includes FormData and matches this route,
   * the form handler is called instead of rendering the
   * component.
   *
   * @param fn - The form handler function.
   * @returns The builder for further chaining.
   */
  formHandler(fn: FormHandler): RouteBuilder

  /**
   * Terminal method that registers this route on the matcher
   * with the given component. Merges inherited and local
   * configuration into a `Handler` and registers it at the
   * full path (group prefix + route path).
   *
   * @param component - The React component to render.
   * @throws When no path was provided to the `route()` call
   *   and no group prefix exists.
   */
  render(component: ComponentType): void

  /**
   * Terminal method that registers a precommit redirect.
   * When the Navigation API matches this route, the
   * precommit handler calls `controller.redirect(target)`
   * before the URL commits, avoiding any component render
   * or visual flash.
   *
   * The target can be a static absolute path string, or a
   * callback that receives the prefetch context and returns
   * the path. The callback form enables dynamic redirects
   * that carry route parameters to the new location.
   *
   * The resolved target path is absolute and is NOT prefixed
   * by parent groups.
   *
   * @param target - The redirect target: a static path or a
   *   callback receiving `PrefetchContext` and returning one.
   * @throws When no path was provided to the `route()` call
   *   and no group prefix exists.
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
  redirect(target: RedirectTarget): void

  /**
   * Terminal method that creates a nested route scope.
   * Returns a `RouteFactory` whose routes inherit this
   * builder's middleware and prefetch configuration. When
   * a path was provided, it is prepended to all child
   * route paths as a prefix.
   *
   * @returns A scoped `RouteFactory` for defining child
   *   routes that inherit this builder's config.
   *
   * @example
   * ```ts
   * const admin = route('/admin').middleware([Auth]).group()
   * admin('/dashboard').render(Dashboard)
   * admin('/settings').render(Settings)
   * ```
   */
  group(): RouteFactory
}

/**
 * Factory function that creates a route builder for a given
 * path. When path is omitted, the builder is used purely for
 * group-level configuration (middleware, prefetch) without
 * contributing a path segment.
 *
 * @param path - Optional path pattern for this route. May
 *   contain dynamic (`:param`) and wildcard (`*param`)
 *   segments.
 * @returns A chainable route builder.
 */
export type RouteFactory = (path?: string) => RouteBuilder

/**
 * Joins a group prefix and a route path into a single
 * pattern string. Handles the edge cases of empty prefix,
 * empty path, double slashes, and root-only paths.
 *
 * @param prefix - The accumulated group prefix (e.g.
 *   `'/dashboard'`).
 * @param path - The route path (e.g. `'/settings'`).
 * @returns The joined path pattern.
 */
function joinPaths(prefix: string, path: string): string {
  if (prefix === '' && path === '') {
    return ''
  }

  if (prefix === '') {
    return path
  }

  if (path === '' || path === '/') {
    return prefix
  }

  const normalizedPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix

  const normalizedPath = path.startsWith('/') ? path : '/' + path

  return normalizedPrefix + normalizedPath
}

/**
 * Combines an array of prefetch functions into a single
 * `PrefetchFunc` that calls each one sequentially. Returns
 * `undefined` when the array is empty.
 *
 * @param prefetches - The prefetch functions to chain.
 * @returns A single combined prefetch function, or undefined.
 */
function chainPrefetches(prefetches: PrefetchFunc[]): PrefetchFunc | undefined {
  if (prefetches.length === 0) {
    return undefined
  }

  if (prefetches.length === 1) {
    return prefetches[0]
  }

  return async function (context: PrefetchContext) {
    for (const fn of prefetches) {
      await fn(context)
    }
  }
}

/**
 * A no-op React component used as the `component` field for
 * redirect routes. Never actually renders because the
 * precommit redirect fires before the URL commits, but the
 * `Handler` interface requires a component.
 */
function RedirectFallback() {
  return null
}

/**
 * Creates a route builder bound to a specific matcher and
 * inherited configuration. Each call to the returned factory
 * produces a fresh builder that inherits the given config.
 *
 * @param matcher - The matcher to register routes on.
 * @param inherited - Configuration from parent groups.
 * @returns A `RouteFactory` function.
 */
function createRouteFactory(matcher: Matcher<Handler>, inherited: InheritedConfig): RouteFactory {
  return function route(path?: string): RouteBuilder {
    const state: BuilderState = {
      path,
      middlewares: [],
      prefetches: [],
      scroll: undefined,
      focusReset: undefined,
      formHandler: undefined,
    }

    /**
     * Computes the full registration path by joining the
     * inherited prefix with this builder's path. Throws
     * when neither a prefix nor a path exists, since a
     * route must have a resolvable path to register.
     *
     * @returns The full path pattern.
     * @throws When both the group prefix and route path
     *   are empty or undefined.
     */
    function resolveFullPath(): string {
      const fullPath = joinPaths(inherited.prefix, state.path ?? '')

      if (fullPath === '') {
        throw new Error('cannot register a route without a path or group prefix')
      }

      return fullPath
    }

    /**
     * Merges inherited and local middlewares into a single
     * array. Returns `undefined` when no middlewares exist
     * (to match the optional `Handler.middlewares` field).
     *
     * @returns The merged middleware array, or undefined.
     */
    function resolveMiddlewares(): ComponentType<MiddlewareProps>[] | undefined {
      const merged = [...inherited.middlewares, ...state.middlewares]

      return merged.length > 0 ? merged : undefined
    }

    /**
     * Merges inherited and local prefetches into a single
     * chained function. Returns `undefined` when no
     * prefetches exist.
     *
     * @returns The chained prefetch function, or undefined.
     */
    function resolvePrefetches(): PrefetchFunc | undefined {
      return chainPrefetches([...inherited.prefetches, ...state.prefetches])
    }

    const builder: RouteBuilder = {
      middleware(list) {
        state.middlewares.push(...list)

        return builder
      },

      prefetch(fn) {
        state.prefetches.push(fn)

        return builder
      },

      scroll(behavior) {
        state.scroll = behavior

        return builder
      },

      focusReset(behavior) {
        state.focusReset = behavior

        return builder
      },

      formHandler(fn) {
        state.formHandler = fn

        return builder
      },

      render(component) {
        const fullPath = resolveFullPath()

        const handler: Handler = {
          component,
          middlewares: resolveMiddlewares(),
          prefetch: resolvePrefetches(),
          scroll: state.scroll,
          focusReset: state.focusReset,
          formHandler: state.formHandler,
        }

        matcher.register(fullPath, handler)
      },

      redirect(target) {
        const fullPath = resolveFullPath()

        const handler: Handler = {
          component: RedirectFallback,
          prefetch: function (context) {
            const resolved = typeof target === 'function' ? target(context) : target

            context.controller.redirect(resolved)
          },
        }

        matcher.register(fullPath, handler)
      },

      group() {
        const childPrefix = joinPaths(inherited.prefix, state.path ?? '')

        const childInherited: InheritedConfig = {
          prefix: childPrefix,
          middlewares: [...inherited.middlewares, ...state.middlewares],
          prefetches: [...inherited.prefetches, ...state.prefetches],
        }

        return createRouteFactory(matcher, childInherited)
      },
    }

    return builder
  }
}

/**
 * Creates a route matcher using a declarative builder API.
 * Routes are defined inside a callback that receives a
 * `route` factory function for chainable route configuration.
 *
 * The builder supports middleware inheritance, prefetch
 * chaining, nested groups with path prefixing, redirects,
 * and all handler options (scroll, focusReset, formHandler).
 *
 * Returns a `Matcher<Handler>` that plugs directly into the
 * `<Router matcher={...}>` component.
 *
 * @param callback - A function that defines routes using the
 *   provided `route` factory.
 * @returns A populated matcher ready for the Router.
 *
 * @example
 * ```tsx
 * const router = createRouter(function (route) {
 *   route('/').render(Home)
 *   route('/old').redirect('/new')
 *
 *   route('/other')
 *     .prefetch(prefetchOther)
 *     .scroll('after-transition')
 *     .render(Other)
 *
 *   const authed = route().middleware([Auth]).group()
 *   authed('/dashboard').render(Dashboard)
 *   authed('/user/:id').render(User)
 *
 *   const admin = authed('/admin')
 *     .middleware([AdminOnly])
 *     .group()
 *   admin('/settings').render(Settings)
 * })
 *
 * <Router matcher={router} />
 * ```
 */
export function createRouter(callback: (route: RouteFactory) => void): Matcher<Handler> {
  const matcher = createMatcher<Handler>()

  const rootInherited: InheritedConfig = {
    prefix: '',
    middlewares: [],
    prefetches: [],
  }

  const route = createRouteFactory(matcher, rootInherited)

  callback(route)

  return matcher
}

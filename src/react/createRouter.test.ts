import { describe, it, vi } from 'vitest'
import { createRouter, type RouteFactory } from './createRouter'
import { type ComponentType } from 'react'
import { type MiddlewareProps, type PrefetchContext, type PrefetchFunc } from './router'

/**
 * Stub component used in tests where a real React component
 * is needed but never rendered. Each test creates its own
 * stub to ensure identity comparison works correctly.
 */
function Stub() {
  return null
}

/**
 * Creates a fresh stub component with a unique identity.
 * Useful when a test needs to distinguish between multiple
 * registered components via reference equality.
 */
function createStub(): ComponentType {
  return function () {
    return null
  }
}

/**
 * Creates a fresh stub middleware component with a unique
 * identity for reference equality assertions.
 */
function createMiddleware(): ComponentType<MiddlewareProps> {
  return function ({ children }) {
    return children
  }
}

/**
 * Creates a mock PrefetchContext with spy methods on the
 * controller. Each test that needs one creates its own to
 * avoid shared state between concurrent tests.
 */
function createMockContext(): PrefetchContext {
  return {
    params: {},
    url: new URL('http://localhost/'),
    controller: {
      redirect: vi.fn(),
      addHandler: vi.fn(),
    } as unknown as NavigationPrecommitController,
  }
}

describe('createRouter', { concurrent: true }, function () {
  describe('basic registration', { concurrent: true }, function () {
    it('registers a route and matches it', function ({ expect }) {
      const Home = createStub()

      const router = createRouter(function (route) {
        route('/').render(Home)
      })

      const match = router.match('/')

      expect(match).not.toBeNull()
      expect(match?.handler.component).toBe(Home)
    })

    it('registers multiple routes', function ({ expect }) {
      const Home = createStub()
      const About = createStub()
      const Contact = createStub()

      const router = createRouter(function (route) {
        route('/').render(Home)
        route('/about').render(About)
        route('/contact').render(Contact)
      })

      expect(router.match('/')?.handler.component).toBe(Home)
      expect(router.match('/about')?.handler.component).toBe(About)
      expect(router.match('/contact')?.handler.component).toBe(Contact)
    })

    it('returns null for unregistered routes', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').render(Stub)
      })

      expect(router.match('/nope')).toBeNull()
    })

    it('registers routes with dynamic segments', function ({ expect }) {
      const User = createStub()

      const router = createRouter(function (route) {
        route('/user/:id').render(User)
      })

      const match = router.match('/user/42')

      expect(match?.handler.component).toBe(User)
      expect(match?.params).toStrictEqual({ id: '42' })
    })

    it('registers routes with wildcard segments', function ({ expect }) {
      const Files = createStub()

      const router = createRouter(function (route) {
        route('/files/*path').render(Files)
      })

      const match = router.match('/files/docs/readme.md')

      expect(match?.handler.component).toBe(Files)
      expect(match?.params).toStrictEqual({ path: 'docs/readme.md' })
    })
  })

  describe('scroll and focusReset', { concurrent: true }, function () {
    it('sets scroll behavior on the handler', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').scroll('manual').render(Stub)
      })

      expect(router.match('/')?.handler.scroll).toBe('manual')
    })

    it('sets focusReset behavior on the handler', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').focusReset('manual').render(Stub)
      })

      expect(router.match('/')?.handler.focusReset).toBe('manual')
    })

    it('sets both scroll and focusReset together', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').scroll('after-transition').focusReset('manual').render(Stub)
      })

      const handler = router.match('/')?.handler

      expect(handler?.scroll).toBe('after-transition')
      expect(handler?.focusReset).toBe('manual')
    })

    it('leaves scroll undefined when not set', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').render(Stub)
      })

      expect(router.match('/')?.handler.scroll).toBeUndefined()
    })
  })

  describe('formHandler', { concurrent: true }, function () {
    it('sets formHandler on the handler', function ({ expect }) {
      const handler = vi.fn()

      const router = createRouter(function (route) {
        route('/login').formHandler(handler).render(Stub)
      })

      expect(router.match('/login')?.handler.formHandler).toBe(handler)
    })

    it('leaves formHandler undefined when not set', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').render(Stub)
      })

      expect(router.match('/')?.handler.formHandler).toBeUndefined()
    })
  })

  describe('prefetch', { concurrent: true }, function () {
    it('sets a single prefetch function', function ({ expect }) {
      const prefetchFn = vi.fn()

      const router = createRouter(function (route) {
        route('/').prefetch(prefetchFn).render(Stub)
      })

      const handler = router.match('/')?.handler

      expect(handler?.prefetch).toBe(prefetchFn)
    })

    it('leaves prefetch undefined when not set', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').render(Stub)
      })

      expect(router.match('/')?.handler.prefetch).toBeUndefined()
    })

    it('chains multiple prefetches in order', async function ({ expect }) {
      const order: number[] = []

      const first: PrefetchFunc = async function () {
        order.push(1)
      }

      const second: PrefetchFunc = async function () {
        order.push(2)
      }

      const router = createRouter(function (route) {
        route('/').prefetch(first).prefetch(second).render(Stub)
      })

      const context = createMockContext()

      await router.match('/')?.handler.prefetch?.(context)

      expect(order).toStrictEqual([1, 2])
    })
  })

  describe('middleware', { concurrent: true }, function () {
    it('sets middlewares on the handler', function ({ expect }) {
      const Auth = createMiddleware()

      const router = createRouter(function (route) {
        route('/').middleware([Auth]).render(Stub)
      })

      expect(router.match('/')?.handler.middlewares).toStrictEqual([Auth])
    })

    it('leaves middlewares undefined when not set', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/').render(Stub)
      })

      expect(router.match('/')?.handler.middlewares).toBeUndefined()
    })

    it('appends multiple middleware calls', function ({ expect }) {
      const Auth = createMiddleware()
      const Logger = createMiddleware()

      const router = createRouter(function (route) {
        route('/').middleware([Auth]).middleware([Logger]).render(Stub)
      })

      const middlewares = router.match('/')?.handler.middlewares

      expect(middlewares).toStrictEqual([Auth, Logger])
    })
  })

  describe('redirect', { concurrent: true }, function () {
    it('registers a redirect route', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/old').redirect('/new')
      })

      const match = router.match('/old')

      expect(match).not.toBeNull()
      expect(match?.handler.prefetch).toBeDefined()
    })

    it('calls controller.redirect with the target', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/old').redirect('/new')
      })

      const context = createMockContext()

      router.match('/old')?.handler.prefetch?.(context)

      expect(context.controller.redirect).toHaveBeenCalledWith('/new')
    })

    it('uses a fallback component that renders null', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/old').redirect('/new')
      })

      const Component = router.match('/old')?.handler.component

      expect(Component).toBeDefined()

      /**
       * Render the redirect fallback component to verify it
       * returns null. This component is never rendered in
       * practice because the precommit redirect fires before
       * the URL commits, but the Handler interface requires
       * a component field.
       */
      const result = (Component as Function)()

      expect(result).toBeNull()
    })

    it('does not prefix the redirect target inside groups', function ({ expect }) {
      const router = createRouter(function (route) {
        const app = route('/app').group()

        app('/legacy').redirect('/new-page')
      })

      const context = createMockContext()

      router.match('/app/legacy')?.handler.prefetch?.(context)

      expect(context.controller.redirect).toHaveBeenCalledWith('/new-page')
    })

    it('accepts a callback that receives the prefetch context', function ({ expect }) {
      const redirectFn = vi.fn(function () {
        return '/resolved'
      })

      const router = createRouter(function (route) {
        route('/old').redirect(redirectFn)
      })

      const context = createMockContext()

      router.match('/old')?.handler.prefetch?.(context)

      expect(redirectFn).toHaveBeenCalledWith(context)
      expect(context.controller.redirect).toHaveBeenCalledWith('/resolved')
    })

    it('resolves dynamic params in a callback redirect', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/old-user/:id').redirect(function ({ params }) {
          return `/user/${params.id}`
        })
      })

      const context: PrefetchContext = {
        params: { id: '42' },
        url: new URL('http://localhost/old-user/42'),
        controller: {
          redirect: vi.fn(),
          addHandler: vi.fn(),
        } as unknown as NavigationPrecommitController,
      }

      router.match('/old-user/42')?.handler.prefetch?.(context)

      expect(context.controller.redirect).toHaveBeenCalledWith('/user/42')
    })

    it('resolves a callback redirect inside a group', function ({ expect }) {
      const router = createRouter(function (route) {
        const app = route('/app').group()

        app('/old/:slug').redirect(function ({ params }) {
          return `/new/${params.slug}`
        })
      })

      const context: PrefetchContext = {
        params: { slug: 'hello' },
        url: new URL('http://localhost/app/old/hello'),
        controller: {
          redirect: vi.fn(),
          addHandler: vi.fn(),
        } as unknown as NavigationPrecommitController,
      }

      router.match('/app/old/hello')?.handler.prefetch?.(context)

      expect(context.controller.redirect).toHaveBeenCalledWith('/new/hello')
    })

    it('passes the destination URL to a callback redirect', function ({ expect }) {
      let receivedUrl: URL | undefined

      const router = createRouter(function (route) {
        route('/search').redirect(function ({ url }) {
          receivedUrl = url

          return `/new-search${url.search}`
        })
      })

      const context: PrefetchContext = {
        params: {},
        url: new URL('http://localhost/search?q=test'),
        controller: {
          redirect: vi.fn(),
          addHandler: vi.fn(),
        } as unknown as NavigationPrecommitController,
      }

      router.match('/search')?.handler.prefetch?.(context)

      expect(receivedUrl?.search).toBe('?q=test')
      expect(context.controller.redirect).toHaveBeenCalledWith('/new-search?q=test')
    })

    it('does not inherit middleware from parent groups', function ({ expect }) {
      const Auth = createMiddleware()

      const router = createRouter(function (route) {
        const authed = route().middleware([Auth]).group()

        authed('/old').redirect('/new')
      })

      const match = router.match('/old')

      expect(match).not.toBeNull()
      expect(match?.handler.middlewares).toBeUndefined()
    })

    it('does not inherit scroll or focusReset configuration', function ({ expect }) {
      const router = createRouter(function (route) {
        route('/old').scroll('manual').focusReset('manual').redirect('/new')
      })

      const match = router.match('/old')

      expect(match).not.toBeNull()
      expect(match?.handler.scroll).toBeUndefined()
      expect(match?.handler.focusReset).toBeUndefined()
    })
  })

  describe('groups', { concurrent: true }, function () {
    it('prefixes child routes with the group path', function ({ expect }) {
      const Dashboard = createStub()
      const Settings = createStub()

      const router = createRouter(function (route) {
        const dashboard = route('/dashboard').group()

        dashboard('/').render(Dashboard)
        dashboard('/settings').render(Settings)
      })

      expect(router.match('/dashboard')?.handler.component).toBe(Dashboard)
      expect(router.match('/dashboard/settings')?.handler.component).toBe(Settings)
    })

    it('inherits middleware from group', function ({ expect }) {
      const Auth = createMiddleware()
      const Page = createStub()

      const router = createRouter(function (route) {
        const authed = route().middleware([Auth]).group()

        authed('/protected').render(Page)
      })

      expect(router.match('/protected')?.handler.middlewares).toStrictEqual([Auth])
    })

    it('merges group and route middlewares', function ({ expect }) {
      const Auth = createMiddleware()
      const Admin = createMiddleware()
      const Page = createStub()

      const router = createRouter(function (route) {
        const authed = route().middleware([Auth]).group()

        authed('/admin').middleware([Admin]).render(Page)
      })

      const middlewares = router.match('/admin')?.handler.middlewares

      expect(middlewares).toStrictEqual([Auth, Admin])
    })

    it('supports groups without a path for config-only inheritance', function ({ expect }) {
      const Auth = createMiddleware()
      const Home = createStub()
      const Profile = createStub()

      const router = createRouter(function (route) {
        const authed = route().middleware([Auth]).group()

        authed('/').render(Home)
        authed('/profile').render(Profile)
      })

      expect(router.match('/')?.handler.middlewares).toStrictEqual([Auth])
      expect(router.match('/profile')?.handler.middlewares).toStrictEqual([Auth])
    })

    it('chains group and route prefetches', async function ({ expect }) {
      const order: number[] = []

      const groupPrefetch: PrefetchFunc = async function () {
        order.push(1)
      }

      const routePrefetch: PrefetchFunc = async function () {
        order.push(2)
      }

      const router = createRouter(function (route) {
        const prefetched = route().prefetch(groupPrefetch).group()

        prefetched('/page').prefetch(routePrefetch).render(Stub)
      })

      const context = createMockContext()

      await router.match('/page')?.handler.prefetch?.(context)

      expect(order).toStrictEqual([1, 2])
    })

    it('inherits group prefetch without route prefetch', async function ({ expect }) {
      const groupPrefetch = vi.fn()

      const router = createRouter(function (route) {
        const prefetched = route().prefetch(groupPrefetch).group()

        prefetched('/page').render(Stub)
      })

      const context = createMockContext()

      await router.match('/page')?.handler.prefetch?.(context)

      expect(groupPrefetch).toHaveBeenCalledWith(context)
    })
  })

  describe('nested groups', { concurrent: true }, function () {
    it('accumulates path prefixes through nesting', function ({ expect }) {
      const Settings = createStub()

      const router = createRouter(function (route) {
        const api = route('/api').group()
        const admin = api('/admin').group()

        admin('/settings').render(Settings)
      })

      expect(router.match('/api/admin/settings')?.handler.component).toBe(Settings)
    })

    it('accumulates middlewares through nesting', function ({ expect }) {
      const Auth = createMiddleware()
      const Admin = createMiddleware()
      const Logger = createMiddleware()
      const Page = createStub()

      const router = createRouter(function (route) {
        const authed = route().middleware([Auth]).group()
        const admin = authed().middleware([Admin]).group()

        admin('/deep').middleware([Logger]).render(Page)
      })

      const middlewares = router.match('/deep')?.handler.middlewares

      expect(middlewares).toStrictEqual([Auth, Admin, Logger])
    })

    it('chains prefetches through nested groups', async function ({ expect }) {
      const order: number[] = []

      const first: PrefetchFunc = async function () {
        order.push(1)
      }
      const second: PrefetchFunc = async function () {
        order.push(2)
      }
      const third: PrefetchFunc = async function () {
        order.push(3)
      }

      const router = createRouter(function (route) {
        const outer = route().prefetch(first).group()
        const inner = outer().prefetch(second).group()

        inner('/deep').prefetch(third).render(Stub)
      })

      const context = createMockContext()

      await router.match('/deep')?.handler.prefetch?.(context)

      expect(order).toStrictEqual([1, 2, 3])
    })

    it('combines path prefix and middleware nesting', function ({ expect }) {
      const Auth = createMiddleware()
      const Admin = createMiddleware()
      const UserDetail = createStub()

      const router = createRouter(function (route) {
        const api = route('/api').middleware([Auth]).group()
        const users = api('/users').middleware([Admin]).group()

        users('/:id').render(UserDetail)
      })

      const match = router.match('/api/users/42')

      expect(match?.handler.component).toBe(UserDetail)
      expect(match?.handler.middlewares).toStrictEqual([Auth, Admin])
      expect(match?.params).toStrictEqual({ id: '42' })
    })
  })

  describe('chaining', { concurrent: true }, function () {
    it('supports full chaining with all options', function ({ expect }) {
      const Auth = createMiddleware()
      const Page = createStub()
      const prefetchFn = vi.fn()
      const formFn = vi.fn()

      const router = createRouter(function (route) {
        route('/full')
          .middleware([Auth])
          .prefetch(prefetchFn)
          .scroll('manual')
          .focusReset('manual')
          .formHandler(formFn)
          .render(Page)
      })

      const handler = router.match('/full')?.handler

      expect(handler?.component).toBe(Page)
      expect(handler?.middlewares).toStrictEqual([Auth])
      expect(handler?.prefetch).toBe(prefetchFn)
      expect(handler?.scroll).toBe('manual')
      expect(handler?.focusReset).toBe('manual')
      expect(handler?.formHandler).toBe(formFn)
    })

    it('returns the same builder for chaining', function ({ expect }) {
      const Auth = createMiddleware()
      const prefetchFn = vi.fn()
      const formFn = vi.fn()

      let builder: unknown

      createRouter(function (route) {
        const b = route('/')

        builder = b

        const r1 = b.middleware([Auth])
        const r2 = r1.prefetch(prefetchFn)
        const r3 = r2.scroll('manual')
        const r4 = r3.focusReset('manual')
        const r5 = r4.formHandler(formFn)

        expect(r1).toBe(builder)
        expect(r2).toBe(builder)
        expect(r3).toBe(builder)
        expect(r4).toBe(builder)
        expect(r5).toBe(builder)

        b.render(Stub)
      })
    })
  })

  describe('error handling', { concurrent: true }, function () {
    it('throws when render is called without a path', function ({ expect }) {
      expect(function () {
        createRouter(function (route) {
          route().render(Stub)
        })
      }).toThrow('cannot register a route without a path or group prefix')
    })

    it('throws when redirect is called without a path', function ({ expect }) {
      expect(function () {
        createRouter(function (route) {
          route().redirect('/target')
        })
      }).toThrow('cannot register a route without a path or group prefix')
    })
  })

  describe('group isolation', { concurrent: true }, function () {
    it('does not leak middleware to sibling routes', function ({ expect }) {
      const Auth = createMiddleware()
      const Public = createStub()
      const Private = createStub()

      const router = createRouter(function (route) {
        route('/public').render(Public)

        const authed = route().middleware([Auth]).group()

        authed('/private').render(Private)
      })

      expect(router.match('/public')?.handler.middlewares).toBeUndefined()
      expect(router.match('/private')?.handler.middlewares).toStrictEqual([Auth])
    })

    it('does not leak prefetch to sibling routes', function ({ expect }) {
      const groupPrefetch = vi.fn()
      const Public = createStub()

      const router = createRouter(function (route) {
        route('/public').render(Public)

        const prefetched = route().prefetch(groupPrefetch).group()

        prefetched('/private').render(Stub)
      })

      expect(router.match('/public')?.handler.prefetch).toBeUndefined()
    })

    it('does not leak group path prefix to siblings', function ({ expect }) {
      const Root = createStub()

      const router = createRouter(function (route) {
        const app = route('/app').group()

        app('/page').render(Stub)

        route('/other').render(Root)
      })

      expect(router.match('/other')?.handler.component).toBe(Root)
      expect(router.match('/app/other')).toBeNull()
    })
  })

  describe('path joining', { concurrent: true }, function () {
    it('handles group path ending with slash', function ({ expect }) {
      const Page = createStub()

      const router = createRouter(function (route) {
        const app = route('/app/').group()

        app('/page').render(Page)
      })

      expect(router.match('/app/page')?.handler.component).toBe(Page)
    })

    it('handles route path without leading slash', function ({ expect }) {
      const Page = createStub()

      const router = createRouter(function (route) {
        const app = route('/app').group()

        app('page').render(Page)
      })

      expect(router.match('/app/page')?.handler.component).toBe(Page)
    })

    it('registers group root with path-only group', function ({ expect }) {
      const Dashboard = createStub()

      const router = createRouter(function (route) {
        const dashboard = route('/dashboard').group()

        dashboard('/').render(Dashboard)
      })

      expect(router.match('/dashboard')?.handler.component).toBe(Dashboard)
    })
  })

  describe('real-world patterns', { concurrent: true }, function () {
    it('handles a typical app with public and protected areas', function ({ expect }) {
      const Home = createStub()
      const Login = createStub()
      const Dashboard = createStub()
      const Settings = createStub()
      const UserDetail = createStub()
      const Auth = createMiddleware()
      const Admin = createMiddleware()

      const router = createRouter(function (route) {
        route('/').render(Home)
        route('/login').render(Login)
        route('/old-login').redirect('/login')

        const authed = route().middleware([Auth]).group()

        authed('/dashboard').render(Dashboard)

        const admin = authed('/admin').middleware([Admin]).group()

        admin('/settings').render(Settings)

        authed('/user/:id').render(UserDetail)
      })

      expect(router.match('/')?.handler.component).toBe(Home)
      expect(router.match('/')?.handler.middlewares).toBeUndefined()

      expect(router.match('/login')?.handler.component).toBe(Login)
      expect(router.match('/login')?.handler.middlewares).toBeUndefined()

      expect(router.match('/dashboard')?.handler.component).toBe(Dashboard)
      expect(router.match('/dashboard')?.handler.middlewares).toStrictEqual([Auth])

      expect(router.match('/admin/settings')?.handler.component).toBe(Settings)
      expect(router.match('/admin/settings')?.handler.middlewares).toStrictEqual([Auth, Admin])

      const userMatch = router.match('/user/42')

      expect(userMatch?.handler.component).toBe(UserDetail)
      expect(userMatch?.handler.middlewares).toStrictEqual([Auth])
      expect(userMatch?.params).toStrictEqual({ id: '42' })
    })

    it('handles module federation style route composition', function ({ expect }) {
      const DashHome = createStub()
      const DashSettings = createStub()
      const AppHome = createStub()

      /**
       * Simulates a remote module that defines its routes
       * relative to its own root, mounted under a prefix
       * by the host application.
       */
      function registerDashboardRoutes(route: RouteFactory) {
        route('/').render(DashHome)
        route('/settings').render(DashSettings)
      }

      const router = createRouter(function (route) {
        route('/').render(AppHome)

        const dashboard = route('/dashboard').group()

        registerDashboardRoutes(dashboard)
      })

      expect(router.match('/')?.handler.component).toBe(AppHome)
      expect(router.match('/dashboard')?.handler.component).toBe(DashHome)
      expect(router.match('/dashboard/settings')?.handler.component).toBe(DashSettings)
    })
  })
})

# Advanced Patterns

## Table of Contents

- [Lazy Loading Routes](#lazy-loading-routes)
- [Prefetch Strategies](#prefetch-strategies)
- [Sharing Transition State](#sharing-transition-state)
- [Form Submissions](#form-submissions)
- [Dynamic Redirects](#dynamic-redirects)
- [Nested Layouts via Middleware](#nested-layouts-via-middleware)
- [Mandatory Guards and SSR](#mandatory-guards-and-ssr)
- [Navigation Signal Lifetime](#navigation-signal-lifetime)
- [Module Federation](#module-federation)
- [Cache Invalidation](#cache-invalidation)
- [Custom Active Link Component](#custom-active-link-component)
- [Scroll and Focus Behavior](#scroll-and-focus-behavior)

---

## Lazy Loading Routes

Route components work with `React.lazy()` out of the box. The `<Router>` wraps rendering in a `<Suspense>` boundary.

```tsx
import { lazy } from 'react'
import { createRouter, Router } from '@studiolambda/router/react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

const router = createRouter((route) => {
  route('/dashboard').render(Dashboard)
  route('/settings').render(Settings)
})

function App() {
  return <Router matcher={router} fallback={<Spinner />} />
}
```

The `fallback` prop is passed to the internal `<Suspense>` boundary.

---

## Prefetch Strategies

### Via `<Link>`

```tsx
// Prefetch when user hovers over the link
<Link href="/dashboard" prefetch="hover">Dashboard</Link>

// Prefetch when link scrolls into viewport (IntersectionObserver)
<Link href="/dashboard" prefetch="viewport">Dashboard</Link>

// Prefetch once (default: true) — won't re-prefetch after first trigger
<Link href="/dashboard" prefetch="hover" once={true}>Dashboard</Link>
```

`once` controls the DOM trigger, not the matcher-wide attempt cache. Hover
uses a one-shot listener; viewport disconnects after the first observer
callback, even when no entry intersects. False keeps triggers active but
does not bypass pathname deduplication. See [Cache Invalidation](#cache-invalidation).

### Via `usePrefetch` (manual)

```tsx
import { usePrefetch } from '@studiolambda/router/react'

function SearchResults({ results }: { results: { id: string; title: string }[] }) {
  const prefetch = usePrefetch()

  return results.map((result) => (
    <a
      key={result.id}
      href={`/item/${result.id}`}
      onMouseEnter={() => {
        try {
          Promise.resolve(prefetch(`/item/${result.id}`)).catch(console.error)
        } catch (error) {
          console.error(error)
        }
      }}>
      {result.title}
    </a>
  ))
}
```

### Via `usePrefetchEffect` (ref-based)

```tsx
import { useRef } from 'react'
import { usePrefetchEffect } from '@studiolambda/router/react'

function ProductCard({ href }: { href: string }) {
  const ref = useRef<HTMLDivElement>(null)
  usePrefetchEffect(ref, { href, on: 'viewport' })

  return <div ref={ref}>...</div>
}
```

### Prefetch with data preloading

```tsx
const router = createRouter((route) => {
  route('/user/:id')
    .prefetch(async ({ params, url }) => {
      // Preload the user data before the route renders
      await queryClient.prefetchQuery({
        queryKey: ['user', params.id],
        queryFn: () => fetchUser(params.id),
      })
    })
    .render(UserPage)
})
```

---

## Sharing Transition State

To read `isPending` **above** the Router (e.g. for a top-level progress bar), pass a `transition` prop:

```tsx
import { useTransition } from 'react'
import { Router } from '@studiolambda/router/react'

function App() {
  const transition = useTransition()
  const [isPending] = transition

  return (
    <>
      {isPending && <GlobalProgressBar />}
      <Router matcher={router} transition={transition} />
    </>
  )
}
```

Without this prop, `useIsPending()` is only available inside the `<Router>` tree.

---

## Form Submissions

Routes can handle form submissions via the Navigation API's form interception:

```tsx
const router = createRouter((route) => {
  route('/contact')
    .formHandler(async (formData, event) => {
      const name = formData.get('name')
      const email = formData.get('email')
      await submitContactForm({ name, email })
    })
    .render(ContactPage)
})
```

```tsx
function ContactPage() {
  return (
    <form method="post" action="/contact">
      <input name="name" />
      <input name="email" type="email" />
      <button type="submit">Send</button>
    </form>
  )
}
```

When a form submits to a route with a `formHandler`, the handler is called instead of the normal component render. The Navigation API intercepts the form submission natively.

Guards run before prefetch, then the action. Check failure prevents dispatch.
If precommit redirects, the target is rematched/guarded/prefetched and rendered
without executing either action or forwarding the source body. Unchanged
actions leave the currently rendered route in place. GET forms follow normal
component navigation. Without an explicit original `formHandler`, POST remains
native and Router runs neither guards nor prefetch. Authorize both custom
action requests and native server submissions at the backend.

---

## Dynamic Redirects

```tsx
const router = createRouter((route) => {
  // Carry params to the new location
  route('/old-user/:id').redirect(({ params }) => `/user/${params.id}`)

  // Preserve query string
  route('/search-old').redirect(({ url }) => `/search${url.search}`)

  // Conditional redirect (based on param)
  route('/v1/:resource').redirect(({ params }) => `/v2/${params.resource}`)
})
```

Use absolute path targets. Redirects run only on intercepted navigation, not
initial rendering. Every target gets its own guards and prefetch before final
commit. Native redirect requires a cancelable push/replace event; traverse and
reload attempts reject. For noncancelable interceptable events, checks run
postcommit and redirect/addHandler throw InvalidStateError. Failed checks do
not roll back the URL or update React content. The first match retains scroll
and focus options. Runtime loops or more than 20 redirects reject navigation.

---

## Nested Layouts via Middleware

Middleware components are regular React components that can provide layout structure:

```tsx
function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

function SidebarLayout({ children }: PropsWithChildren) {
  return (
    <div className="sidebar-layout">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  )
}

const router = createRouter((route) => {
  const app = route().middleware([AppLayout]).group()

  app('/').render(Home)
  app('/about').render(About)

  const withSidebar = app().middleware([SidebarLayout]).group()
  withSidebar('/dashboard').render(Dashboard)
  withSidebar('/settings').render(Settings)
})
```

Nesting: `AppLayout` > `SidebarLayout` > route component.

---

## Mandatory Guards and SSR

Use guards for access checks; middleware is only render-time composition.
This example receives application-owned request-scoped dependencies instead
of sharing a session promise between server requests:

```tsx
function createAccountRoutes(canRead: (path: string) => Promise<boolean>) {
  return createRouter(route => {
    route('/account').guard(async ({ url }) => {
      if (!(await canRead(url.pathname))) throw new Error('access denied')
    }).render(AccountPage)
  })
}
```

Guards have no redirect controller: throwing denies; returning allows.
Router checks initial content, including SSR, without running prefetch.
A lone synchronous guard can fail during initialization. Multiple guards
compose asynchronously. Async initial checks suspend before middleware/content
behind Router's fallback. Streaming SSR can await checks; renderToString emits
fallback for pending checks instead. The host chooses HTTP errors/redirects;
client errors need an ancestor error boundary. Navigation errors use native
result promises and onNavigateError. Guards must be idempotent under remounts,
StrictMode, and SSR/hydration, and never replace backend authorization.

Router has no children API. Register your test page with createRouter, then
render `<Router matcher={matcher} navigation={navigation} />`. Memory navigation
is fixed-location: navigate/back/forward/traverseTo all return resolved promises
for the same entry, emit no events, and never change the URL. It has no real
history keys/state. Use an event-capable test adapter to test interception.

---

## Navigation Signal Lifetime

`useNavigationSignal()` exposes the native event signal, not a route-unmount
signal. It is null initially and follows native cancellation semantics. A
completed navigation's signal need not abort when a later navigation starts.
Use an owned AbortController or your data library's cancellation mechanism
when requests must stop on unmount. This example only inspects availability;
it does not claim that the signal guarantees route-lifetime cancellation:

```tsx
import { useNavigationSignal } from '@studiolambda/router/react'

function NavigationStatus() {
  const signal = useNavigationSignal()
  return <p>{signal === null ? 'Initial render' : 'Reached by navigation'}</p>
}
```

---

## Module Federation

Pass the `route` factory to remote modules for decentralized route registration:

```tsx
// host app
const router = createRouter((route) => {
  route('/').render(Home)

  // remote module registers its own routes
  registerDashboardRoutes(route)
})

// remote module
export function registerDashboardRoutes(route: RouteFactory) {
  const dashboard = route('/dashboard').guard(requireSession).group()
  dashboard('/').render(DashboardHome)
  dashboard('/analytics').render(Analytics)
}
```

---

## Cache Invalidation

After events like logout, clear the prefetch cache to force re-prefetch:

The cache tracks **attempts** per pathname per matcher, not successful data.
Queries and hashes share a key; failed callbacks remain marked; duplicate
callers receive undefined rather than sharing the pending promise. Real
navigation prefetch always runs and does not use this cache. Matchers shared
by Routers share attempts. Clearing only removes bookkeeping: it does not
invalidate your data cache, cancel work, or rearm one-shot DOM triggers.
Expected speculative failures must be handled in the callback when using
Link/usePrefetchEffect, which ignore returned promises. Guards are skipped
during speculation; all speculative data sources must authorize independently.
The speculative redirect controller does not navigate or preload targets.
A redirect call still stops later source callbacks in a builder prefetch chain.

```tsx
import { clearPrefetchCache } from '@studiolambda/router/react'

function LogoutButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => {
        clearSession()
        clearPrefetchCache(router) // pass the matcher instance
        const result = navigate('/login')
        Promise.all([result.committed, result.finished]).catch(console.error)
      }}>
      Logout
    </button>
  )
}
```

---

## Custom Active Link Component

Build a custom navigation link using `useActiveLinkProps`:

```tsx
import { useActiveLinkProps } from '@studiolambda/router/react'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { isActive, props } = useActiveLinkProps(href, { exact: false })

  return (
    <a href={href} className={`nav-link ${isActive ? 'nav-link--active' : ''}`} {...props}>
      {children}
    </a>
  )
}
```

`props` includes `data-active` and `aria-current="page"` when active, so you can also style via CSS attribute selectors: `a[data-active] { ... }`.

---

## Scroll and Focus Behavior

Control per-route scroll restoration and focus reset:

```tsx
const router = createRouter((route) => {
  // Default: browser handles scroll after transition
  route('/page').render(Page)

  // Manual scroll: your component calls window.scrollTo() or similar
  route('/infinite-list').scroll('manual').render(InfiniteList)

  // Manual focus: your component manages focus
  route('/form').focusReset('manual').render(FormPage)
})
```

Values: `"after-transition"` (default) or `"manual"`. These map directly to the Navigation API's `intercept()` options.

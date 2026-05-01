# Advanced Patterns

## Table of Contents

- [Lazy Loading Routes](#lazy-loading-routes)
- [Prefetch Strategies](#prefetch-strategies)
- [Sharing Transition State](#sharing-transition-state)
- [Form Submissions](#form-submissions)
- [Dynamic Redirects](#dynamic-redirects)
- [Nested Layouts via Middleware](#nested-layouts-via-middleware)
- [Auth Guards with Suspense](#auth-guards-with-suspense)
- [Cancellable Data Fetching](#cancellable-data-fetching)
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

### Via `usePrefetch` (manual)

```tsx
import { usePrefetch } from '@studiolambda/router/react'

function SearchResults({ results }) {
  const prefetch = usePrefetch()

  return results.map((result) => (
    <a
      key={result.id}
      href={`/item/${result.id}`}
      onMouseEnter={() => prefetch(`/item/${result.id}`)}>
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

Redirect targets are always absolute paths. They run during the precommit phase, so the old URL never appears in the address bar.

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

## Auth Guards with Suspense

Middleware can use React 19's `use()` to suspend while checking auth:

```tsx
import { type PropsWithChildren, use } from 'react'

// Cache the auth promise so it's not re-created on each render
let authPromise: Promise<Session | null> | undefined

function getSession() {
  authPromise ??= fetchSession()
  return authPromise
}

function RequireAuth({ children }: PropsWithChildren) {
  const session = use(getSession())
  if (!session) return <Navigate to="/login" />
  return <SessionContext value={session}>{children}</SessionContext>
}

const router = createRouter((route) => {
  const authed = route().middleware([RequireAuth]).group()
  authed('/dashboard').render(Dashboard)
})
```

The nearest `<Suspense>` boundary (the Router's `fallback`) shows while the auth check is pending.

---

## Cancellable Data Fetching

Use `useNavigationSignal()` to abort in-flight requests when the user navigates away:

```tsx
import { useNavigationSignal } from '@studiolambda/router/react'

function DataPage() {
  const signal = useNavigationSignal()
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!signal) return

    fetch('/api/data', { signal })
      .then((res) => res.json())
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') throw error
      })
  }, [signal])

  return data ? <DataView data={data} /> : <Loading />
}
```

The signal is aborted automatically when a new navigation starts.

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
  const dashboard = route('/dashboard').middleware([Auth]).group()
  dashboard('/').render(DashboardHome)
  dashboard('/analytics').render(Analytics)
}
```

---

## Cache Invalidation

After events like logout, clear the prefetch cache to force re-prefetch:

```tsx
import { clearPrefetchCache } from '@studiolambda/router/react'

function LogoutButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => {
        clearSession()
        clearPrefetchCache(router) // pass the matcher instance
        navigate('/login')
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

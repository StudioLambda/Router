---
name: lambda-router
description: >
  Guide for writing code that uses @studiolambda/router — a React 19 client-side
  router built on the browser Navigation API with a trie-based URL matcher.
  Use when writing React components, pages, layouts, or navigation logic that
  imports from "@studiolambda/router" or "@studiolambda/router/react". Covers
  route definitions with createRouter, the Router/Link components, all 16 hooks,
  middleware, prefetch, lazy loading, SSR with createMemoryNavigation, search
  params, and form handling.
metadata:
  version: '2.0.0'
---

# Lambda Router

`@studiolambda/router` is a React 19 client-side router built on the browser Navigation API. Two entry points:

- `@studiolambda/router` — framework-agnostic trie-based URL matcher
- `@studiolambda/router/react` — React 19 components, hooks, and navigation

## How It Works

The `<Router>` component intercepts the browser Navigation API's `navigate` event, matches the destination URL against a trie of registered routes, runs prefetch logic in the precommit phase (before the URL commits to the address bar), then wraps the React state update in `startTransition` for concurrent rendering. The matched route component renders inside a `Suspense` boundary wrapped by any middleware components.

Links don't need `onClick` or `preventDefault` — the Navigation API intercepts anchor clicks natively.

## Quick Start

```tsx
import { lazy, Suspense } from 'react'
import { createRouter, Router, Link } from '@studiolambda/router/react'

const Home = lazy(() => import('./pages/Home'))
const User = lazy(() => import('./pages/User'))

const router = createRouter((route) => {
  route('/').render(Home)
  route('/user/:id').render(User)
})

function App() {
  return (
    <Suspense fallback="Loading...">
      <nav>
        <Link href="/">Home</Link>
        <Link href="/user/42">User 42</Link>
      </nav>
      <Router matcher={router} />
    </Suspense>
  )
}
```

## Route Definition — `createRouter`

Build a `Matcher<Handler>` with the declarative builder API. See [route-builder.md](references/route-builder.md) for the full chainable API.

```tsx
const router = createRouter((route) => {
  // Static route
  route('/').render(Home)

  // Dynamic params
  route('/user/:id').render(User)

  // Wildcard (catches remaining segments)
  route('/files/*path').render(FileViewer)

  // Redirect (static)
  route('/old').redirect('/new')

  // Redirect (dynamic with params)
  route('/old-user/:id').redirect(({ params }) => `/user/${params.id}`)

  // Route with prefetch, scroll, and form handling
  route('/search')
    .prefetch(({ url }) => prefetchSearchResults(url.searchParams.get('q')))
    .scroll('manual')
    .formHandler((formData) => handleSearchForm(formData))
    .render(SearchPage)

  // Middleware group — all children inherit Auth
  const authed = route().middleware([Auth]).group()
  authed('/dashboard').render(Dashboard)
  authed('/settings').render(Settings)

  // Nested groups accumulate prefix + middleware
  const admin = authed('/admin').middleware([AdminGuard]).group()
  admin('/users').render(AdminUsers) // path: /admin/users
  admin('/config').render(AdminConfig) // path: /admin/config
})
```

**Rules:**

- `.render()`, `.redirect()`, `.group()` are terminal — no further chaining after
- Groups inherit middleware and prefetch from parents; redirects do NOT inherit middleware
- Duplicate route registration throws
- Static redirect cycles are detected at build time

## Components

### `<Router>`

Top-level orchestrator. Provides contexts consumed by all hooks.

```tsx
<Router
  matcher={router} // Matcher<Handler> (required in practice)
  navigation={memoryNav} // Navigation override (SSR/testing)
  notFound={Custom404} // custom 404 component
  fallback={<Spinner />} // Suspense fallback
  transition={[isPending, startTransition]} // share transition with parent
  onNavigateSuccess={() => analytics.pageView()}
  onNavigateError={(error) => reportError(error)}
/>
```

Falls back to `window.navigation` when no `navigation` prop or context is provided.

### `<Link>`

Anchor element with prefetch and active link detection.

```tsx
<Link href="/about">About</Link>

// Prefetch on hover
<Link href="/about" prefetch="hover">About</Link>

// Prefetch when scrolled into viewport
<Link href="/about" prefetch="viewport">About</Link>

// Dynamic className based on active state
<Link
  href="/about"
  className={({ isActive }) => isActive ? "nav-active" : "nav-link"}
>About</Link>

// Prefix matching (active for /docs and /docs/*)
<Link href="/docs" activeExact={false}>Docs</Link>
```

Active links get `data-active` and `aria-current="page"` attributes automatically.

## Hooks

All hooks must be used inside a `<Router>` tree. They throw descriptive errors outside their provider. See [hooks-reference.md](references/hooks-reference.md) for complete API.

| Hook                             | Returns                               | Purpose                                    |
| -------------------------------- | ------------------------------------- | ------------------------------------------ |
| `useParams()`                    | `Record<string, string>`              | Dynamic route params (`:id` segments)      |
| `usePathname()`                  | `string`                              | Current URL pathname                       |
| `useSearchParams()`              | `[URLSearchParams, setter]`           | Search params + setter (preserves hash)    |
| `useNavigate()`                  | `(url, options?) => NavigationResult` | Programmatic navigation                    |
| `useNavigation()`                | `Navigation`                          | Raw Navigation API object                  |
| `useNavigationType()`            | `NavigationType \| null`              | `push`/`replace`/`reload`/`traverse`       |
| `useNavigationSignal()`          | `AbortSignal \| null`                 | Current navigation's abort signal          |
| `useIsPending()`                 | `boolean`                             | Whether a transition is in progress        |
| `useBack()`                      | `{ back, canGoBack }`                 | Back navigation + reactive availability    |
| `useForward()`                   | `{ forward, canGoForward }`           | Forward navigation + reactive availability |
| `usePrefetch()`                  | `(url) => void`                       | Trigger route prefetch manually            |
| `usePrefetchEffect(ref, opts)`   | `void`                                | Attach prefetch to DOM element             |
| `useActiveLinkProps(href, opts)` | `{ isActive, props }`                 | Active link detection                      |

### Common Hook Patterns

```tsx
// Read route params
function UserPage() {
  const { id } = useParams()
  return <div>User {id}</div>
}

// Programmatic navigation
function LogoutButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => {
        navigate('/login')
      }}>
      Logout
    </button>
  )
}

// Search params
function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  return <input value={query} onChange={(e) => setSearchParams({ q: e.target.value })} />
}

// Pending indicator
function Layout({ children }: { children: React.ReactNode }) {
  const isPending = useIsPending()
  return (
    <div>
      {isPending && <ProgressBar />}
      {children}
    </div>
  )
}
```

## Middleware

Middleware components receive `{ children }` and wrap the route component. They can suspend, conditionally render, or add context.

```tsx
import { type PropsWithChildren, use } from 'react'

// Auth guard using Suspense
function Auth({ children }: PropsWithChildren) {
  const session = use(fetchSession()) // suspends until resolved
  if (!session) return <LoginPage />
  return <SessionContext value={session}>{children}</SessionContext>
}

// Layout wrapper
function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}

// Apply to routes
const router = createRouter((route) => {
  const authed = route().middleware([Auth, DashboardLayout]).group()
  authed('/dashboard').render(Dashboard)
})
```

Middlewares nest outermost-first: `[Auth, Layout]` means Auth wraps Layout wraps RouteComponent.

## SSR and Testing

Use `createMemoryNavigation` for non-browser environments:

```tsx
import { createMemoryNavigation, Router } from '@studiolambda/router/react'

// SSR
const navigation = createMemoryNavigation({ url: 'https://example.com/page' })
function ServerApp() {
  return <Router matcher={router} navigation={navigation} />
}

// Testing helper
function renderWithRouter(ui: React.ReactNode, { url = '/' } = {}) {
  const nav = createMemoryNavigation({ url: `http://localhost${url}` })
  return render(
    <Router matcher={router} navigation={nav}>
      {ui}
    </Router>
  )
}
```

`createMemoryNavigation` provides a stub Navigation with no-op event methods, single-entry history, and pre-resolved navigation promises. `back()`/`forward()`/`traverseTo()` throw "not supported" errors.

## URL Pattern Matching (standalone)

The core matcher can be used independently of React:

```ts
import { createMatcher } from '@studiolambda/router'

const matcher = createMatcher<string>()
matcher.register('/users', 'list')
matcher.register('/users/:id', 'detail')
matcher.register('/files/*path', 'files')

matcher.match('/users') // { handler: "list", params: {} }
matcher.match('/users/42') // { handler: "detail", params: { id: "42" } }
matcher.match('/files/a/b/c') // { handler: "files", params: { path: "a/b/c" } }
matcher.match('/unknown') // null
```

- Matching priority: static > dynamic (`:param`) > wildcard (`*param`)
- Trailing slashes are ignored
- Conflicting param names at the same trie level throw
- Bare `*` captures into param named `"*"`

## When to Load References

- Defining routes with full builder options -> [route-builder.md](references/route-builder.md)
- Using hooks (detailed API, all options, edge cases) -> [hooks-reference.md](references/hooks-reference.md)
- Advanced patterns (prefetch, forms, redirects, cache) -> [advanced-patterns.md](references/advanced-patterns.md)

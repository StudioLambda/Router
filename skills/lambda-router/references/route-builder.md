# Route Builder API — `createRouter`

## Table of Contents

- [Overview](#overview)
- [RouteFactory](#routefactory)
- [RouteBuilder Methods](#routebuilder-methods)
- [Groups and Inheritance](#groups-and-inheritance)
- [Redirects](#redirects)
- [Prefetch Functions](#prefetch-functions)
- [Mandatory Guards](#mandatory-guards)
- [Form Handling](#form-handling)
- [Handler Type](#handler-type)

## Overview

`createRouter(callback)` creates a `Matcher<Handler>` using a declarative builder. The callback receives a `RouteFactory` function.

```tsx
import { createRouter } from '@studiolambda/router/react'

const matcher = createRouter(function (route) {
  // define routes here
})
```

Returns a `Matcher<Handler>` that plugs into `<Router matcher={matcher} />`.

## RouteFactory

```ts
type RouteFactory = (path?: string) => RouteBuilder
```

- `route("/path")` — creates a builder with a path
- `route()` — creates a config-only builder (for groups without path prefix)

Path patterns support:

- Static segments: `/users/list`
- Dynamic params: `/user/:id`
- Wildcards: `/files/*path` (captures rest of URL)

## RouteBuilder Methods

### Chainable methods (return `RouteBuilder`)

| Method                  | Signature                                            | Description                                  |
| ----------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `.middleware(list)`     | `(ComponentType<MiddlewareProps>[]) => RouteBuilder` | Append middleware components                 |
| `.prefetch(fn)`         | `(PrefetchFunc) => RouteBuilder`                     | Add prefetch function to chain               |
| `.guard(fn)`            | `(GuardFunc) => RouteBuilder`                        | Check before initial content/navigation/action |
| `.scroll(behavior)`     | `(NavigationScrollBehavior) => RouteBuilder`         | `"after-transition"` (default) or `"manual"` |
| `.focusReset(behavior)` | `(NavigationFocusReset) => RouteBuilder`             | `"after-transition"` (default) or `"manual"` |
| `.formHandler(fn)`      | `(FormHandler) => RouteBuilder`                      | Handle form submissions for this route       |

### Terminal methods (consume the builder)

| Method               | Signature                  | Description                          |
| -------------------- | -------------------------- | ------------------------------------ |
| `.render(component)` | `(ComponentType) => void`  | Register route with component        |
| `.redirect(target)`  | `(RedirectTarget) => void` | Register precommit redirect          |
| `.group()`           | `() => RouteFactory`       | Create child scope inheriting config |

**After calling a terminal method, no further methods can be called on the builder.** Attempting to do so throws an error.

## Groups and Inheritance

Groups create scoped route factories. Child routes inherit:

- **Path prefix**: prepended to all child paths
- **Middleware**: prepended before child middleware (outermost first)
- **Prefetch functions**: run before child prefetches (sequential)
- **Guards**: run parent-first before prefetch, including on initial render

```tsx
const router = createRouter(function (route) {
  // Config-only group (no path prefix, just middleware)
  const authed = route().middleware([Auth]).group()
  authed('/dashboard').render(Dashboard) // /dashboard, with Auth

  // Path prefix + middleware group
  const admin = authed('/admin').middleware([AdminGuard]).group()
  admin('/users').render(AdminUsers) // /admin/users, with Auth + AdminGuard
  admin('/config').render(AdminConfig) // /admin/config, with Auth + AdminGuard

  // Prefetch inheritance
  const api = route('/api')
    .prefetch(function (ctx) {
      return loadApiConfig()
    })
    .group()
  api('/users')
    .prefetch(function (ctx) {
      return loadUsers()
    })
    .render(ApiUsers)
  // /api/users prefetch: loadApiConfig() then loadUsers() (sequential)
})
```

**Group isolation**: sibling builders do not affect each other. Config only flows downward.

## Redirects

```tsx
// Static redirect
route('/old').redirect('/new')

// Dynamic redirect using params
route('/legacy/:id').redirect(function ({ params }) {
  return `/modern/${params.id}`
})

// Dynamic redirect using URL
route('/short').redirect(function ({ url }) {
  return `/long${url.search}`
})
```

Redirect targets are **absolute paths** (not prefixed by parent groups).

Redirects do **NOT** inherit:

- middleware
- scroll behavior
- focusReset

Redirects **DO** run during the precommit phase via `controller.redirect()`, so the URL never commits to the address bar.

Static redirect cycles are detected at build time and throw. Callback redirects are not checked.

## Prefetch Functions

```ts
type PrefetchFunc = (context: PrefetchContext) => void | Promise<void>

interface PrefetchContext {
  params: Record<string, string> // matched route params
  url: URL // full destination URL
  controller: NavigationPrecommitController // for redirects
}
```

Prefetch runs during the Navigation API's precommit phase (before URL commits). Use it for:

- Data preloading
- Module preloading

Use `.guard()` for mandatory access checks, not prefetch. Prefetch does not
run on initial render. Calling `controller.redirect()` alone does not express
an access denial and is not equivalent to throwing or rejecting a guard.

When triggered by `<Link prefetch="hover">` or `usePrefetch()` (outside a real navigation), the controller is a no-op stub.

Multiple prefetch functions (from groups + route) chain sequentially.

## Mandatory Guards

```ts
type GuardFunc = (context: GuardContext) => void | Promise<void>
interface GuardContext {
  params: Record<string, string>
  url: URL
}
```

```tsx
route('/private')
  .guard(async () => {
    if (!(await session.isAuthenticated())) throw new Error('access denied')
  })
  .prefetch(loadPrivateData)
  .formHandler(savePrivateData)
  .render(PrivatePage)
```

Guards run before initial content (including SSR), and before prefetch during
precommit for intercepted navigations and custom form actions. Throw/reject to
deny access; return/resolve to permit it. Parent guards run before child guards,
and a failure stops the chain. Guards have no redirect controller. The host
handles initial redirects and SSR error responses. Initial client failures
reach an ancestor error boundary; navigation failures use `onNavigateError`.

Async initial checks suspend middleware and route content behind the Router's
`fallback`. Streaming SSR waits; `renderToString` emits the fallback rather
than waiting for async checks. Checks must be idempotent because remounts,
StrictMode, and SSR/hydration may repeat them. Scope SSR session data to each
request.

Migration: move authentication checks out of `.prefetch()` into `.guard()`;
leave optional data/module warming in prefetch. Guards never run for Link
hover/viewport prefetch. Speculative prefetch can still call its data sources;
use it only for safe requests. Legacy initial prefetch behavior is unchanged.

Guards protect router UI/action dispatch, not server resources. Every server
endpoint must authorize each request independently, including native forms.

## Form Handling

```ts
type FormHandler = (formData: FormData, event: NavigateEvent) => void | Promise<void>
```

When a navigation includes `formData` and the matched route has a `formHandler`, it is called instead of the normal render flow.

Guards and legacy prefetch are awaited before the custom action. A thrown or
rejected check prevents the action. This adds prefetch to the custom-action
path; previously that path skipped it. Do not use prefetch side effects that
assume only a component navigation can invoke them.

```tsx
route('/search')
  .formHandler(async function (formData, event) {
    const query = formData.get('q')
    await performSearch(query)
  })
  .render(SearchPage)
```

## Handler Type

The `Handler` interface registered in the matcher:

```ts
interface Handler {
  component: ComponentType // route component to render
  guard?: GuardFunc // mandatory initial/navigation/action check
  prefetch?: PrefetchFunc // precommit prefetch
  middlewares?: ComponentType<MiddlewareProps>[] // middleware chain
  scroll?: NavigationScrollBehavior // "after-transition" | "manual"
  focusReset?: NavigationFocusReset // "after-transition" | "manual"
  formHandler?: FormHandler // form submission handler
}
```

Consumers normally never construct `Handler` objects directly — `createRouter` builds them via the builder API.

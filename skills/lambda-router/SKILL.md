---
name: lambda-router
description: >
  Use for code or documentation involving @studiolambda/router or its React
  entry point, including matcher patterns, route builders, mandatory guards,
  middleware, hooks, speculative prefetch, redirects, form ownership, SSR,
  memory navigation, and Navigation API lifecycle behavior. Also use when
  maintaining this repository's exported API comments or examples.
metadata:
  version: '2.1.0'
---

# Lambda Router

## Workflow

1. Read the affected exports in `src/router/index.ts` or `src/react/index.ts`
   and their implementations. The core entry point is a pathname matcher;
   `/react` supplies React 19 components, hooks, and navigation integration.
2. Read the relevant reference before producing examples:
   - [route-builder.md](references/route-builder.md): route methods, group
     inheritance, guards, redirects, and custom actions.
   - [hooks-reference.md](references/hooks-reference.md): all 16 hooks,
     provider defaults, return signatures, and native result handling.
   - [advanced-patterns.md](references/advanced-patterns.md): speculative
     cache, form ownership, SSR, cancellation, and integration pitfalls.
3. Keep source comments and examples synchronized with the implementation.
   Follow root `AGENTS.md` for mandatory same-change skill maintenance and
   validation. Explain any checks that could not run; root `tsc --noEmit`
   checks no files and is not a production typecheck.
4. For dependency or development-tool upgrades, read
   [toolchain.md](references/toolchain.md). Validate the installed peer graph,
   coverage provider, declaration output, and packed package before release.

## Start with a route table

Router renders the matched route; it has no `children` prop. Put shared UI
in middleware so Link and router hooks see the providers. Browser usage
requires Navigation API support; the memory adapter is not a polyfill.

```tsx
import { type MiddlewareProps, createRouter, Link, Router } from '@studiolambda/router/react'

function Layout({ children }: MiddlewareProps) {
  return <><nav><Link href="/">Home</Link><Link href="/docs">Docs</Link></nav>{children}</>
}

const matcher = createRouter(route => {
  const page = route().middleware([Layout]).group()
  page('/').render(() => <h1>Home</h1>)
  page('/docs').render(() => <h1>Docs</h1>)
})

function App() {
  return <Router matcher={matcher} fallback={<p>Loading…</p>} />
}
```

## Separate checks, preloads, and UI

- Use `.guard(fn)` for mandatory, idempotent checks before initial content,
  including SSR, and before navigation/custom-action prefetch. Return/resolve
  to allow; throw/reject to deny. Guards receive `{ params, url }` and no
  redirect controller. Parent guards run first. Multiple composed guards
  are asynchronous even when individual checks are synchronous.
- Use `.prefetch(fn)` for optional warming. It does not run on initial
  render. Speculative Link/usePrefetch calls skip guards and use a no-op
  controller. Preload only safe requests; protect every backend independently.
- Use `.middleware([Layout])` for render-time composition. Middleware does
  not guard prefetch or actions. The first wrapper is outermost.

```tsx
// Application-owned session/data functions are illustrative dependencies.
const matcher = createRouter(route => {
  const privateRoute = route().guard(async ({ url }) => {
    if (!(await session.canRead(url.pathname))) throw new Error('access denied')
  }).group()
  privateRoute('/account').prefetch(loadAccount).render(AccountPage)
})
```

Guards protect UI and intercepted JavaScript dispatch, **not server
authorization**. Native submissions and speculative reads still need backend
authentication and authorization. Keep SSR session state request-scoped.

## Navigation lifecycle

Router skips non-interceptable events, hash-only changes, and downloads.
For eligible cancelable events it runs guards then prefetch before commit;
the postcommit handler updates React in a transition or executes a custom
action. Noncancelable, interceptable events (notably history traversal) run
checks after URL commit. A rejected check prevents the UI/action update but
cannot roll the URL back. The restricted postcommit controller throws
`InvalidStateError` for both `redirect()` and `addHandler()`.

Native redirects require a cancelable push/replace, not traverse/reload.
Successful precommit redirects rematch destination params/URL, run its guards
then its prefetch, and stop the abandoned prefetch chain. Repeated full URLs
or more than 20 redirects fail. Scroll/focus options stay those of the first
match because intercept options are set during event dispatch. Redirect
routes do not redirect initial loads; the host handles initial/SSR redirects.

POST bodies belong to the original destination. Without an explicit
`formHandler`, Router leaves POST native and runs neither guards nor prefetch.
Custom actions await both checks. If precommit redirects, Router renders the
checked destination without executing either action or forwarding the body.
GET forms use normal component navigation. See the form/reference details
before writing submission examples.

## Initial rendering and SSR

```tsx
import { renderToString } from 'react-dom/server'
import { createMemoryNavigation, createRouter, Router } from '@studiolambda/router/react'

const matcher = createRouter(route => {
  route('/docs').guard(() => {}).render(() => <h1>Docs</h1>)
})
const navigation = createMemoryNavigation({ url: 'https://example.com/docs' })
const html = renderToString(<Router matcher={matcher} navigation={navigation} />)
```

A single synchronous guard can throw during initialization. Asynchronous
initial checks suspend before middleware/content; rejected promises reach an
ancestor client error boundary or the SSR host. Streaming SSR can await them;
`renderToString` emits the Suspense fallback for pending checks. The host
chooses HTTP statuses and initial redirects. Checks may repeat on remount,
StrictMode, and SSR/hydration. Navigation failures use native result promises
and `onNavigateError`, not the initial-render error path.

`createMemoryNavigation` holds one fixed entry. Its navigation/traversal
methods return already-resolved promises without changing the URL or firing
events, even when `canGoBack`/`canGoForward` are false. Other native members
can be absent. Use a purpose-built event adapter for interactive tests.

## Core matcher

```ts
import { createMatcher } from '@studiolambda/router'

const matcher = createMatcher<string>()
matcher.register('/users/:id', 'user')
matcher.register('/files/*path', 'file')
const id = matcher.match('/users/42')?.params.id // '42'
const missing = matcher.match('/missing') // null
```

Pass a pathname, not a full URL/query. Static segments beat dynamic segments,
which beat wildcards, with fallback search. Empty segments are ignored;
captures remain URL-encoded. A wildcard needs at least one segment and must
be placed last for matching to resolve it (registration does not validate
terminal placement). Bare `*` uses the key `'*'`. Duplicate registrations
and conflicting parameter names throw. Use defined handlers; undefined means
no registration. An injected root is retained and mutated, not copied.

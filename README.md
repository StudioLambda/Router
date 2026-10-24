# Lambda Router

> Lightweight, isomorphic and framework agnostic router for modern UIs

Lambda Router is a client-side routing library designed for single-page applications. It provides a core URL pattern matcher that works in any JavaScript environment, plus a full-featured React integration with components, hooks, and navigation management.

The React integration requires React 19 and browser Navigation API support.
For SSR or fixed-location rendering tests, pass `createMemoryNavigation`;
it is not an interactive memory history or browser polyfill.

## Documentation

Find out about the project and discover the features at the [Documentation](https://docs.lambda-studio.com/router/getting-started/)

## Installation

```
npm i @studiolambda/router
```

## Mandatory route checks

Use `.guard()` for checks that must finish before route content or a custom
form action runs. Throw or reject to deny access; returning normally permits
it. Guards receive `{ params, url }`, without a redirect controller.

```tsx
import { createRouter, Router } from '@studiolambda/router/react'

// session, preload/action functions, and PrivatePage are application-owned.
const matcher = createRouter(route => {
  route('/private')
    .guard(async () => {
      if (!(await session.isAuthenticated())) throw new Error('access denied')
    })
    .prefetch(loadPrivateData)
    .formHandler(savePrivateData)
    .render(PrivatePage)
})

// Place an application error boundary above Router for initial guard errors.
<Router matcher={matcher} fallback={<p>Checking access…</p>} />
```

Guards run on initial rendering (including SSR) and during precommit for
intercepted navigations and custom form actions, before prefetch. Noncancelable
interceptable events run both checks after URL commit but before rendering or
executing an action; failure does not roll back the committed URL. Group guards
run parent-first. Async initial checks suspend before middleware and content;
streaming SSR waits for them. `renderToString` cannot await async checks and
emits the Suspense fallback instead. Initial failures reach an ancestor React
error boundary on the client, or the SSR host; navigation failures use the
Navigation API's error flow (`onNavigateError`). The host owns error responses
and initial redirects. Checks must be idempotent: remounts, StrictMode retries,
and SSR/hydration may repeat them. Avoid sharing request-specific sessions in
global state on the server.

**Migration from authentication in `.prefetch()`:** move the mandatory access
check to `.guard()`. Keep preloading in `.prefetch()`. Legacy prefetch still
does not run on initial rendering. Hover/viewport prefetch remains optional,
uses a no-op redirect controller, and does not run guards. Only preload data
that is safe to request speculatively. Custom form actions now await prefetch
as well as guards; a throwing/rejecting prefetch prevents the action. A call
to `controller.redirect()` is not equivalent to throwing an access denial.
Successful precommit redirects rematch and check the destination, then render
it without running the abandoned form action or passing its body to a target
action. Postcommit redirect attempts reject and prevent content/action updates.
POSTs without an explicit custom `formHandler` remain native browser submissions
and run neither guards nor prefetch.

These checks control router UI and intercepted JavaScript actions. They are
**not a server authorization boundary**. Every backend request must authenticate
and authorize independently, including speculative reads and native form
submissions that bypass this Router.

## Integration caveats

- Router renders the registered route and does **not** accept children. Use
  middleware for layouts and shared navigation UI that needs router hooks.
  Middleware composes rendered content; it does not gate prefetch or actions.
- Speculative prefetch records one **attempt** per pathname per matcher,
  ignoring query/hash and retaining failures. `once={false}` keeps a DOM
  trigger active but does not bypass that cache. `clearPrefetchCache(matcher)`
  clears attempts, not application data, in-flight work, or one-shot listeners.
  Handle expected speculative failures inside the preload callback when using
  Link or usePrefetchEffect, which do not observe returned promises.
- `useNavigationSignal()` exposes a native NavigateEvent signal, not a
  route-unmount cancellation guarantee. It is null initially; a completed
  navigation's signal need not abort on a later navigation.
- Memory navigation keeps one fixed URL. Its navigation/traversal methods
  return resolved promises without changing location or emitting events.
- Postcommit checks cannot undo a committed URL. Their controller rejects
  redirect/addHandler with InvalidStateError. Native redirect also rejects
  traverse/reload attempts; Router does not synthesize a second navigation.

## Repository guidance

Read [AGENTS.md](AGENTS.md) before modifying code. Maintain the affected
[repository skill and references](skills/lambda-router/SKILL.md) in the same
change, including API examples and validation guidance.

# Hooks Reference

Call hooks in React components/custom hooks. Router provides their contexts,
but individual providers can also supply values. Navigation/params/pathname/
transition/type/signal hooks throw without their required provider. Matcher
hooks default to the empty MatcherContext; useActiveLinkProps returns inactive
attributes without pathname context. useNavigationEvents uses an explicit
navigation object and requires no Router. useNavigationHandlers accepts an
explicit transition tuple instead of a provider.

Router renders registered components and does not accept children. Put shared
UI in middleware or supply explicit providers to sibling navigation controls.

## Table of Contents

- [useParams](#useparams)
- [usePathname](#usepathname)
- [useSearchParams](#usesearchparams)
- [useNavigate](#usenavigate)
- [useNavigation](#usenavigation)
- [useNavigationType](#usenavigationtype)
- [useNavigationSignal](#usenavigationsignal)
- [useIsPending](#useispending)
- [useBack](#useback)
- [useForward](#useforward)
- [usePrefetch](#useprefetch)
- [usePrefetchEffect](#useprefetcheffect)
- [useNextMatch](#usenextmatch)
- [useNavigationHandlers](#usenavigationhandlers)
- [useNavigationEvents](#usenavigationevents)
- [useActiveLinkProps](#useactivelinkprops)

---

## useParams

```ts
function useParams(): Record<string, string>
```

Returns the shared dynamic/wildcard parameter record. Values remain URL-encoded;
treat the record as read-only.

```tsx
// Route: /user/:id
function UserPage() {
  const { id } = useParams() // { id: "42" } for /user/42
  return <h1>User {id}</h1>
}
```

Returns `{}` for routes with no dynamic segments.

---

## usePathname

```ts
function usePathname(): string
```

Returns the rendered route's pathname (without query/hash). It can lag the
address bar after a failed noncancelable postcommit check.

```tsx
function Breadcrumb() {
  const pathname = usePathname() // "/user/42"
  return <span>{pathname}</span>
}
```

---

## useSearchParams

```ts
function useSearchParams(): [URLSearchParams, setSearchParams]

type SearchParamsUpdater =
  | URLSearchParams
  | Record<string, string>
  | ((current: URLSearchParams) => URLSearchParams | Record<string, string>)

interface SetSearchParamsOptions {
  history?: NavigationHistoryBehavior // default: "replace"
}
```

Reads search params from React state (concurrent-safe, not from mutable `currentEntry`). Setter preserves hash fragments.
Each setter replaces the entire query unless the updater merges existing
entries. Mutating the getter alone does not navigate. The setter returns the
native NavigationResult; observe both promises for failure. Memory navigation
returns resolved promises but does not change params or location.

```tsx
function FilterPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = searchParams.get('sort') ?? 'newest'

  function updateSort(value: string) {
    // Record form (replaces all params)
    setSearchParams({ sort: value })
  }

  function addFilter(key: string, value: string) {
    // Updater form (modify existing params)
    setSearchParams(function (current) {
      current.set(key, value)
      return current
    })
  }

  function pushToHistory() {
    // Push instead of replace
    setSearchParams({ sort: 'oldest' }, { history: 'push' })
  }
}
```

---

## useNavigate

```ts
function useNavigate(): (url: string, options?: NavigationNavigateOptions) => NavigationResult
```

Programmatic navigation. Delegates to `navigation.navigate()`.
Native result promises preserve native error semantics; observe both when
calling from an event handler. Memory navigation is a fixed-location no-op.

```tsx
function LogoutButton() {
  const navigate = useNavigate()

  function handleLogout() {
    clearSession()
    const result = navigate('/login', { history: 'replace' })
    Promise.all([result.committed, result.finished]).catch(console.error)
  }

  return <button onClick={handleLogout}>Logout</button>
}
```

---

## useNavigation

```ts
function useNavigation(): Navigation
```

Returns the raw browser Navigation API object. Use sparingly — prefer specific hooks.

---

## useNavigationType

```ts
function useNavigationType(): NavigationType | null
```

Returns the type associated with the rendered route: `"push"`, `"replace"`,
`"reload"`, or `"traverse"`. Returns null initially. Failed checks and unchanged
custom actions do not replace the stored type.

```tsx
function PageTracker() {
  const type = useNavigationType()
  useEffect(
    function () {
      if (type === 'push') {
        analytics.trackPageView()
      }
    },
    [type]
  )
}
```

---

## useNavigationSignal

```ts
function useNavigationSignal(): AbortSignal | null
```

Returns the native event AbortSignal, or null initially. It follows native
cancellation semantics, not the mounted route's lifetime. A completed event's
signal need not abort on a later navigation. Own a separate AbortController
when work must be cancelled on unmount.

```tsx
function NavigationStatus() {
  const signal = useNavigationSignal()
  return <p>{signal === null ? 'Initial render' : 'Reached by navigation'}</p>
}
```

---

## useIsPending

```ts
function useIsPending(): boolean
```

Whether a concurrent transition is in progress (route is loading).
This is React's transition state, not a complete native-navigation or initial
guard/precommit pending indicator.

```tsx
function GlobalLoader() {
  const isPending = useIsPending()
  return isPending ? <ProgressBar /> : null
}
```

---

## useBack

```ts
interface UseBackResult {
  back: (options?: NavigationOptions) => NavigationResult
  canGoBack: boolean // reactive, updates on currententrychange
}

function useBack(): UseBackResult
```

```tsx
function BackButton() {
  const { back, canGoBack } = useBack()
  return (
    <button
      onClick={function () {
        const result = back()
        Promise.all([result.committed, result.finished]).catch(console.error)
      }}
      disabled={!canGoBack}>
      Back
    </button>
  )
}
```

---

## useForward

```ts
interface UseForwardResult {
  forward: (options?: NavigationOptions) => NavigationResult
  canGoForward: boolean // reactive
}

function useForward(): UseForwardResult
```

Mirror of `useBack` for forward navigation.
Both availability booleans update on currententrychange. Native failed
traversals reject result promises, while createMemoryNavigation returns its
unchanged resolved entry even with availability false.

---

## usePrefetch

```ts
interface PrefetchOptions {
  matcher?: Matcher<Handler> // override context matcher
}

function usePrefetch(options?: PrefetchOptions): (url: string) => void | Promise<void> | undefined
function clearPrefetchCache(matcher: Matcher<Handler>): void
```

Triggers a route's prefetch function manually. Automatically deduplicates by pathname per matcher instance.
Only speculative calls use this attempt cache; real navigation always runs
prefetch. It ignores query/hash, retains failed attempts, and returns undefined
to duplicate callers rather than the pending promise. Routers sharing a
matcher share attempts. Guards never run, and the controller's methods are
no-ops. Preload only safe server-authorized requests.

```tsx
function PreloadButton({ href }: { href: string }) {
  const prefetch = usePrefetch()

  return (
    <button
      onMouseEnter={function () {
        try {
          Promise.resolve(prefetch(href)).catch(console.error)
        } catch (error) {
          console.error(error)
        }
      }}>
      Go to {href}
    </button>
  )
}
```

Use `clearPrefetchCache(matcher)` after logout or cache invalidation to allow re-prefetch.
It clears attempt bookkeeping only, not data, in-flight work, or one-shot DOM
subscriptions. A matcher argument is required.

---

## usePrefetchEffect

```ts
type PrefetchStrategy = 'viewport' | 'hover'

interface PrefetchEffectOptions {
  href: string | undefined
  on: PrefetchStrategy | undefined
  once?: boolean // default: true
  matcher?: Matcher<Handler>
}

function usePrefetchEffect(ref: RefObject<Element | null>, options: PrefetchEffectOptions): void
```

Attach prefetch to a DOM element. Used internally by `<Link>`, but available for custom components.

- `"hover"`: triggers on `mouseenter`
- `"viewport"`: triggers via `IntersectionObserver`
- `once: true` (default): hover listener fires once; viewport observer
  disconnects after the first callback, even if no entry intersects

False does not bypass the matcher attempt cache. Undefined `on` attaches
nothing; undefined `href` suppresses trigger work but can still attach a
subscription. Viewport requires IntersectionObserver. This hook and Link
ignore prefetch results, so handle expected failures in the preload callback.

```tsx
function Card({ href }: { href: string }) {
  const ref = useRef<HTMLDivElement>(null)
  usePrefetchEffect(ref, { href, on: 'viewport' })
  return <div ref={ref}>...</div>
}
```

---

## useNextMatch

```ts
interface NextMatchOptions {
  matcher?: Matcher<Handler>
}

function useNextMatch(
  options?: NextMatchOptions
): (destination: string | null, notFound: ComponentType) => Resolved<Handler>
```

Resolves a URL to a route match. Returns a resolver function. Falls back to `notFound` component when no route matches. Used internally by Router.
Null/empty destinations return fallback with empty params. Relative paths
resolve against http://localhost/; malformed URLs throw. This only matches:
it does not run guards/prefetch/middleware and must not bypass Router checks.

---

## useNavigationHandlers

```ts
interface PrecommitHandlerOptions {
  guard?: GuardFunc
  prefetch?: PrefetchFunc
  params: Record<string, string>
  url: URL
}

function useNavigationHandlers(transition?: ReturnType<typeof useTransition>): {
  createPrecommitHandler: (options: PrecommitHandlerOptions) =>
    ((controller: NavigationPrecommitController) => Promise<void>) | undefined
  createHandler: (callback: TransitionFunction) => () => Promise<void>
}
```

Builds Navigation API intercept handlers. The `createHandler` wraps the callback in `startTransition` inside a Promise. Low-level — used internally by Router.
Precommit runs guard before prefetch and returns undefined without either.
These primitives do not implement Router's redirect rematching loop or initial
guards. Custom adapters own those semantics. The postcommit promise resolves
after the callback completes, not after every suspended subtree paints; callback
errors reject it. Router's noncancelable path checks postcommit and supplies a
controller whose redirect/addHandler throw InvalidStateError.

---

## useNavigationEvents

```ts
interface NavigationEventHandlers {
  onNavigate?: (event: NavigateEvent) => void
  onNavigateSuccess?: () => void
  onNavigateError?: (error: unknown) => void
}

function useNavigationEvents(navigation: Navigation, handlers: NavigationEventHandlers): void
```

Subscribes to navigation lifecycle events. All callbacks wrapped in `useEffectEvent` for stable references. Note: `navigation` is passed as an argument, not read from context.

---

## useActiveLinkProps

```ts
interface ActiveLinkOptions {
  exact?: boolean // default: true
}

interface ActiveLinkProps {
  'data-active'?: true
  'aria-current'?: 'page'
}

function useActiveLinkProps(
  href: string | undefined,
  options?: ActiveLinkOptions
): { isActive: boolean; props: ActiveLinkProps }
```

Computes active link state by comparing `href` pathname against current pathname. Only the pathname portion is compared (query/hash ignored).
Origin is ignored too: active state is not a same-origin safety check.
Prefix mode requires equality or `hrefPathname + '/'`; `/docs` matches
`/docs/api`, not `/docs-old`, and `/` is not a catch-all. Relative hrefs use
http://localhost/ as base. Without pathname context it returns inactive.

```tsx
function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const { isActive, props } = useActiveLinkProps(href)
  return (
    <a href={href} className={isActive ? 'active' : ''} {...props}>
      {children}
    </a>
  )
}
```

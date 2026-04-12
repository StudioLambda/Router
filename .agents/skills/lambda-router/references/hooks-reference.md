# Hooks Reference

All hooks require a `<Router>` ancestor. Using them outside the router tree throws a descriptive error.

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

Returns dynamic route parameters extracted from the URL pattern.

```tsx
// Route: /user/:id
function UserPage() {
  const { id } = useParams()  // { id: "42" } for /user/42
  return <h1>User {id}</h1>
}
```

Returns `{}` for routes with no dynamic segments.

---

## usePathname

```ts
function usePathname(): string
```

Returns the current URL pathname (without query string or hash).

```tsx
function Breadcrumb() {
  const pathname = usePathname()  // "/user/42"
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
  history?: NavigationHistoryBehavior  // default: "replace"
}
```

Reads search params from React state (concurrent-safe, not from mutable `currentEntry`). Setter preserves hash fragments.

```tsx
function FilterPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = searchParams.get("sort") ?? "newest"

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
    setSearchParams({ sort: "oldest" }, { history: "push" })
  }
}
```

---

## useNavigate

```ts
function useNavigate(): (url: string, options?: NavigationNavigateOptions) => NavigationResult
```

Programmatic navigation. Delegates to `navigation.navigate()`.

```tsx
function LogoutButton() {
  const navigate = useNavigate()

  function handleLogout() {
    clearSession()
    navigate("/login", { history: "replace" })
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

Returns the type of the current navigation: `"push"`, `"replace"`, `"reload"`, or `"traverse"`. Returns `null` before the first navigation event (initial render).

```tsx
function PageTracker() {
  const type = useNavigationType()
  useEffect(function () {
    if (type === "push") {
      analytics.trackPageView()
    }
  }, [type])
}
```

---

## useNavigationSignal

```ts
function useNavigationSignal(): AbortSignal | null
```

Returns the `AbortSignal` for the current navigation. Aborted when the navigation is superseded or cancelled. Returns `null` before the first navigation.

```tsx
function DataLoader() {
  const signal = useNavigationSignal()
  const [data, setData] = useState(null)

  useEffect(function () {
    if (!signal) return
    fetch("/api/data", { signal })
      .then(function (res) { return res.json() })
      .then(setData)
      .catch(function (error) {
        if (error.name !== "AbortError") throw error
      })
  }, [signal])
}
```

---

## useIsPending

```ts
function useIsPending(): boolean
```

Whether a concurrent transition is in progress (route is loading).

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
  canGoBack: boolean  // reactive, updates on currententrychange
}

function useBack(): UseBackResult
```

```tsx
function BackButton() {
  const { back, canGoBack } = useBack()
  return (
    <button onClick={function () { back() }} disabled={!canGoBack}>
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
  canGoForward: boolean  // reactive
}

function useForward(): UseForwardResult
```

Mirror of `useBack` for forward navigation.

---

## usePrefetch

```ts
interface PrefetchOptions {
  matcher?: Matcher<Handler>  // override context matcher
}

function usePrefetch(options?: PrefetchOptions): (url: string) => void | Promise<void> | undefined
function clearPrefetchCache(matcher: Matcher<Handler>): void
```

Triggers a route's prefetch function manually. Automatically deduplicates by pathname per matcher instance.

```tsx
function PreloadButton({ href }: { href: string }) {
  const prefetch = usePrefetch()

  return (
    <button onMouseEnter={function () { prefetch(href) }}>
      Go to {href}
    </button>
  )
}
```

Use `clearPrefetchCache(matcher)` after logout or cache invalidation to allow re-prefetch.

---

## usePrefetchEffect

```ts
type PrefetchStrategy = "viewport" | "hover"

interface PrefetchEffectOptions {
  href?: string
  on?: PrefetchStrategy
  once?: boolean           // default: true
  matcher?: Matcher<Handler>
}

function usePrefetchEffect(ref: RefObject<Element | null>, options: PrefetchEffectOptions): void
```

Attach prefetch to a DOM element. Used internally by `<Link>`, but available for custom components.

- `"hover"`: triggers on `mouseenter`
- `"viewport"`: triggers via `IntersectionObserver`
- `once: true` (default): fires once then disconnects

```tsx
function Card({ href }: { href: string }) {
  const ref = useRef<HTMLDivElement>(null)
  usePrefetchEffect(ref, { href, on: "viewport" })
  return <div ref={ref}>...</div>
}
```

---

## useNextMatch

```ts
interface NextMatchOptions {
  matcher?: Matcher<Handler>
}

function useNextMatch(options?: NextMatchOptions): (
  destination: string | null,
  notFound: ComponentType
) => Resolved<Handler>
```

Resolves a URL to a route match. Returns a resolver function. Falls back to `notFound` component when no route matches. Used internally by Router.

---

## useNavigationHandlers

```ts
interface PrecommitHandlerOptions {
  prefetch?: PrefetchFunc
  params: Record<string, string>
  url: URL
}

function useNavigationHandlers(
  transition?: ReturnType<typeof useTransition>
): {
  createPrecommitHandler: (options: PrecommitHandlerOptions) => (() => Promise<void>) | undefined
  createHandler: (callback: () => void) => () => Promise<void>
}
```

Builds Navigation API intercept handlers. The `createHandler` wraps the callback in `startTransition` inside a Promise. Low-level — used internally by Router.

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
  exact?: boolean  // default: true
}

interface ActiveLinkProps {
  "data-active"?: true
  "aria-current"?: "page"
}

function useActiveLinkProps(
  href: string | undefined,
  options?: ActiveLinkOptions
): { isActive: boolean; props: ActiveLinkProps }
```

Computes active link state by comparing `href` pathname against current pathname. Only the pathname portion is compared (query/hash ignored).

```tsx
function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const { isActive, props } = useActiveLinkProps(href)
  return (
    <a href={href} className={isActive ? "active" : ""} {...props}>
      {children}
    </a>
  )
}
```

/**
 * Minimal subset of the NavigationHistoryEntry interface
 * needed by the Router component and associated hooks. Only
 * the `url` property is read during rendering. The full
 * NavigationHistoryEntry interface is far larger, but the
 * Router never accesses properties like `key`, `id`,
 * `sameDocument`, `getState`, or the event handlers.
 */
interface MemoryNavigationEntry {
  /**
   * The full URL string for this history entry.
   */
  readonly url: string
}

/**
 * Options for creating a memory navigation instance.
 */
export interface MemoryNavigationOptions {
  /**
   * The initial URL for the memory navigation. This is the
   * URL that `currentEntry.url` will return. Typically the
   * request URL from the server for SSR, or a test URL.
   *
   * @example `'https://example.com/user/42?tab=posts'`
   */
  readonly url: string
}

/**
 * Creates a minimal in-memory Navigation object suitable for
 * server-side rendering and testing environments where the
 * browser Navigation API is unavailable.
 *
 * The returned object satisfies the subset of the `Navigation`
 * interface consumed by the Router component and hooks:
 *
 * - `currentEntry.url` — returns the initial URL
 * - `addEventListener` / `removeEventListener` — no-ops
 *   (no events fire in a memory environment)
 * - `navigate()` — no-op that returns a NavigationResult
 *   with immediately-resolved promises
 * - `back()` / `forward()` — no-ops that return a
 *   NavigationResult with immediately-resolved promises
 * - `traverseTo()` — no-op that returns a NavigationResult
 * - `updateCurrentEntry()` — no-op
 * - `canGoBack` / `canGoForward` — always false
 * - `entries()` — returns a single-entry array
 *
 * The object is cast to `Navigation` for compatibility with
 * the Router's `navigation` prop and `NavigationContext`.
 * Properties not listed above are not implemented and will
 * throw if accessed by consumer code outside the Router.
 *
 * @param options - Configuration including the initial URL.
 * @returns A Navigation-compatible object for SSR or testing.
 *
 * @example
 * ```tsx
 * // Server-side rendering
 * const navigation = createMemoryNavigation({
 *   url: request.url,
 * })
 *
 * const html = renderToString(
 *   <Router navigation={navigation} matcher={matcher}>
 *     <App />
 *   </Router>
 * )
 * ```
 */
export function createMemoryNavigation(options: MemoryNavigationOptions): Navigation {
  const entry: MemoryNavigationEntry = {
    url: options.url,
  }

  const entryAsHistoryEntry = entry as unknown as NavigationHistoryEntry

  /**
   * Pre-built NavigationResult returned by all navigation
   * methods. Uses the same entry cast as a history entry
   * with immediately-resolved promises. Allocated once to
   * avoid per-call object creation.
   */
  const result: NavigationResult = {
    committed: Promise.resolve(entryAsHistoryEntry),
    finished: Promise.resolve(entryAsHistoryEntry),
  }

  /**
   * No-op event listener registration. In SSR and testing
   * environments, no navigation events are dispatched, so
   * the Router's effect subscriptions are harmless no-ops.
   */
  function addEventListener() {}

  /**
   * No-op event listener removal. Mirrors addEventListener
   * as a symmetric no-op.
   */
  function removeEventListener() {}

  /**
   * No-op navigate that returns a NavigationResult with
   * pre-resolved committed and finished promises. In SSR
   * the result is never awaited, but returning valid
   * promises avoids runtime errors if consumer code chains
   * on the result.
   */
  function navigate(): NavigationResult {
    return result
  }

  /**
   * No-op backward navigation. Returns pre-resolved promises
   * matching the NavigationResult interface. In a memory
   * environment there is no history stack to traverse.
   */
  function back(): NavigationResult {
    return result
  }

  /**
   * No-op forward navigation. Returns pre-resolved promises
   * matching the NavigationResult interface. In a memory
   * environment there is no history stack to traverse.
   */
  function forward(): NavigationResult {
    return result
  }

  /**
   * No-op history traversal to a specific entry key. Returns
   * pre-resolved promises. In a memory environment there is
   * only a single entry, so traversal is meaningless.
   */
  function traverseTo(): NavigationResult {
    return result
  }

  /**
   * No-op current entry state update. In a memory environment
   * entry state is not tracked, so this is silently ignored.
   */
  function updateCurrentEntry() {}

  /**
   * Returns the single-entry history list. The memory
   * adapter only ever has one entry — the initial URL.
   */
  function entries(): NavigationHistoryEntry[] {
    return [entryAsHistoryEntry]
  }

  return {
    currentEntry: entry,
    canGoBack: false,
    canGoForward: false,
    transition: null,
    addEventListener,
    removeEventListener,
    navigate,
    back,
    forward,
    traverseTo,
    updateCurrentEntry,
    entries,
  } as unknown as Navigation
}

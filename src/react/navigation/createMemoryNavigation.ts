/**
 * Minimal subset of the NavigationHistoryEntry interface
 * needed by the Router component. Only the `url` property
 * is read during rendering. The full NavigationHistoryEntry
 * interface is far larger, but the Router never accesses
 * properties like `key`, `id`, `sameDocument`, `getState`,
 * or the event handlers.
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
 * interface consumed by the Router component:
 *
 * - `currentEntry.url` — returns the initial URL
 * - `addEventListener` / `removeEventListener` — no-ops
 *   (no events fire in a memory environment)
 * - `navigate()` — no-op that returns a NavigationResult
 *   with immediately-resolved promises
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
    return {
      committed: Promise.resolve(entry as unknown as NavigationHistoryEntry),
      finished: Promise.resolve(entry as unknown as NavigationHistoryEntry),
    }
  }

  /**
   * Returns the single-entry history list. The memory
   * adapter only ever has one entry — the initial URL.
   */
  function entries(): NavigationHistoryEntry[] {
    return [entry as unknown as NavigationHistoryEntry]
  }

  return {
    currentEntry: entry,
    canGoBack: false,
    canGoForward: false,
    transition: null,
    addEventListener,
    removeEventListener,
    navigate,
    entries,
  } as unknown as Navigation
}

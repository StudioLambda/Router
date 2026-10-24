/**
 * Describes a route matcher that maps URL path patterns to
 * handlers. Supports static segments, dynamic `:param`
 * segments, and wildcard `*param` segments with a trie-based
 * lookup.
 *
 * @typeParam T - The handler type associated with each route.
 * @example
 * ```ts
 * const matcher: Matcher<string> = createMatcher()
 * matcher.register('/users/:id', 'user')
 * const result = matcher.match('/users/42')
 * ```
 */
export interface Matcher<T> {
  /**
   * Registers a route pattern with a corresponding handler.
   * Patterns use `/`-separated segments where `:name` denotes
   * a dynamic parameter (e.g. `/user/:id/posts`) and `*name`
   * denotes a wildcard that captures the rest of the path
   * (e.g. `/files/*path`). A bare `*` captures into a param
   * named `'*'`.
   *
   * @param pattern - The URL path pattern to register.
   * @param handler - The handler to associate with this pattern.
   * @throws Error for duplicate routes or conflicting dynamic/wildcard names.
   * Registration mutates the trie; a failed registration is not rolled back.
   * Use defined handlers: `undefined` represents an unregistered trie node.
   * @example
   * ```ts
   * const matcher = createMatcher<string>()
   * matcher.register('/users/:id', 'user')
   * ```
   */
  readonly register: (pattern: string, handler: T) => void

  /**
   * Attempts to match a URL path against registered routes.
   * Static segments take priority over dynamic ones, which
   * take priority over wildcard segments. Returns the matched
   * handler and extracted parameters, or `null` if no route
   * matches.
   *
   * @param path - The URL path to match (e.g. `/user/42`).
   * @returns The resolved match with handler and params, or null.
   * Empty slash-separated segments are ignored. Values remain URL-encoded;
   * query strings and hashes must be removed by the caller before matching.
   * @example
   * ```ts
   * const matcher = createMatcher<string>()
   * matcher.register('/users/:id', 'user')
   * const id = matcher.match('/users/42/')?.params.id // '42'
   * ```
   */
  readonly match: (path: string) => Resolved<T> | null
}

/**
 * The result of a successful route match. Contains the handler
 * registered for the matched pattern and a record of extracted
 * dynamic parameters.
 *
 * @typeParam T - The handler type associated with the route.
 * @example
 * ```ts
 * const matcher = createMatcher<string>()
 * matcher.register('/users/:id', 'user')
 * const match: Resolved<string> | null = matcher.match('/users/42')
 * ```
 */
export interface Resolved<T> {
  /**
   * The handler that was registered for the matched route pattern.
   * @example `matcher.match('/users/42')?.handler` returns the registered value.
   */
  readonly handler: T

  /**
   * Dynamic path parameters extracted from the URL. Keys are the
   * parameter names from the pattern (without the `:` prefix),
   * values are the corresponding URL segments.
   *
   * @example
   * `matcher.match('/user/42')?.params.id` is `'42'` for `/user/:id`.
   */
  readonly params: Record<string, string>
}

/**
 * Configuration options for creating a new matcher instance.
 *
 * @typeParam T - The handler type associated with each route.
 * @example
 * ```ts
 * const options: Options<string> = { root: { children: new Map() } }
 * const matcher = createMatcher(options)
 * ```
 */
export interface Options<T> {
  /**
   * An existing trie root node to use instead of creating
   * an empty one. Useful for pre-built or shared route trees.
   * Retained and mutated, not copied; matchers sharing a root see each
   * other's registrations. Omit it for independent route tables.
   * @example `createMatcher<string>({ root: { children: new Map() } })`
   */
  readonly root?: Node<T>
}

/**
 * A node in the route-matching trie. Each node represents a
 * single URL path segment and may hold a handler (indicating
 * a complete route), static children (keyed by segment string),
 * a single dynamic child (for `:param` segments), and/or a
 * wildcard child (for `*param` segments that capture the rest
 * of the path).
 *
 * @typeParam T - The handler type associated with each route.
 * @example
 * ```ts
 * const root: Node<string> = { children: new Map() }
 * const matcher = createMatcher({ root })
 * matcher.register('/users', 'list') // mutates root.children
 * ```
 */
export interface Node<T> {
  /**
   * Map of static child segments. Each key is a literal path
   * segment string (e.g. `"user"`, `"posts"`).
   * @example `const root: Node<string> = { children: new Map() }`
   */
  readonly children: Map<string, Node<T>>

  /**
   * The handler registered at this node, or `undefined` if
   * this node is only an intermediate segment in a longer
   * pattern.
   * @example `const leaf: Node<string> = { children: new Map(), handler: 'list' }`
   */
  handler?: T

  /**
   * The single dynamic child node for `:param` segments.
   * Only one dynamic segment is allowed per trie level.
   * @example `root.child = { children: new Map(), name: 'id', handler: 'user' }`
   */
  child?: Node<T>

  /**
   * Capture name without the `:` or `*` prefix. Set on dynamic and
   * wildcard nodes; static nodes do not need a name.
   * @example `const dynamic: Node<string> = { children: new Map(), name: 'id' }`
   */
  readonly name?: string

  /**
   * The wildcard child node for `*param` segments. Captures
   * all remaining path segments into a single parameter.
   * Only one wildcard child exists per trie level. Put it last in the
   * pattern: registration does not reject later segments, but matching
   * cannot resolve handlers below the wildcard node.
   * @example `root.wildcard = { children: new Map(), name: 'path', handler: 'file' }`
   */
  wildcard?: Node<T>
}

/**
 * Creates a new trie-based route matcher. Routes are registered
 * with patterns containing static segments, dynamic (`:param`)
 * segments, and wildcard (`*param`) segments. Matching
 * prioritises static segments over dynamic ones, and dynamic
 * over wildcards, performing a depth-first search through the
 * trie.
 *
 * Wildcard segments capture all remaining path segments into a
 * single parameter joined by `/`. A bare `*` captures into
 * a param named `'*'`. Put wildcards last: registration does not validate
 * this constraint, but matching only resolves a handler directly on the
 * wildcard node. Wildcards require at least one remaining segment.
 *
 * @typeParam T - The handler type associated with each route.
 * @param options - Optional configuration with a pre-built root node.
 * @returns A matcher instance with `register` and `match` methods.
 * @example
 * ```ts
 * const matcher = createMatcher<string>()
 * matcher.register('/files/*path', 'file')
 * const path = matcher.match('/files/a/b')?.params.path // 'a/b'
 * ```
 */
export function createMatcher<T>(options?: Options<T>): Matcher<T> {
  const root: Node<T> = options?.root ?? { children: new Map() }

  /**
   * Registers a route pattern by walking/creating trie nodes
   * for each segment and attaching the handler at the leaf.
   * Wildcard segments (`*param`) create a terminal wildcard
   * node. Callers must place wildcards last; registration itself does not
   * reject later segments, which matching cannot resolve.
   *
   * @param pattern - The URL path pattern to register.
   * @param handler - The handler to store at the leaf node.
   */
  function register(pattern: string, handler: T) {
    const segments = pattern.split('/').filter(Boolean)
    let node = root

    for (const segment of segments) {
      if (segment.startsWith('*')) {
        const name = segment.length > 1 ? segment.slice(1) : '*'

        if (!node.wildcard) {
          node.wildcard = { children: new Map(), name }
        } else if (node.wildcard.name !== name) {
          throw new Error(
            `conflicting wildcard param name at "${pattern}": ` +
              `existing "*${node.wildcard.name}" vs new "*${name}"`
          )
        }

        node = node.wildcard
        continue
      }

      if (segment.startsWith(':')) {
        const name = segment.slice(1)

        if (!node.child) {
          node.child = { children: new Map(), name }
        } else if (node.child.name !== name) {
          throw new Error(
            `conflicting dynamic param name at "${pattern}": ` +
              `existing ":${node.child.name}" vs new ":${name}"`
          )
        }

        node = node.child
        continue
      }

      let next = node.children.get(segment)

      if (!next) {
        next = { children: new Map() }
        node.children.set(segment, next)
      }

      node = next
    }

    if (node.handler !== undefined) {
      throw new Error(`duplicate route registration for pattern "${pattern}"`)
    }

    node.handler = handler
  }

  /**
   * Matches a URL path against the trie by splitting it into
   * segments and performing a depth-first search. Static
   * children are tried before the dynamic child, and dynamic
   * before the wildcard, at each level.
   *
   * @param path - The URL path to match.
   * @returns The resolved handler and params, or null.
   */
  function match(path: string): Resolved<T> | null {
    const segments = path.split('/').filter(Boolean)

    /**
     * Recursively searches the trie for a matching route.
     * Tries the static child first (exact segment match),
     * then falls back to the dynamic child, and finally
     * to the wildcard child which captures all remaining
     * segments.
     *
     * @param node - The current trie node being examined.
     * @param index - The current segment index in the path.
     * @param params - Accumulated dynamic parameters so far.
     * @returns The resolved match, or null if no match found.
     */
    function search(
      node: Node<T>,
      index: number,
      params: Record<string, string>
    ): Resolved<T> | null {
      if (index === segments.length) {
        return node.handler !== undefined ? { handler: node.handler, params } : null
      }

      const segment = segments[index]

      const child = node.children.get(segment)

      if (child) {
        const result = search(child, index + 1, params)

        if (result) {
          return result
        }
      }

      if (node.child && node.child.name) {
        const result = search(node.child, index + 1, {
          ...params,
          [node.child.name]: segment,
        })

        if (result) {
          return result
        }
      }

      if (node.wildcard && node.wildcard.name && node.wildcard.handler !== undefined) {
        const rest = segments.slice(index).join('/')

        return {
          handler: node.wildcard.handler,
          params: { ...params, [node.wildcard.name]: rest },
        }
      }

      return null
    }

    return search(root, 0, {})
  }

  return { register, match }
}

/**
 * Describes a route matcher that maps URL path patterns to
 * handlers. Supports static segments, dynamic `:param`
 * segments, and wildcard `*param` segments with a trie-based
 * lookup.
 *
 * @typeParam T - The handler type associated with each route.
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
   */
  readonly match: (path: string) => Resolved<T> | null
}

/**
 * The result of a successful route match. Contains the handler
 * registered for the matched pattern and a record of extracted
 * dynamic parameters.
 *
 * @typeParam T - The handler type associated with the route.
 */
export interface Resolved<T> {
  /**
   * The handler that was registered for the matched route pattern.
   */
  readonly handler: T

  /**
   * Dynamic path parameters extracted from the URL. Keys are the
   * parameter names from the pattern (without the `:` prefix),
   * values are the corresponding URL segments.
   *
   * @example
   * Pattern `/user/:id` matched against `/user/42`
   * produces `{ id: "42" }`.
   */
  readonly params: Record<string, string>
}

/**
 * Configuration options for creating a new matcher instance.
 *
 * @typeParam T - The handler type associated with each route.
 */
export interface Options<T> {
  /**
   * An existing trie root node to use instead of creating
   * an empty one. Useful for pre-built or shared route trees.
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
 */
export interface Node<T> {
  /**
   * Map of static child segments. Each key is a literal path
   * segment string (e.g. `"user"`, `"posts"`).
   */
  readonly children: Map<string, Node<T>>

  /**
   * The handler registered at this node, or `undefined` if
   * this node is only an intermediate segment in a longer
   * pattern.
   */
  handler?: T

  /**
   * The single dynamic child node for `:param` segments.
   * Only one dynamic segment is allowed per trie level.
   */
  child?: Node<T>

  /**
   * The parameter name for this dynamic segment (without the
   * `:` prefix). Only set on nodes created from `:param`
   * patterns.
   */
  readonly name?: string

  /**
   * The wildcard child node for `*param` segments. Captures
   * all remaining path segments into a single parameter.
   * Only one wildcard is allowed per trie level and it must
   * be the last segment in the pattern.
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
 * a param named `'*'`. Wildcards must be the last segment
 * in a pattern.
 *
 * @typeParam T - The handler type associated with each route.
 * @param options - Optional configuration with a pre-built root node.
 * @returns A matcher instance with `register` and `match` methods.
 */
export function createMatcher<T>(options?: Options<T>): Matcher<T> {
  const root: Node<T> = options?.root ?? { children: new Map() }

  /**
   * Registers a route pattern by walking/creating trie nodes
   * for each segment and attaching the handler at the leaf.
   * Wildcard segments (`*param`) create a terminal wildcard
   * node — no further segments are allowed after a wildcard.
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

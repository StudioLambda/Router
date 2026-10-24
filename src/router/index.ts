/**
 * Framework-independent pathname matching. Pass pathnames, not complete URLs;
 * the React integration is available separately from the `/react` entry point.
 *
 * @example
 * ```ts
 * import { createMatcher } from '@studiolambda/router'
 * const matcher = createMatcher<string>()
 * matcher.register('/users/:id', 'user')
 * const userId = matcher.match('/users/42')?.params.id
 * ```
 */
export * from 'router:matcher'

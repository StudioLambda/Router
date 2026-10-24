/**
 * Extracts the pathname portion from a URL string. Uses a
 * dummy base URL to handle both absolute and relative paths
 * correctly. Returns `'/'` when the input is null or undefined.
 *
 * Used by Router for destination URLs and by Link/useActiveLinkProps for
 * active-link comparison. Relative paths resolve against `http://localhost/`,
 * not the current browser location; origin, search, and hash are discarded.
 *
 * @param url - The URL string to extract a pathname from.
 *   May be absolute (`https://example.com/foo`), relative
 *   (`/foo/bar`), or nullish.
 * @returns The pathname string, or `'/'` when no URL is
 *   provided.
 * @throws TypeError when URL construction fails for malformed input.
 * @example
 * ```ts
 * extractPathname('https://example.com/users/42?tab=posts#bio') // '/users/42'
 * extractPathname(null) // '/'
 * ```
 */
export function extractPathname(url: string | null | undefined): string {
  if (url === null || url === undefined) {
    return '/'
  }

  return new URL(url, 'http://localhost').pathname
}

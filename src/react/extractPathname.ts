/**
 * Extracts the pathname portion from a URL string. Uses a
 * dummy base URL to handle both absolute and relative paths
 * correctly. Returns `'/'` when the input is null or undefined.
 *
 * Used by the Router (to extract pathname from navigation
 * destination URLs), Link (for active link comparison), and
 * usePrefetch (to match URLs against registered routes).
 *
 * @param url - The URL string to extract a pathname from.
 *   May be absolute (`https://example.com/foo`), relative
 *   (`/foo/bar`), or nullish.
 * @returns The pathname string, or `'/'` when no URL is
 *   provided.
 */
export function extractPathname(url: string | null | undefined): string {
  if (url === null || url === undefined) {
    return '/'
  }

  return new URL(url, 'http://localhost').pathname
}

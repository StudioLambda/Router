import { createContext } from 'react'

/**
 * Provides the full URL string for the rendered route to descendant
 * components. Updated after navigation checks succeed, not on every native
 * commit. After a failed postcommit check, this value can lag the address
 * bar. Defaults to `null` without a Router or when no entry URL is available.
 *
 * Consumed by `useSearchParams` to derive search parameters
 * from React state rather than reading the mutable
 * `navigation.currentEntry` during render — preventing
 * subscription tearing in concurrent mode.
 * @example `<UrlContext value="https://example.com/search?q=router"><SearchPage /></UrlContext>`
 */
export const UrlContext = createContext<string | null>(null)

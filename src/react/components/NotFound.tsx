/**
 * Default fallback component rendered when no registered
 * route matches the current URL. Uses an `<h1>` heading
 * for semantic document structure and accessibility.
 *
 * Can be overridden via the `notFound` prop on the Router
 * component for custom 404 pages.
 * This renders UI only; it does not set an HTTP response status on SSR.
 * @returns A heading containing "Not Found".
 * @example `<Router matcher={matcher} notFound={NotFound} />`
 */
export function NotFound() {
  return <h1>Not Found</h1>
}

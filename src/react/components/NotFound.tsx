/**
 * Default fallback component rendered when no registered
 * route matches the current URL. Uses an `<h1>` heading
 * for semantic document structure and accessibility.
 *
 * Can be overridden via the `notFound` prop on the Router
 * component for custom 404 pages.
 */
export function NotFound() {
  return <h1>Not Found</h1>
}

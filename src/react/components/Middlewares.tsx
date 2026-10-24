import { type ReactNode } from 'react'
import { type Handler } from 'router/react:router'

/**
 * Render-time wrapper configuration. This composes UI only; mandatory
 * access checks belong in route guards, not middleware.
 * @example `const view = <Middlewares value={[Layout]}><Page /></Middlewares>`
 */
export interface MiddlewaresProps {
  /**
   * The array of middleware components to wrap around children.
   * May be `undefined` when the matched route has no middlewares.
   * An empty array also leaves children unchanged.
   * @example `<Middlewares value={undefined}><Page /></Middlewares>`
   */
  value: Handler['middlewares']

  /**
   * The content to wrap inside the middleware chain. Typically
   * the matched route component rendered by the Router.
   * @example `<Middlewares value={[Layout]}><Page /></Middlewares>`
   */
  children?: ReactNode
}

/**
 * Wraps children in the given middleware components using
 * `reduceRight` so the first middleware in the array is the
 * outermost wrapper. When no middlewares are provided, renders
 * children directly.
 *
 * Each middleware component receives `children` as its only
 * prop and is responsible for rendering them (or not, in the
 * case of conditional UI). It does not gate prefetch or form actions.
 * @param props - Outermost-first wrapper list and content to compose.
 * @returns Wrapped content, or unchanged children when the list is empty.
 * @example `<Middlewares value={[Layout, Sidebar]}><Page /></Middlewares>`
 */
export function Middlewares({ value, children }: MiddlewaresProps) {
  return (
    value?.reduceRight(
      (inner, Middleware, index) => <Middleware key={index}>{inner}</Middleware>,
      children
    ) ?? children
  )
}

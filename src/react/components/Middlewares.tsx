import { type ReactNode } from 'react'
import { type Handler } from 'router/react:router'

/**
 * Props for the Middlewares wrapper component.
 */
export interface MiddlewaresProps {
  /**
   * The array of middleware components to wrap around children.
   * May be `undefined` when the matched route has no middlewares.
   */
  value: Handler['middlewares']

  /**
   * The content to wrap inside the middleware chain. Typically
   * the matched route component rendered by the Router.
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
 * case of auth guards).
 */
export function Middlewares({ value, children }: MiddlewaresProps) {
  return (
    value?.reduceRight(
      (inner, Middleware, index) => <Middleware key={index}>{inner}</Middleware>,
      children
    ) ?? children
  )
}

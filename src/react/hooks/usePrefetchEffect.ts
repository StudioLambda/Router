import { type RefObject, useEffect, useEffectEvent } from 'react'
import { usePrefetch } from 'router/react:hooks/usePrefetch'
import { type Handler } from 'router/react:router'
import { type Matcher } from 'router:matcher'

/**
 * Prefetch trigger strategy. Determines which DOM event
 * activates the prefetch for the target element.
 *
 * - `viewport` — prefetch fires when the element enters
 *   the viewport via an IntersectionObserver.
 * - `hover` — prefetch fires on `mouseenter`.
 */
export type PrefetchStrategy = 'viewport' | 'hover'

/**
 * Options for the `usePrefetchEffect` hook.
 */
export interface PrefetchEffectOptions {
  /**
   * The URL to prefetch. When undefined, the effect is
   * a no-op (no observer or listener is attached).
   */
  href: string | undefined

  /**
   * Prefetch trigger strategy. When undefined, the effect
   * is a no-op — no proactive prefetch is set up.
   */
  on: PrefetchStrategy | undefined

  /**
   * Whether to only prefetch once. When true, hover
   * listeners use the `{ once }` option and viewport
   * observers disconnect after the first intersection.
   * Defaults to `true`.
   */
  once?: boolean

  /**
   * Optional matcher override. When omitted, reads from
   * `MatcherContext` via `usePrefetch`.
   */
  matcher?: Matcher<Handler>
}

/**
 * Attaches prefetch behavior to a DOM element via a ref.
 * Sets up an IntersectionObserver (for `viewport` strategy)
 * or a mouseenter listener (for `hover` strategy) that
 * triggers route prefetching when activated.
 *
 * When `on` is undefined or `href` is undefined, no
 * observer or listener is attached — the hook is a no-op.
 *
 * This hook is used internally by the Link component and
 * can also be used standalone to add prefetch behavior to
 * any DOM element.
 *
 * @param ref - A ref to the DOM element to observe. The
 *   element must be mounted before the effect runs.
 * @param options - Configuration for the prefetch behavior
 *   including the URL, trigger strategy, and matcher.
 *
 * @example
 * ```tsx
 * function Card({ href }: { href: string }) {
 *   const ref = useRef<HTMLDivElement>(null)
 *
 *   usePrefetchEffect(ref, { href, on: 'viewport' })
 *
 *   return <div ref={ref}>...</div>
 * }
 * ```
 */
export function usePrefetchEffect(ref: RefObject<Element | null>, options: PrefetchEffectOptions) {
  const { href, on, once = true, matcher } = options
  const prefetchRoute = usePrefetch({ matcher })

  /**
   * IntersectionObserver callback that triggers prefetch
   * when the element enters the viewport. Disconnects
   * the observer after the first intersection when `once`
   * is true.
   */
  const onViewportIntersection = useEffectEvent<IntersectionObserverCallback>(
    function (entries, observer) {
      for (const entry of entries) {
        if (entry.isIntersecting && href !== undefined) {
          void prefetchRoute(href)
        }
      }

      if (once) {
        observer.disconnect()
      }
    }
  )

  /**
   * Mouse enter callback that triggers prefetch when the
   * user hovers over the element.
   */
  const onHover = useEffectEvent<EventListener>(function () {
    if (href !== undefined) {
      void prefetchRoute(href)
    }
  })

  /**
   * Sets up the prefetch observer or listener based on the
   * chosen strategy. When `on` is undefined, no setup is
   * performed. Cleans up on unmount or when the strategy,
   * once flag, or href changes.
   */
  useEffect(
    function () {
      if (on === undefined) {
        return
      }

      const current = ref.current

      if (current === null) {
        return
      }

      switch (on) {
        case 'hover': {
          current.addEventListener('mouseenter', onHover, { once })

          return function () {
            current.removeEventListener('mouseenter', onHover)
          }
        }
        case 'viewport': {
          const observer = new IntersectionObserver(onViewportIntersection)

          observer.observe(current)

          return function () {
            observer.disconnect()
          }
        }
      }
    },
    [on, once, href]
  )
}

import { type ReactNode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

/**
 * Result returned by `renderHook`. Provides access to the
 * current hook return value and a cleanup function.
 *
 * @typeParam T - The return type of the hook under test.
 */
export interface RenderHookResult<T> {
  /**
   * The current return value of the hook. Updated after
   * each render.
   */
  readonly current: T

  /**
   * Unmounts the test component and removes it from the
   * DOM. Must be called after each test to avoid leaks.
   */
  readonly unmount: () => void
}

/**
 * Options for `renderHook`.
 *
 * @typeParam T - The return type of the hook under test.
 */
export interface RenderHookOptions {
  /**
   * Optional wrapper component that provides context
   * providers around the hook test component.
   */
  wrapper?: (props: { children: ReactNode }) => ReactNode
}

/**
 * Renders a React hook inside a minimal test component and
 * returns the hook's current value. Mimics the API of
 * `@testing-library/react`'s `renderHook` without requiring
 * that dependency.
 *
 * The hook is rendered inside an `act()` boundary. The
 * returned `current` property always reflects the latest
 * hook return value.
 *
 * @typeParam T - The return type of the hook.
 * @param hook - A function that calls the hook under test
 *   and returns its result.
 * @param options - Optional wrapper for context providers.
 * @returns The hook result and an unmount function.
 */
export function renderHook<T>(hook: () => T, options?: RenderHookOptions): RenderHookResult<T> {
  const result: { current: T } = { current: undefined as T }
  const container = document.createElement('div')

  document.body.appendChild(container)

  const root = createRoot(container)

  /**
   * Test component that invokes the hook and captures its
   * return value into the result ref on every render.
   */
  function TestComponent() {
    result.current = hook()

    return null
  }

  const element = options?.wrapper
    ? createElement(options.wrapper, { children: createElement(TestComponent) })
    : createElement(TestComponent)

  act(function () {
    root.render(element)
  })

  return {
    get current() {
      return result.current
    },
    unmount() {
      act(function () {
        root.unmount()
      })

      container.remove()
    },
  }
}

import { describe, it } from 'vitest'
import { type ReactNode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { Middlewares } from './Middlewares'
import { type MiddlewareProps } from 'router/react:router'

describe('Middlewares', { concurrent: true }, function () {
  it('renders children directly when no middlewares are provided', function ({
    expect,
    onTestFinished,
  }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Middlewares, { value: undefined }, createElement('span', null, 'hello'))
      )
    })

    expect(container.textContent).toBe('hello')
  })

  it('wraps children with a single middleware', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    /**
     * Middleware that wraps children in a div with a
     * data-testid attribute for identification.
     */
    function WrapperMiddleware({ children }: MiddlewareProps): ReactNode {
      return createElement('div', { 'data-testid': 'wrapper' }, children)
    }

    act(function () {
      root.render(
        createElement(
          Middlewares,
          { value: [WrapperMiddleware] },
          createElement('span', null, 'inner')
        )
      )
    })

    const wrapper = container.querySelector('[data-testid="wrapper"]')

    expect(wrapper).not.toBeNull()
    expect(wrapper?.textContent).toBe('inner')
  })

  it('nests multiple middlewares with first outermost', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    /**
     * Outer middleware wrapping children in a section
     * element for identification.
     */
    function OuterMiddleware({ children }: MiddlewareProps): ReactNode {
      return createElement('section', { 'data-testid': 'outer' }, children)
    }

    /**
     * Inner middleware wrapping children in an article
     * element for identification.
     */
    function InnerMiddleware({ children }: MiddlewareProps): ReactNode {
      return createElement('article', { 'data-testid': 'inner' }, children)
    }

    act(function () {
      root.render(
        createElement(
          Middlewares,
          { value: [OuterMiddleware, InnerMiddleware] },
          createElement('span', null, 'content')
        )
      )
    })

    const outer = container.querySelector('[data-testid="outer"]')
    const inner = container.querySelector('[data-testid="inner"]')

    expect(outer).not.toBeNull()
    expect(inner).not.toBeNull()
    expect(outer?.contains(inner!)).toBe(true)
    expect(inner?.textContent).toBe('content')
  })
})

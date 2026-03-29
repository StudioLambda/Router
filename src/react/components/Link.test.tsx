import { describe, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { Link } from './Link'
import { PathnameContext } from 'router/react:context/PathnameContext'
import { MatcherContext } from 'router/react:context/MatcherContext'
import { createMatcher } from 'router:matcher'
import { type Handler } from 'router/react:router'

/**
 * Creates a wrapper providing both PathnameContext and an
 * empty MatcherContext for Link tests. The matcher is empty
 * because Link's prefetch setup is a no-op without a
 * matching route and without a strategy.
 */
function createLinkWrapper(pathname: string) {
  const matcher = createMatcher<Handler>()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PathnameContext,
      { value: pathname },
      createElement(MatcherContext, { value: matcher }, children),
    )
  }
}

describe('Link', { concurrent: true }, function () {
  it('renders an anchor element', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, { href: '/about' }, 'About'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor).not.toBeNull()
    expect(anchor?.tagName).toBe('A')
  })

  it('sets href attribute on the anchor', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, { href: '/contact' }, 'Contact'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.getAttribute('href')).toBe('/contact')
  })

  it('adds data-active and aria-current when pathname matches href', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/about')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, { href: '/about' }, 'About'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.hasAttribute('data-active')).toBe(true)
    expect(anchor?.getAttribute('aria-current')).toBe('page')
  })

  it('does not add active attributes when pathname does not match', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/other')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, { href: '/about' }, 'About'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.hasAttribute('data-active')).toBe(false)
    expect(anchor?.hasAttribute('aria-current')).toBe(false)
  })

  it('accepts a string className', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, { href: '/page', className: 'nav-link' }, 'Page'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.className).toBe('nav-link')
  })

  it('accepts a function className that receives isActive', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/active')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, {
            href: '/active',
            className: function ({ isActive }) {
              return isActive ? 'is-active' : 'not-active'
            },
          }, 'Active Link'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.className).toBe('is-active')
  })

  it('passes through additional HTML attributes', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, {
            href: '/test',
            target: '_blank',
            rel: 'noopener',
          }, 'Test'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.getAttribute('target')).toBe('_blank')
    expect(anchor?.getAttribute('rel')).toBe('noopener')
  })

  it('supports non-exact active matching with activeExact false', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/docs/getting-started')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, {
            href: '/docs',
            activeExact: false,
          }, 'Docs'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.hasAttribute('data-active')).toBe(true)
    expect(anchor?.getAttribute('aria-current')).toBe('page')
  })

  it('renders without className when omitted', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)
    const Wrapper = createLinkWrapper('/')

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(
        createElement(Wrapper, null,
          createElement(Link, { href: '/page' }, 'Page'),
        ),
      )
    })

    const anchor = container.querySelector('a')

    expect(anchor?.getAttribute('class')).toBeNull()
  })
})

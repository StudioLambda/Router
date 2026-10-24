import { act, createElement, use, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, vi } from 'vitest'
import { createRouter, type RouteFactory } from '../createRouter'
import { ParamsContext } from '../context/ParamsContext'
import { PathnameContext } from '../context/PathnameContext'
import { Router } from './Router'
import { type GuardContext, type PrefetchContext } from '../router'

/** Renders destination params and pathname to expose stale route contexts. */
function Destination() {
  return createElement('div', null, `destination:${use(ParamsContext)?.id}:${use(PathnameContext)}`)
}

/** Identifies an abandoned protected route if it renders accidentally. */
function Protected() {
  return createElement('div', null, 'protected')
}

/** Wraps destination content so tests distinguish destination middleware. */
function Layout({ children }: { children: ReactNode }) {
  return createElement('section', { 'data-destination': true }, children)
}

/**
 * Drives one intercepted navigation without redispatching after redirect.
 * Like the browser, the controller mutates the same event destination and
 * only commits it once all precommit work succeeds. Failed precommit leaves
 * both the current entry and rendered route unchanged. Tests are sequential
 * because async act shares React's scheduler across roots.
 */
function setup(configure: (route: RouteFactory) => void) {
  /** Entry URL changes only at the simulated commit boundary. */
  const entry = { url: 'https://example.com/' }
  /** Only the Navigation surface consumed by Router is needed here. */
  const navigation = Object.assign(new EventTarget(), { currentEntry: entry })
  /** Test root owns the initial component and all later transitions. */
  const container = document.createElement('div')
  document.body.appendChild(container)
  /** React root disposed by each test's registered cleanup. */
  const root = createRoot(container)
  /** Route registration uses the real builder, including prefetch chaining. */
  const matcher = createRouter((route) => {
    route('/').render(Protected)
    configure(route)
  })

  act(() => root.render(createElement(Router, { matcher, navigation: navigation as Navigation })))

  return {
    container,
    entry,
    /** Removes the root and DOM node even when navigation rejects. */
    cleanup() {
      act(() => root.unmount())
      container.remove()
    },
    /**
     * Executes precommit, commit, then postcommit for a navigation type.
     * Traversals model noncancelable events and reject precommit handlers,
     * while ordinary pushes remain cancelable like in-app navigations.
     * Non-null form data models POST ownership without sending a request.
     */
    async navigate(
      path: string,
      navigationType: NavigationType = 'push',
      formData: FormData | null = null
    ) {
      /** Captures the initial dispatch-time intercept options. */
      let options: NavigationInterceptOptions = {}
      /** Shared destination object mutated by every native redirect. */
      const destination = { url: new URL(path, entry.url).href }
      /** Event retains its identity throughout all redirects. */
      const event = Object.assign(
        new Event('navigate', { cancelable: navigationType !== 'traverse' }),
        {
          canIntercept: true,
          hashChange: false,
          downloadRequest: null,
          formData,
          destination,
          signal: new AbortController().signal,
          navigationType,
          /**
           * Enforces the native restriction on precommit interception before
           * capturing options. Postcommit-only interception remains legal.
           */
          intercept(value: NavigationInterceptOptions) {
            if (!event.cancelable && value.precommitHandler !== undefined) {
              throw new DOMException(
                'cannot precommit a noncancelable navigation',
                'InvalidStateError'
              )
            }

            options = value
          },
        }
      )
      /** Native controller model: redirect mutates, never dispatches. */
      const controller: NavigationPrecommitController = {
        /** Uses the document URL, not the previous destination, as base. */
        redirect(url, redirectOptions) {
          destination.url = new URL(url, entry.url).href
          if (redirectOptions?.history === 'push' || redirectOptions?.history === 'replace') {
            event.navigationType = redirectOptions.history
          }
        },
        addHandler: vi.fn(),
      }

      navigation.dispatchEvent(event)
      await options.precommitHandler?.(controller)
      entry.url = destination.url
      await act(async () => {
        await options.handler?.()
      })

      return options
    },
  }
}

describe('Router redirect destinations', function () {
  it('prefetches traversals after commit with destination params and middleware', async function ({
    expect,
    onTestFinished,
  }) {
    /** Observes the URL at prefetch time to verify the postcommit boundary. */
    const prefetch = vi.fn((_context: PrefetchContext) => {
      expect(app.entry.url).toBe('https://example.com/target/42')
    })
    /** The route retains prefetch and layout behavior without precommit. */
    const app = setup((route) => {
      route('/target/:id').prefetch(prefetch).middleware([Layout]).render(Destination)
    })
    onTestFinished(app.cleanup)

    /** Traversal cannot install a native precommit handler. */
    const options = await app.navigate('/target/42', 'traverse')

    expect(options.precommitHandler).toBeUndefined()
    expect(prefetch).toHaveBeenCalledOnce()
    expect(prefetch.mock.calls[0][0].params).toEqual({ id: '42' })
    expect(app.container.textContent).toBe('destination:42:/target/42')
    expect(app.container.querySelector('section[data-destination]')).not.toBeNull()
  })

  it('rejects postcommit traversal redirects instead of bypassing their guards', async function ({
    expect,
    onTestFinished,
  }) {
    /** Postcommit prefetch must propagate the rejecting controller's error. */
    const app = setup((route) => {
      route('/old').redirect('/target/42')
      route('/target/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/old', 'traverse')).rejects.toMatchObject({
      name: 'InvalidStateError',
    })
    expect(app.entry.url).toBe('https://example.com/old')
    expect(app.container.textContent).toBe('protected')
  })

  it('leaves unowned POSTs to redirect routes unintercepted', async function ({
    expect,
    onTestFinished,
  }) {
    /** Neither the source guard nor the destination may run for native POST. */
    const prefetch = vi.fn()
    /** Mandatory checks must not change ownership of a native form body. */
    const guard = vi.fn()
    /** A redirect registration does not opt a route into form handling. */
    const app = setup((route) => {
      route('/old').guard(guard).prefetch(prefetch).redirect('/target/42')
      route('/target/:id').guard(guard).prefetch(prefetch).render(Destination)
    })
    onTestFinished(app.cleanup)

    /** No handler means the browser retains ownership of the submitted body. */
    const options = await app.navigate('/old', 'push', new FormData())

    expect(options).toEqual({})
    expect(prefetch).not.toHaveBeenCalled()
    expect(guard).not.toHaveBeenCalled()
    expect(app.container.textContent).toBe('protected')
  })

  it('intercepts noncancelable traversals to plain routes without precommit', async function ({
    expect,
    onTestFinished,
  }) {
    /** A route without prefetch must retain baseline history interception. */
    const app = setup((route) => {
      route('/target/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    /** The strict event model rejects any supplied precommit handler. */
    const options = await app.navigate('/target/42', 'traverse')

    expect(options.precommitHandler).toBeUndefined()
    expect(options.handler).toBeTypeOf('function')
    expect(app.entry.url).toBe('https://example.com/target/42')
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('runs source and rematched destination guards before their own prefetch', async function ({
    expect,
    onTestFinished,
  }) {
    /** Records mandatory checks separately from speculative preloading. */
    const calls: string[] = []
    const app = setup((route) => {
      route('/old')
        .guard(() => {
          calls.push('source guard')
        })
        .prefetch(({ controller }) => {
          calls.push('source prefetch')
          controller.redirect('/target/42?tab=posts')
        })
        .render(Protected)
      const target = route('/target')
        .guard(async ({ url }) => {
          expect(url.href).toBe('https://example.com/target/42?tab=posts')
          await Promise.resolve()
          calls.push('parent guard')
        })
        .group()
      target('/:id')
        .guard(({ params }) => {
          expect(params).toEqual({ id: '42' })
          calls.push('target guard')
        })
        .prefetch(() => {
          calls.push('target prefetch')
        })
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/old')

    expect(calls).toEqual([
      'source guard',
      'source prefetch',
      'parent guard',
      'target guard',
      'target prefetch',
    ])
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('rejects a rematched group guard before destination prefetch or content', async function ({
    expect,
    onTestFinished,
  }) {
    const prefetch = vi.fn()
    const content = vi.fn(() => 'secret')
    const childGuard = vi.fn()
    const app = setup((route) => {
      route('/old').redirect('/target/42')
      const target = route('/target')
        .guard(async () => {
          throw new Error('access denied')
        })
        .group()
      target('/:id').guard(childGuard).prefetch(prefetch).render(content)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/old')).rejects.toThrow('access denied')
    expect(app.entry.url).toBe('https://example.com/')
    expect(app.container.textContent).toBe('protected')
    expect(childGuard).not.toHaveBeenCalled()
    expect(prefetch).not.toHaveBeenCalled()
    expect(content).not.toHaveBeenCalled()
  })

  it('abandons custom form actions after redirect while checking and rendering the target', async function ({
    expect,
    onTestFinished,
  }) {
    const sourceAction = vi.fn()
    const targetAction = vi.fn()
    const calls: string[] = []
    const app = setup((route) => {
      route('/submit')
        .guard(() => {
          calls.push('source guard')
        })
        .prefetch(({ controller }) => {
          calls.push('source prefetch')
          controller.redirect('/target/42')
        })
        .formHandler(sourceAction)
        .render(Protected)
      const target = route('/target')
        .guard(() => {
          calls.push('target guard')
        })
        .group()
      target('/:id')
        .prefetch(() => {
          calls.push('target prefetch')
        })
        .formHandler(targetAction)
        .middleware([Layout])
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/submit', 'push', new FormData())

    expect(calls).toEqual(['source guard', 'source prefetch', 'target guard', 'target prefetch'])
    expect(sourceAction).not.toHaveBeenCalled()
    expect(targetAction).not.toHaveBeenCalled()
    expect(app.container.textContent).toBe('destination:42:/target/42')
    expect(app.container.querySelector('section[data-destination]')).not.toBeNull()
  })

  it('denies redirected form destinations without running either custom action', async function ({
    expect,
    onTestFinished,
  }) {
    const action = vi.fn()
    const prefetch = vi.fn()
    const app = setup((route) => {
      route('/submit')
        .prefetch(({ controller }) => controller.redirect('/target/42'))
        .formHandler(action)
        .render(Protected)
      route('/target/:id')
        .guard(async () => {
          throw new Error('access denied')
        })
        .prefetch(prefetch)
        .formHandler(action)
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/submit', 'push', new FormData())).rejects.toThrow('access denied')
    expect(action).not.toHaveBeenCalled()
    expect(prefetch).not.toHaveBeenCalled()
    expect(app.entry.url).toBe('https://example.com/')
    expect(app.container.textContent).toBe('protected')
  })

  it('abandons the action when a form redirects to the same route with new search params', async function ({
    expect,
    onTestFinished,
  }) {
    const action = vi.fn()
    const guard = vi.fn()
    const app = setup((route) => {
      route('/target/:id')
        .guard(guard)
        .prefetch(({ url, controller }) => {
          if (!url.searchParams.has('complete')) {
            controller.redirect('/target/42?complete=true')
          }
        })
        .formHandler(action)
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/target/42', 'push', new FormData())

    expect(action).not.toHaveBeenCalled()
    expect(guard).toHaveBeenCalledTimes(2)
    expect(app.entry.url).toBe('https://example.com/target/42?complete=true')
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('awaits a guard-only traversal after commit and before changing content', async function ({
    expect,
    onTestFinished,
  }) {
    let allow!: () => void
    const pending = new Promise<void>((resolve) => {
      allow = resolve
    })
    const guard = vi.fn(({ params }: GuardContext) => {
      expect(app.entry.url).toBe('https://example.com/target/42')
      expect(params).toEqual({ id: '42' })
      return pending
    })
    const app = setup((route) => route('/target/:id').guard(guard).render(Destination))
    onTestFinished(app.cleanup)

    const finished = app.navigate('/target/42', 'traverse')
    await Promise.resolve()
    expect(guard).toHaveBeenCalledOnce()
    expect(app.container.textContent).toBe('protected')
    allow()
    const options = await finished

    expect(options.precommitHandler).toBeUndefined()
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('preserves old content when a noncancelable traversal guard rejects', async function ({
    expect,
    onTestFinished,
  }) {
    const prefetch = vi.fn()
    const app = setup((route) => {
      route('/target/:id')
        .guard(async () => {
          throw new Error('access denied')
        })
        .prefetch(prefetch)
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/target/42', 'traverse')).rejects.toThrow('access denied')
    expect(prefetch).not.toHaveBeenCalled()
    expect(app.entry.url).toBe('https://example.com/target/42')
    expect(app.container.textContent).toBe('protected')
  })

  it('runs traversal guards then async prefetch after commit before rendering', async function ({
    expect,
    onTestFinished,
  }) {
    const calls: string[] = []
    const app = setup((route) => {
      route('/target/:id')
        .guard(async () => {
          expect(app.entry.url).toBe('https://example.com/target/42')
          await Promise.resolve()
          calls.push('guard')
        })
        .prefetch(async () => {
          expect(app.container.textContent).toBe('protected')
          await Promise.resolve()
          calls.push('prefetch')
        })
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    const options = await app.navigate('/target/42', 'traverse')

    expect(options.precommitHandler).toBeUndefined()
    expect(calls).toEqual(['guard', 'prefetch'])
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('runs noncancelable custom actions only after guards and prefetch complete', async function ({
    expect,
    onTestFinished,
  }) {
    const calls: string[] = []
    const formData = new FormData()
    const app = setup((route) => {
      route('/submit')
        .guard(async () => {
          expect(app.entry.url).toBe('https://example.com/submit')
          await Promise.resolve()
          calls.push('guard')
        })
        .prefetch(async () => {
          await Promise.resolve()
          calls.push('prefetch')
        })
        .formHandler((data) => {
          expect(data).toBe(formData)
          calls.push('action')
        })
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    const options = await app.navigate('/submit', 'traverse', formData)

    expect(options.precommitHandler).toBeUndefined()
    expect(calls).toEqual(['guard', 'prefetch', 'action'])
    expect(app.container.textContent).toBe('protected')
  })

  it('rejects postcommit form redirects before action execution or route update', async function ({
    expect,
    onTestFinished,
  }) {
    const action = vi.fn()
    const guard = vi.fn()
    const app = setup((route) => {
      route('/submit')
        .guard(guard)
        .prefetch(({ controller }) => controller.redirect('/target/42'))
        .formHandler(action)
        .render(Protected)
      route('/target/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/submit', 'traverse', new FormData())).rejects.toMatchObject({
      name: 'InvalidStateError',
    })
    expect(guard).toHaveBeenCalledOnce()
    expect(action).not.toHaveBeenCalled()
    expect(app.entry.url).toBe('https://example.com/submit')
    expect(app.container.textContent).toBe('protected')
  })

  it('keeps plain pushes free of precommit handlers', async function ({ expect, onTestFinished }) {
    const app = setup((route) => route('/target/:id').render(Destination))
    onTestFinished(app.cleanup)

    const options = await app.navigate('/target/42')

    expect(options.precommitHandler).toBeUndefined()
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('renders login instead of the component whose async prefetch redirects', async function ({
    expect,
    onTestFinished,
  }) {
    /** The protected component must never render for the committed login URL. */
    const app = setup((route) => {
      route('/private')
        .prefetch(async ({ controller }) => {
          await Promise.resolve()
          controller.redirect('/login/guest')
        })
        .render(Protected)
      route('/login/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/private')

    expect(app.entry.url).toBe('https://example.com/login/guest')
    expect(app.container.textContent).toBe('destination:guest:/login/guest')
  })

  it('preserves dispatch-time scroll and focus options across redirects', async function ({
    expect,
    onTestFinished,
  }) {
    /** Native intercept options cannot legally be changed during precommit. */
    const app = setup((route) => {
      route('/private')
        .scroll('manual')
        .focusReset('manual')
        .prefetch(({ controller }) => controller.redirect('/target/42'))
        .render(Protected)
      route('/target/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    const options = await app.navigate('/private')

    expect(options.scroll).toBe('manual')
    expect(options.focusReset).toBe('manual')
    expect(app.container.textContent).toBe('destination:42:/target/42')
  })

  it('renders and prefetches the final route with its params and middleware', async function ({
    expect,
    onTestFinished,
  }) {
    /** Captures destination-specific prefetch context. */
    const prefetch = vi.fn()
    /** Static redirect enters a dynamic target route. */
    const app = setup((route) => {
      route('/old').redirect('/target/42?from=old')
      route('/target/:id').prefetch(prefetch).middleware([Layout]).render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/old')

    expect(app.entry.url).toBe('https://example.com/target/42?from=old')
    expect(app.container.textContent).toBe('destination:42:/target/42')
    expect(app.container.querySelector('section[data-destination]')).not.toBeNull()
    expect(prefetch).toHaveBeenCalledOnce()
    expect(prefetch.mock.calls[0][0].params).toEqual({ id: '42' })
    expect(prefetch.mock.calls[0][0].url.href).toBe(app.entry.url)
  })

  it('runs target auth guards and skips abandoned prefetch callbacks', async function ({
    expect,
    onTestFinished,
  }) {
    /** Would leak protected prefetch work if the guard did not short-circuit. */
    const protectedPrefetch = vi.fn()
    /** Target guard redirects again without creating a new navigate event. */
    const app = setup((route) => {
      route('/old').redirect('/private')
      route('/private')
        .prefetch(({ controller }) => controller.redirect('/login/guest', { history: 'replace' }))
        .prefetch(protectedPrefetch)
        .render(Protected)
      route('/login/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/old')

    expect(app.entry.url).toBe('https://example.com/login/guest')
    expect(app.container.textContent).toBe('destination:guest:/login/guest')
    expect(protectedPrefetch).not.toHaveBeenCalled()
  })

  it('rejects destination guard failures before committing or rendering', async function ({
    expect,
    onTestFinished,
  }) {
    /** Guard error must reach Navigation rather than committing the target. */
    const error = new Error('access denied')
    /** Redirect targets use exactly the normal precommit guard flow. */
    const app = setup((route) => {
      route('/old').redirect('/private')
      route('/private')
        .prefetch(() => {
          throw error
        })
        .render(Destination)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/old')).rejects.toBe(error)
    expect(app.entry.url).toBe('https://example.com/')
    expect(app.container.textContent).toBe('protected')
  })

  it('follows static and dynamic redirect chains', async function ({ expect, onTestFinished }) {
    /** Multiple redirects still share a single destination and commit. */
    const app = setup((route) => {
      route('/old').redirect('/middle/7')
      route('/middle/:id').redirect(({ params }) => `/target/${params.id}`)
      route('/target/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/old')

    expect(app.container.textContent).toBe('destination:7:/target/7')
    expect(app.entry.url).toBe('https://example.com/target/7')
  })

  it('rejects runtime redirect cycles before commit', async function ({ expect, onTestFinished }) {
    /** Callback targets deliberately bypass static registration checks. */
    const app = setup((route) => {
      route('/a').redirect(() => '/b')
      route('/b').redirect(() => '/a')
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/a')).rejects.toThrow('redirect cycle detected')
    expect(app.entry.url).toBe('https://example.com/')
    expect(app.container.textContent).toBe('protected')
  })

  it('rejects same-URL redirects rather than rendering the redirect fallback', async function ({
    expect,
    onTestFinished,
  }) {
    /** A URL equality check alone cannot distinguish this from no redirect. */
    const app = setup((route) => {
      route('/self').redirect(() => '/self')
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/self')).rejects.toThrow('redirect cycle detected')
    expect(app.entry.url).toBe('https://example.com/')
  })

  it('bounds dynamic chains that never repeat a URL', async function ({ expect, onTestFinished }) {
    /** Each redirect generates a distinct URL, requiring a hard hop limit. */
    const app = setup((route) => {
      route('/loop/:id').redirect(({ params }) => `/loop/${Number(params.id) + 1}`)
    })
    onTestFinished(app.cleanup)

    await expect(app.navigate('/loop/0')).rejects.toThrow('redirect limit exceeded')
    expect(app.entry.url).toBe('https://example.com/')
  })

  it('runs inherited guards before a redirect route and abandons its target', async function ({
    expect,
    onTestFinished,
  }) {
    /** A redirect route must not discard its group's authentication guard. */
    const app = setup((route) => {
      const privateRoute = route('/private')
        .prefetch(({ controller }) => controller.redirect('/login/guest'))
        .group()
      privateRoute('/old').redirect('/target/42')
      route('/target/:id').render(Protected)
      route('/login/:id').render(Destination)
    })
    onTestFinished(app.cleanup)

    await app.navigate('/private/old')

    expect(app.container.textContent).toBe('destination:guest:/login/guest')
  })
})

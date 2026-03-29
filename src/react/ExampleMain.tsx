import { lazy, Suspense } from 'react'
import { Router } from './components/Router'
import { createRouter } from './createRouter'
import { Link } from './components/Link'
import Auth from './examples/Auth'

const HelloWorld = lazy(function () {
  return import('./examples/HelloWorld')
})

const Other = lazy(function () {
  return import('./examples/Other')
})

const User = lazy(function () {
  return import('./examples/User')
})

const router = createRouter(function (route) {
  route('/').render(HelloWorld)

  route('/other')
    .prefetch(function (controller) {
      console.log('PREFETCHING ROUTE', controller)

      return new Promise(function (r) {
        setTimeout(r, 2000)
      })
    })
    .scroll('after-transition')
    .render(Other)

  const authed = route().middleware([Auth]).group()

  authed('/user/:id').render(User)
})

/**
 * Example application demonstrating the router with lazy-loaded
 * routes, viewport-based prefetching, transition state indicators,
 * and authentication middleware. Uses the `createRouter` builder
 * API for declarative route definition with middleware groups.
 */
export default function ExampleApp() {
  return (
    <>
      <a href="/">Home</a>

      <Link href="/other" prefetch="viewport" matcher={router}>
        Other
      </Link>

      <a href="/user/123">User</a>

      <Suspense fallback={'loading'}>
        <Router
          matcher={router}
          onNavigateSuccess={function () {
            console.log('navigation succeeded')
          }}
          onNavigateError={function (error: unknown) {
            console.error('navigation failed', error)
          }}
        />
      </Suspense>
    </>
  )
}

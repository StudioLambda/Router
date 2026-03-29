import { describe, it } from 'vitest'
import { createMatcher } from './matcher'

describe('router', function () {
  describe('createRouter', function () {
    it('can create a router', function ({ expect }) {
      expect(() => createMatcher()).not.toThrow()
    })
  })

  describe('register', function () {
    it('can register a route', function ({ expect }) {
      const router = createMatcher<number>()

      expect(function () {
        router.register('/foo/bar', 1)
      }).not.toThrow()
    })
  })

  describe('match', function () {
    it('can match a route', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/foo/bar', 1)

      expect(router.match('/foo/bar')).not.toBeNull()
    })

    it('can match a route ending with slash', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/foo/bar', 1)

      expect(router.match('/foo/bar/')).not.toBeNull()
    })

    it('can match a dynamic route', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/foo/:id', 1)

      expect(router.match('/foo/bar')).not.toBeNull()
    })

    it('can get the matched route handler', function ({ expect }) {
      const router = createMatcher<number>()
      const handler = 1

      router.register('/foo/:id', handler)

      const route = router.match('/foo/bar')

      expect(route?.handler).toBe(handler)
    })

    it('can get the matched route params', function ({ expect }) {
      const router = createMatcher<number>()
      const handler = 1

      router.register('/foo/:id', handler)

      const route = router.match('/foo/bar')

      expect(route?.params).toStrictEqual({ id: 'bar' })
    })

    it('fails to match a non-registered route', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/foo/bar', 1)

      expect(router.match('/foo')).toBeNull()
    })

    it('fails to find root', function ({ expect }) {
      const router = createMatcher<number>()

      expect(router.match('/')).toBeNull()
    })

    it('fails with no path', function ({ expect }) {
      const router = createMatcher<number>()

      expect(router.match('')).toBeNull()
    })

    it('can match a named wildcard route', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/files/*path', 1)

      const route = router.match('/files/docs/readme.md')

      expect(route).not.toBeNull()
      expect(route?.handler).toBe(1)
      expect(route?.params).toStrictEqual({ path: 'docs/readme.md' })
    })

    it('can match a bare wildcard route', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/files/*', 1)

      const route = router.match('/files/anything/here')

      expect(route).not.toBeNull()
      expect(route?.handler).toBe(1)
      expect(route?.params).toStrictEqual({ '*': 'anything/here' })
    })

    it('can match a wildcard with a single segment', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/files/*path', 1)

      const route = router.match('/files/readme.md')

      expect(route).not.toBeNull()
      expect(route?.params).toStrictEqual({ path: 'readme.md' })
    })

    it('prioritises static over wildcard', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/files/*path', 1)
      router.register('/files/exact', 2)

      const route = router.match('/files/exact')

      expect(route?.handler).toBe(2)
    })

    it('prioritises dynamic over wildcard', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/files/*path', 1)
      router.register('/files/:id', 2)

      const route = router.match('/files/something')

      expect(route?.handler).toBe(2)
    })

    it('falls back to wildcard when dynamic does not match deeper', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/files/:id', 2)
      router.register('/files/*path', 1)

      const route = router.match('/files/a/b/c')

      expect(route?.handler).toBe(1)
      expect(route?.params).toStrictEqual({ path: 'a/b/c' })
    })

    it('can match a catch-all root wildcard', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/*', 1)

      const route = router.match('/anything/at/all')

      expect(route).not.toBeNull()
      expect(route?.params).toStrictEqual({ '*': 'anything/at/all' })
    })

    it('can match a wildcard combined with earlier dynamic params', function ({ expect }) {
      const router = createMatcher<number>()

      router.register('/user/:id/files/*path', 1)

      const route = router.match('/user/42/files/docs/readme.md')

      expect(route).not.toBeNull()
      expect(route?.params).toStrictEqual({ id: '42', path: 'docs/readme.md' })
    })
  })
})

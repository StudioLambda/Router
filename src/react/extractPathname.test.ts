import { describe, it } from 'vitest'
import { extractPathname } from './extractPathname'

describe('extractPathname', { concurrent: true }, function () {
  it('returns "/" for null input', function ({ expect }) {
    expect(extractPathname(null)).toBe('/')
  })

  it('returns "/" for undefined input', function ({ expect }) {
    expect(extractPathname(undefined)).toBe('/')
  })

  it('returns "/" for empty string input', function ({ expect }) {
    expect(extractPathname('')).toBe('/')
  })

  it('returns "/" for root path', function ({ expect }) {
    expect(extractPathname('/')).toBe('/')
  })

  it('extracts pathname from a relative path', function ({ expect }) {
    expect(extractPathname('/foo/bar')).toBe('/foo/bar')
  })

  it('extracts pathname from an absolute URL', function ({ expect }) {
    expect(extractPathname('https://example.com/users/42')).toBe('/users/42')
  })

  it('strips query string from the URL', function ({ expect }) {
    expect(extractPathname('/search?q=hello')).toBe('/search')
  })

  it('strips hash fragment from the URL', function ({ expect }) {
    expect(extractPathname('/docs#section')).toBe('/docs')
  })

  it('strips both query string and hash', function ({ expect }) {
    expect(extractPathname('/page?id=1#top')).toBe('/page')
  })

  it('handles absolute URL with query and hash', function ({ expect }) {
    expect(extractPathname('https://example.com/a/b?x=1#y')).toBe('/a/b')
  })

  it('preserves trailing slash on pathname', function ({ expect }) {
    expect(extractPathname('/trailing/')).toBe('/trailing/')
  })
})

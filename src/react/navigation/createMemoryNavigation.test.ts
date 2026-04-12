import { describe, it } from 'vitest'
import { createMemoryNavigation } from './createMemoryNavigation'

describe('createMemoryNavigation', { concurrent: true }, function () {
  it('returns a navigation with currentEntry.url set to the initial URL', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/hello' })

    expect(nav.currentEntry?.url).toBe('https://example.com/hello')
  })

  it('canGoBack is false', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })

    expect(nav.canGoBack).toBe(false)
  })

  it('canGoForward is false', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })

    expect(nav.canGoForward).toBe(false)
  })

  it('transition is null', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })

    expect(nav.transition).toBeNull()
  })

  it('entries returns a single-entry array', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/page' })
    const result = nav.entries()

    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com/page')
  })

  it('addEventListener does not throw', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })

    expect(function () {
      nav.addEventListener('navigate', function () {})
    }).not.toThrow()
  })

  it('removeEventListener does not throw', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })

    expect(function () {
      nav.removeEventListener('navigate', function () {})
    }).not.toThrow()
  })

  it('navigate returns a result with pre-resolved committed promise', async function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })
    const result = nav.navigate('/other')
    const committed = await result.committed

    expect(committed?.url).toBe('https://example.com/')
  })

  it('navigate returns a result with pre-resolved finished promise', async function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })
    const result = nav.navigate('/other')
    const finished = await result.finished

    expect(finished?.url).toBe('https://example.com/')
  })

  it('back returns a result with pre-resolved promises', async function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })
    const result = nav.back()
    const committed = await result.committed

    expect(committed?.url).toBe('https://example.com/')
  })

  it('forward returns a result with pre-resolved promises', async function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })
    const result = nav.forward()
    const finished = await result.finished

    expect(finished?.url).toBe('https://example.com/')
  })

  it('traverseTo returns a result with pre-resolved promises', async function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })
    const result = nav.traverseTo('some-key')
    const committed = await result.committed

    expect(committed?.url).toBe('https://example.com/')
  })

  it('updateCurrentEntry does not throw', function ({ expect }) {
    const nav = createMemoryNavigation({ url: 'https://example.com/' })

    expect(function () {
      nav.updateCurrentEntry({ state: { foo: 'bar' } })
    }).not.toThrow()
  })
})

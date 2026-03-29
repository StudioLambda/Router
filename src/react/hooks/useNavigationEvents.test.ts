import { describe, it, vi } from 'vitest'
import { renderHook } from 'router/react:test-helpers'
import { useNavigationEvents } from './useNavigationEvents'

/**
 * Creates a mock Navigation object backed by a real EventTarget
 * so that `addEventListener`, `removeEventListener`, and
 * `dispatchEvent` all work natively. This lets us test that
 * `useNavigationEvents` subscribes to and unsubscribes from the
 * correct events without stubbing the event wiring itself.
 */
function createMockNavigation(): Navigation & EventTarget {
  const target = new EventTarget()

  return Object.assign(target, {
    currentEntry: { url: 'https://example.com/' } as NavigationHistoryEntry,
    canGoBack: false,
    canGoForward: false,
    transition: null,
    navigate: vi.fn(),
    entries: vi.fn(function () { return [] }),
    back: vi.fn(),
    forward: vi.fn(),
    traverseTo: vi.fn(),
    updateCurrentEntry: vi.fn(),
    activation: null,
  }) as unknown as Navigation & EventTarget
}

describe('useNavigationEvents', { concurrent: true }, function () {
  it('subscribes to navigate events and forwards them to the handler', function ({ expect, onTestFinished }) {
    const navigation = createMockNavigation()
    const onNavigate = vi.fn()

    const { unmount } = renderHook(function () {
      useNavigationEvents(navigation, { onNavigate })
    })

    onTestFinished(unmount)

    const event = new Event('navigate')

    navigation.dispatchEvent(event)

    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith(event)
  })

  it('subscribes to navigatesuccess events', function ({ expect, onTestFinished }) {
    const navigation = createMockNavigation()
    const onNavigateSuccess = vi.fn()

    const { unmount } = renderHook(function () {
      useNavigationEvents(navigation, { onNavigateSuccess })
    })

    onTestFinished(unmount)

    navigation.dispatchEvent(new Event('navigatesuccess'))

    expect(onNavigateSuccess).toHaveBeenCalledTimes(1)
  })

  it('subscribes to navigateerror events and extracts the error', function ({ expect, onTestFinished }) {
    const navigation = createMockNavigation()
    const onNavigateError = vi.fn()

    const { unmount } = renderHook(function () {
      useNavigationEvents(navigation, { onNavigateError })
    })

    onTestFinished(unmount)

    const errorEvent = new ErrorEvent('navigateerror', {
      error: new Error('navigation failed'),
    })

    navigation.dispatchEvent(errorEvent)

    expect(onNavigateError).toHaveBeenCalledTimes(1)
    expect(onNavigateError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect((onNavigateError.mock.calls[0][0] as Error).message).toBe('navigation failed')
  })

  it('does not throw when handlers are omitted', function ({ expect, onTestFinished }) {
    const navigation = createMockNavigation()

    const { unmount } = renderHook(function () {
      useNavigationEvents(navigation, {})
    })

    onTestFinished(unmount)

    expect(function () {
      navigation.dispatchEvent(new Event('navigate'))
      navigation.dispatchEvent(new Event('navigatesuccess'))
      navigation.dispatchEvent(new Event('navigateerror'))
    }).not.toThrow()
  })

  it('removes listeners on unmount', function ({ expect }) {
    const navigation = createMockNavigation()
    const onNavigate = vi.fn()
    const onNavigateSuccess = vi.fn()

    const { unmount } = renderHook(function () {
      useNavigationEvents(navigation, { onNavigate, onNavigateSuccess })
    })

    unmount()

    navigation.dispatchEvent(new Event('navigate'))
    navigation.dispatchEvent(new Event('navigatesuccess'))

    expect(onNavigate).not.toHaveBeenCalled()
    expect(onNavigateSuccess).not.toHaveBeenCalled()
  })
})

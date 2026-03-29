import { createContext } from 'react'

/**
 * Provides the AbortSignal from the current NavigateEvent.
 * Consumers can use this to cancel in-flight async operations
 * (fetches, transitions, etc.) when a navigation is superseded
 * by another one.
 */
export const NavigationSignalContext = createContext<AbortSignal | null>(null)

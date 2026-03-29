import { type PropsWithChildren, use } from 'react'

let cp: Promise<void> | undefined = undefined

/**
 * Creates a shared promise that simulates an authentication
 * check with a 1.5-second delay. Caches the promise so
 * subsequent calls reuse the same instance.
 *
 * @returns A promise that resolves after the simulated delay.
 */
function p() {
  cp ??= new Promise((r) => setTimeout(r, 1500))

  return cp
}

/**
 * Example authentication middleware component that suspends
 * while verifying credentials. Uses React's `use()` hook to
 * suspend rendering until the auth promise resolves, causing
 * the nearest Suspense boundary to show its fallback.
 *
 * In a real application, this would check session tokens or
 * call an authentication API.
 */
export default function Auth({ children }: PropsWithChildren) {
  use(p())

  return children
}

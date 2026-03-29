import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import ExampleApp from './ExampleMain'

const container = document.getElementById('root')

if (!container) {
  throw new Error('unable to find container')
}

/**
 * Mounts the example application into the DOM. Wraps the app
 * in StrictMode for development checks and double-rendering
 * detection.
 */
createRoot(container).render(
  <StrictMode>
    <ExampleApp />
  </StrictMode>
)

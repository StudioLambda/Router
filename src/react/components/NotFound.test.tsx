import { describe, it } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { NotFound } from './NotFound'

describe('NotFound', { concurrent: true }, function () {
  it('renders "Not Found" text', function ({ expect, onTestFinished }) {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const root = createRoot(container)

    onTestFinished(function () {
      act(function () {
        root.unmount()
      })

      container.remove()
    })

    act(function () {
      root.render(createElement(NotFound))
    })

    expect(container.textContent).toBe('Not Found')
  })
})

import { describe, expect, it, afterEach } from 'vitest'
import * as ReactDOM from 'react-dom'
import { Simulate } from 'react-dom/test-utils'
import { createElement } from 'react'

// React 18 pattern: `react-dom/test-utils` exports several helpers beyond `act`
// (Simulate, renderIntoDocument, and others) for simulating DOM events directly.
// React 19 removes everything from `react-dom/test-utils` except `act` — `Simulate`
// has no direct replacement; tests using it migrate to
// `@testing-library/user-event` (already a devDependency here) firing real DOM
// events instead of React's synthetic-event simulation harness.
//
// `Simulate` is also only reliable against a tree mounted via the classic
// `ReactDOM.render` — its internal fiber lookup doesn't resolve correctly
// against a `createRoot` tree, which is authentic to how these tests actually
// looked pre-React-18-adoption. That makes this fixture double up on removed
// APIs (`ReactDOM.render` + `Simulate`) — both tracked here since real legacy
// test suites paired them the same way; `mountReleaseBanner.tsx` remains the
// primary dedicated fixture for `ReactDOM.render`/`unmountComponentAtNode` in
// application (non-test) code.
//
// This is a separate breaking change from the `act` import path change already
// covered by `SearchBox.test.tsx` — kept in its own file so each removed export
// is independently attributable.

let container: HTMLDivElement | null = null

afterEach(() => {
  if (container) {
    ReactDOM.unmountComponentAtNode(container)
    container.remove()
    container = null
  }
})

describe('legacy react-dom/test-utils Simulate usage', () => {
  it('simulates a click via the removed Simulate helper', () => {
    container = document.createElement('div')
    document.body.appendChild(container)

    let clicks = 0
    ReactDOM.render(createElement('button', { onClick: () => clicks++ }, 'Click me'), container)

    const button = container.querySelector('button')!
    Simulate.click(button)

    expect(clicks).toBe(1)
  })
})

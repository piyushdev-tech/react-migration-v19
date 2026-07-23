import { describe, expect, it } from 'vitest'
import { createRenderer } from 'react-test-renderer/shallow'

function Greeting({ name }: { name: string }) {
  return (
    <div className="border rounded p-2">
      <span>Hello, {name}!</span>
    </div>
  )
}

// React 18 pattern: shallow-rendering via `react-test-renderer/shallow`. React 19's
// `react-test-renderer` (already deprecated wholesale in favor of React Testing
// Library — see `references/breaking-changes.md`'s "Deprecated" section) drops the
// `/shallow` subpath specifically; shallow rendering moves to installing the
// `react-shallow-renderer` package directly as its own dependency (same API,
// react-test-renderer@18.3.0 already depends on it internally — that's what this
// subpath re-exports).
//
// No automated codemod: this is a devDependency swap (add react-shallow-renderer,
// remove the react-test-renderer/shallow import) rather than a source-level
// rewrite codemods target.
describe('legacy react-test-renderer/shallow usage', () => {
  it('shallow-renders without mounting children', () => {
    const renderer = createRenderer()
    renderer.render(<Greeting name="World" />)
    const output = renderer.getRenderOutput()

    expect(output.type).toBe('div')
    expect(output.props.className).toBe('border rounded p-2')
  })
})

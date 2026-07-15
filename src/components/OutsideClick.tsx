import { Component, createRef } from 'react'
import { findDOMNode } from 'react-dom'

interface OutsideClickProps {
  label: string
}

// React 18 pattern: a class component that reaches for its own DOM node with
// `findDOMNode`. React 19 removes `findDOMNode` entirely (it throws at runtime) —
// SKILL.md Phase 3 greps for it and Phase 6 replaces it with a ref on the
// element you actually need to measure (the `wrapperRef` below is what you'd
// migrate to).
export class OutsideClick extends Component<OutsideClickProps> {
  private wrapperRef = createRef<HTMLDivElement>()

  componentDidMount() {
    const node = findDOMNode(this)
    if (node instanceof HTMLElement) {
      node.setAttribute('data-measured-width', String(node.offsetWidth))
    }
  }

  render() {
    return (
      <div ref={this.wrapperRef} className="border rounded p-2" data-testid="outside-click">
        {this.props.label}
      </div>
    )
  }
}

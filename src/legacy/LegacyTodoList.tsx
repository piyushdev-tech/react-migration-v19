// @ts-nocheck
/*
 * Legacy React patterns, kept as a migration demo (unwired on purpose so it can
 * never break the build or the Phase 0 baseline; SKILL.md's grep sweep + codemods
 * still rewrite it):
 *   - String refs (`ref="list"`, `this.refs.list`) — removed in React 19; migrate
 *     to `useRef` / callback refs (codemod: react-19-replace-string-ref).
 *   - `propTypes` on a function component — silently ignored in React 19; move to
 *     TypeScript (part of react-19-migration-recipe).
 *   - `defaultProps` on a function component — ignored in React 19; use ES6
 *     default parameters (codemod: react-19-replace-default-props).
 */
import { Component } from 'react'
import PropTypes from 'prop-types'

export class LegacyTodoList extends Component {
  focusFirst() {
    // String-ref access, removed in React 19.
    this.refs.list.querySelector('li')?.focus()
  }

  render() {
    return (
      <ul ref="list" className="list-group">
        {this.props.items.map((item) => (
          <li key={item} className="list-group-item" tabIndex={0}>
            {item}
          </li>
        ))}
      </ul>
    )
  }
}

export function LegacyTodoCount({ count }) {
  return <span className="badge bg-secondary">{count} items</span>
}

LegacyTodoCount.defaultProps = {
  count: 0,
}

LegacyTodoCount.propTypes = {
  count: PropTypes.number,
}

// @ts-nocheck
/*
 * Legacy React Context API, kept as a migration demo.
 *
 * This uses the pre-16.3 `getChildContext` / `childContextTypes` / `contextTypes`
 * system, which React 19 removes entirely. SKILL.md Phase 3 greps for
 * `contextTypes|getChildContext` and Phase 6 migrates it to `createContext` +
 * `useContext` (or a `<Context>` provider).
 *
 * It is intentionally NOT imported anywhere, so it never affects the build or the
 * Phase 0 baseline — but it is still real source under `src/`, so the grep sweep
 * and codemods still find and rewrite it. `@ts-nocheck` mirrors how untyped
 * legacy code usually looks in a codebase mid-migration.
 */
import { Component } from 'react'
import PropTypes from 'prop-types'

export class LegacyThemeProvider extends Component {
  getChildContext() {
    return { theme: 'dark' }
  }

  render() {
    return this.props.children
  }
}

LegacyThemeProvider.childContextTypes = {
  theme: PropTypes.string,
}

export class LegacyThemeLabel extends Component {
  render() {
    return <span className={`theme-${this.context.theme}`}>Theme: {this.context.theme}</span>
  }
}

LegacyThemeLabel.contextTypes = {
  theme: PropTypes.string,
}

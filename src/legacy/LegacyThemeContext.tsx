/*
 * Legacy React Context API, migrated off `getChildContext` /
 * `childContextTypes` / `contextTypes` (removed entirely in React 19) onto
 * `createContext` + `static contextType`.
 *
 * It is intentionally NOT imported anywhere, so it never affects the build or
 * the Phase 0 baseline — but it is still real source under `src/`, so the
 * grep sweep and codemods still find it.
 */
import { Component, createContext, type ContextType, type ReactNode } from 'react'

interface ThemeContextValue {
  theme: string
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark' })

interface LegacyThemeProviderProps {
  children: ReactNode
}

export class LegacyThemeProvider extends Component<LegacyThemeProviderProps> {
  render() {
    return <ThemeContext.Provider value={{ theme: 'dark' }}>{this.props.children}</ThemeContext.Provider>
  }
}

export class LegacyThemeLabel extends Component {
  static contextType = ThemeContext
  declare context: ContextType<typeof ThemeContext>

  render() {
    return <span className={`theme-${this.context.theme}`}>Theme: {this.context.theme}</span>
  }
}

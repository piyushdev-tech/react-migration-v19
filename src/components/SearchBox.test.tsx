import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
// React 18 pattern: importing `act` from `react-dom/test-utils`. React 19 removes
// that module — the `react-19-replace-act-import` codemod (SKILL.md Phase 2)
// rewrites this to `import { act } from 'react'`.
import { act } from 'react-dom/test-utils'
import { SearchBox } from './SearchBox'

describe('SearchBox', () => {
  it('renders the search field and its initial meta line', () => {
    act(() => {
      render(<SearchBox />)
    })
    expect(screen.getByTestId('search-box')).toBeInTheDocument()
    expect(screen.getByTestId('search-meta')).toHaveTextContent('Query: (empty)')
  })
})

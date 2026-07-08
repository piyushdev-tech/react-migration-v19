import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppNavBar } from './NavBar'

describe('AppNavBar', () => {
  it('renders navigation links', () => {
    render(
      <MemoryRouter>
        <AppNavBar />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreateFactoryWidget } from './CreateFactoryWidget'

describe('CreateFactoryWidget', () => {
  it('renders the label via the createFactory-produced element', () => {
    render(<CreateFactoryWidget label="factory-made" />)
    expect(screen.getByTestId('factory-badge')).toHaveTextContent('factory-made')
  })
})

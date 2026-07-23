import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReducerDemo } from './ReducerDemo'

describe('ReducerDemo', () => {
  it('increments via the legacy-typed reducer and tracks increments via the mutable ref', async () => {
    const user = userEvent.setup()
    render(<ReducerDemo />)

    expect(screen.getByTestId('reducer-count')).toHaveTextContent('Count: 0')

    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '+' }))

    expect(screen.getByTestId('reducer-count')).toHaveTextContent('Count: 2')
    expect(screen.getByTestId('reducer-increments')).toHaveTextContent('increments so far: 2')

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('reducer-count')).toHaveTextContent('Count: 0')
  })
})

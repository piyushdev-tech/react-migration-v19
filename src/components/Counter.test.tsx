import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from '../components/Counter'
import { useCounterStore } from '../store/counterStore'

afterEach(() => {
  useCounterStore.setState({ count: 0 })
})

describe('Counter', () => {
  it('renders the initial count from the zustand store', () => {
    render(<Counter />)
    expect(screen.getByTestId('count-value')).toHaveTextContent('Count: 0')
  })

  it('increments and decrements via store actions', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '+' }))
    expect(screen.getByTestId('count-value')).toHaveTextContent('Count: 2')

    await user.click(screen.getByRole('button', { name: '-' }))
    expect(screen.getByTestId('count-value')).toHaveTextContent('Count: 1')

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('count-value')).toHaveTextContent('Count: 0')
  })
})

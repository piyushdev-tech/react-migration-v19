import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrdersPanel } from './OrdersPanel'

describe('OrdersPanel', () => {
  it('renders the grid and adds a new order via the Add/Save form', async () => {
    const user = userEvent.setup()
    render(<OrdersPanel />)

    expect(screen.getByTestId('orders-grid')).toBeInTheDocument()

    await user.click(screen.getByTestId('orders-add-button'))
    await user.type(screen.getByTestId('order-customer-input'), 'Initech')
    await user.type(screen.getByTestId('order-amount-input'), '75')
    await user.click(screen.getByTestId('orders-save-button'))

    await waitFor(() => {
      expect(screen.getByText('Initech')).toBeInTheDocument()
    })
  })

  it('closes the form when clicking outside it', async () => {
    const user = userEvent.setup()
    render(<OrdersPanel />)

    await user.click(screen.getByTestId('orders-add-button'))
    expect(screen.getByTestId('order-form-panel')).toBeInTheDocument()

    await user.click(document.body)

    await waitFor(() => {
      expect(screen.queryByTestId('order-form-panel')).not.toBeInTheDocument()
    })
  })
})

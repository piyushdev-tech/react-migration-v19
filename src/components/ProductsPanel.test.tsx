import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductsPanel } from './ProductsPanel'

describe('ProductsPanel', () => {
  it('renders the grid and adds a new product via the Add/Save form', async () => {
    const user = userEvent.setup()
    render(<ProductsPanel />)

    expect(screen.getByTestId('products-grid')).toBeInTheDocument()

    await user.click(screen.getByTestId('products-add-button'))
    await user.type(screen.getByTestId('product-name-input'), 'USB-C Hub')
    await user.type(screen.getByTestId('product-price-input'), '39.99')
    await user.type(screen.getByTestId('product-category-input'), 'Accessories')
    await user.click(screen.getByTestId('products-save-button'))

    await waitFor(() => {
      expect(screen.getByText('USB-C Hub')).toBeInTheDocument()
    })
  })
})

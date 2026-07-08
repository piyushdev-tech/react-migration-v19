import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodosGrid } from './TodosGrid'

function renderWithQueryClient(ui: React.ReactElement<any>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('TodosGrid', () => {
  it('shows a loading state, then renders the grid once data resolves', async () => {
    renderWithQueryClient(<TodosGrid />)

    expect(screen.getByText(/loading todos/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('todos-grid')).toBeInTheDocument()
    })
  })
})

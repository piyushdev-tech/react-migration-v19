import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionStatusPanel } from './ConnectionStatusPanel'

describe('ConnectionStatusPanel', () => {
  it('starts connected', () => {
    render(<ConnectionStatusPanel />)

    expect(screen.getByTestId('connection-badge')).toHaveTextContent('Connected')
  })

  it('stays paired (disconnect then reconnect logs both) across a toggle', async () => {
    const user = userEvent.setup()
    render(<ConnectionStatusPanel />)

    await user.click(screen.getByTestId('connection-toggle'))
    expect(screen.getByTestId('connection-badge')).toHaveTextContent('Disconnected')

    await user.click(screen.getByTestId('connection-toggle'))
    expect(screen.getByTestId('connection-badge')).toHaveTextContent('Connected')

    await waitFor(() => {
      const entries = within(screen.getByTestId('connection-log'))
        .getAllByRole('listitem')
        .map((item) => item.textContent)
      expect(entries).toEqual(['connected', 'disconnected', 'connected'])
    })
  })
})

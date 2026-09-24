import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobsPanel } from './JobsPanel'

describe('JobsPanel', () => {
  it('renders the job list', () => {
    render(<JobsPanel />)

    expect(screen.getByTestId('jobs-list')).toBeInTheDocument()
    expect(screen.getByTestId('job-row-1')).toHaveTextContent('Nightly inventory sync')
    expect(screen.getByTestId('job-row-2')).toHaveTextContent('Payroll export')
  })

  it('catches a row render error and logs it exactly once', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<JobsPanel />)

    await user.click(screen.getByTestId('jobs-break-button'))

    expect(await screen.findByTestId('job-row-error')).toBeInTheDocument()
    expect(screen.queryByTestId('job-row-1')).not.toBeInTheDocument()

    const appLogCalls = consoleErrorSpy.mock.calls.filter(
      ([first]) => typeof first === 'string' && first.startsWith('[JobsPanel]'),
    )
    expect(appLogCalls).toHaveLength(1)

    consoleErrorSpy.mockRestore()
  })
})

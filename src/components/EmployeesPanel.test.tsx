import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmployeesPanel } from './EmployeesPanel'

describe('EmployeesPanel', () => {
  it('renders the grid and adds a new employee via the portal-based Add/Save form', async () => {
    const user = userEvent.setup()
    render(<EmployeesPanel />)

    expect(screen.getByTestId('employees-grid')).toBeInTheDocument()

    await user.click(screen.getByTestId('employees-add-button'))
    const form = await screen.findByTestId('employee-form-panel')
    await user.type(screen.getByTestId('employee-name-input'), 'Priya Nair')
    await user.type(screen.getByTestId('employee-department-input'), 'Support')
    await user.type(screen.getByTestId('employee-email-input'), 'priya@example.com')
    await user.click(screen.getByTestId('employees-save-button'))

    await waitFor(() => {
      expect(screen.getByText('Priya Nair')).toBeInTheDocument()
    })
    expect(form).not.toBeInTheDocument()
  })

  it('prefills the form from the last employee when duplicating', async () => {
    const user = userEvent.setup()
    render(<EmployeesPanel />)

    await user.click(screen.getByTestId('employees-duplicate-button'))
    await screen.findByTestId('employee-form-panel')

    expect(screen.getByTestId('employee-name-input')).toHaveValue('Sam Ortiz')
    expect(screen.getByTestId('employee-department-input')).toHaveValue('Design')
  })
})

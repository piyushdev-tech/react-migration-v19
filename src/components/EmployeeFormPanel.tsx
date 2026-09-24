import { Component } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'

export interface Employee {
  id: number
  name: string
  department: string
  email: string
}

interface EmployeeFormPanelProps {
  duplicateFrom: Employee | null
  onSave: (employee: Omit<Employee, 'id'>) => void
  onCancel: () => void
}

interface EmployeeFormPanelState {
  name: string
  department: string
  email: string
}

// React 16 pattern: syncing internal form state to a prop that changes while
// the form stays mounted — here, "Duplicate last" (EmployeesPanel.tsx) swaps
// `duplicateFrom` without unmounting/remounting the form — via
// `UNSAFE_componentWillReceiveProps`. This still works unchanged in React 17;
// it isn't removed by this hop, and its warning verbosity doesn't change here
// either — flagging it now is about paying down tech debt before a later
// major (18's StrictMode) makes it noisier, not because 17 breaks it. See
// references/breaking-changes.md's `## React 16 → React 17` section.
export class EmployeeFormPanel extends Component<EmployeeFormPanelProps, EmployeeFormPanelState> {
  state: EmployeeFormPanelState = {
    name: this.props.duplicateFrom?.name ?? '',
    department: this.props.duplicateFrom?.department ?? '',
    email: this.props.duplicateFrom?.email ?? '',
  }

  UNSAFE_componentWillReceiveProps(nextProps: EmployeeFormPanelProps) {
    if (nextProps.duplicateFrom && nextProps.duplicateFrom !== this.props.duplicateFrom) {
      this.setState({
        name: nextProps.duplicateFrom.name,
        department: nextProps.duplicateFrom.department,
        email: nextProps.duplicateFrom.email,
      })
    }
  }

  render() {
    const { name, department, email } = this.state
    return (
      <div className="border rounded p-3 bg-white shadow" style={{ width: 360 }} data-testid="employee-form-panel">
        <h3 className="h6">Add employee</h3>
        <Form.Group className="mb-2">
          <Form.Label>Name</Form.Label>
          <Form.Control
            value={name}
            onChange={(event) => this.setState({ name: event.target.value })}
            data-testid="employee-name-input"
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>Department</Form.Label>
          <Form.Control
            value={department}
            onChange={(event) => this.setState({ department: event.target.value })}
            data-testid="employee-department-input"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            value={email}
            onChange={(event) => this.setState({ email: event.target.value })}
            data-testid="employee-email-input"
          />
        </Form.Group>
        <div className="d-flex justify-content-end gap-2">
          <Button variant="outline-secondary" onClick={this.props.onCancel}>
            Cancel
          </Button>
          <Button onClick={() => this.props.onSave({ name, department, email })} data-testid="employees-save-button">
            Save
          </Button>
        </div>
      </div>
    )
  }
}

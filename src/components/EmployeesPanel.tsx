import { useEffect, useRef, useState, type ReactNode, type ReactPortal } from 'react'
import * as ReactDOM from 'react-dom'
import Button from 'react-bootstrap/Button'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community'
import { EmployeeFormPanel, type Employee } from './EmployeeFormPanel'

ModuleRegistry.registerModules([AllCommunityModule])

// `unstable_createPortal` was never part of the official type definitions
// (it's undocumented/internal) — this augmentation only exists so this
// fixture can call the real runtime export under TypeScript.
declare module 'react-dom' {
  export function unstable_createPortal(children: ReactNode, container: Element): ReactPortal
}

const initialEmployees: Employee[] = [
  { id: 1, name: 'Dana Whit', department: 'Engineering', email: 'dana@example.com' },
  { id: 2, name: 'Sam Ortiz', department: 'Design', email: 'sam@example.com' },
]

// React 16 pattern: `ReactDOM.unstable_createPortal` — an internal API that
// predates the stable `createPortal` export (stable since React 16.0). React 17
// removes `unstable_createPortal` entirely; the fix is a drop-in rename to
// `createPortal`. See references/breaking-changes.md's
// `## React 16 → React 17` section.
export function EmployeesPanel() {
  const [employees, setEmployees] = useState(initialEmployees)
  const [showForm, setShowForm] = useState(false)
  const [duplicateFrom, setDuplicateFrom] = useState<Employee | null>(null)
  const portalNodeRef = useRef<HTMLDivElement | null>(null)
  if (!portalNodeRef.current) {
    portalNodeRef.current = document.createElement('div')
  }

  useEffect(() => {
    const node = portalNodeRef.current!
    document.body.appendChild(node)
    return () => {
      document.body.removeChild(node)
    }
  }, [])

  const columnDefs: ColDef<Employee>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'department', headerName: 'Department', width: 160 },
    { field: 'email', headerName: 'Email', flex: 1 },
  ]

  function handleSave(employee: Omit<Employee, 'id'>) {
    const nextId = employees.reduce((max, e) => Math.max(max, e.id), 0) + 1
    setEmployees((prev) => [...prev, { id: nextId, ...employee }])
    setShowForm(false)
    setDuplicateFrom(null)
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Employees</h2>
        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={employees.length === 0}
            onClick={() => {
              setDuplicateFrom(employees[employees.length - 1])
              setShowForm(true)
            }}
            data-testid="employees-duplicate-button"
          >
            Duplicate last
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDuplicateFrom(null)
              setShowForm(true)
            }}
            data-testid="employees-add-button"
          >
            Add employee
          </Button>
        </div>
      </div>
      <div style={{ height: 240, width: '100%' }} data-testid="employees-grid">
        <AgGridReact<Employee> theme={themeQuartz} rowData={employees} columnDefs={columnDefs} />
      </div>

      {showForm &&
        portalNodeRef.current &&
        ReactDOM.unstable_createPortal(
          <div className="position-fixed top-50 start-50 translate-middle" style={{ zIndex: 1050 }}>
            <EmployeeFormPanel duplicateFrom={duplicateFrom} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>,
          portalNodeRef.current,
        )}
    </div>
  )
}

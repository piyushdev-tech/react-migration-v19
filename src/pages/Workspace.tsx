import Container from 'react-bootstrap/Container'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'
import { ProductsPanel } from '../components/ProductsPanel'
import { EmployeesPanel } from '../components/EmployeesPanel'
import { OrdersPanel } from '../components/OrdersPanel'
import { JobsPanel } from '../components/JobsPanel'
import { ConnectionStatusPanel } from '../components/ConnectionStatusPanel'

// Each tab below deliberately exercises a different React 16 → React 17
// breaking-change signal:
//   - Products: event pooling (`event.persist()`) — ProductsPanel.tsx
//   - Employees: `unstable_createPortal` — EmployeesPanel.tsx
//               (plus `UNSAFE_componentWillReceiveProps` — EmployeeFormPanel.tsx)
//   - Orders: `onScroll` no longer bubbling, and event delegation moving from
//             `document` to the root container — OrdersPanel.tsx
//   - Jobs: an Error Boundary's console-logging behavior — JobsPanel.tsx
//   - Connection: effect cleanup timing (sync → async) — ConnectionStatusPanel.tsx
// See the comments in each of those files and references/breaking-changes.md's
// `## React 16 → React 17` section. A future 16→17 migration run should leave
// every tab's interactive behavior identical — grid/list updates with the new
// entry, ids increment the same way, field values carry over unchanged
// (IMPLEMENT.md Phase 8's business-logic freeze applies to this business logic
// exactly like anywhere else).
export function Workspace() {
  return (
    <Container>
      <h1>Workspace</h1>
      <p className="text-muted">
        Five tabs wired with real, working React 16 patterns to test when this
        repo migrates to React 17.
      </p>
      <Tabs defaultActiveKey="products" id="workspace-tabs" className="mb-3">
        <Tab eventKey="products" title="Products">
          <ProductsPanel />
        </Tab>
        <Tab eventKey="employees" title="Employees">
          <EmployeesPanel />
        </Tab>
        <Tab eventKey="orders" title="Orders">
          <OrdersPanel />
        </Tab>
        <Tab eventKey="jobs" title="Jobs">
          <JobsPanel />
        </Tab>
        <Tab eventKey="connection" title="Connection">
          <ConnectionStatusPanel />
        </Tab>
      </Tabs>
    </Container>
  )
}

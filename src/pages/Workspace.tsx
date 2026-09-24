import Container from 'react-bootstrap/Container'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'
import { ProductsPanel } from '../components/ProductsPanel'
import { EmployeesPanel } from '../components/EmployeesPanel'
import { OrdersPanel } from '../components/OrdersPanel'

// Each tab below deliberately exercises a different React 16 → React 17
// breaking-change signal (event pooling, `unstable_createPortal`,
// `UNSAFE_componentWillReceiveProps`, `onScroll` bubbling, and a native
// `document`-level listener) — see the comments in ProductsPanel.tsx,
// EmployeesPanel.tsx/EmployeeFormPanel.tsx, and OrdersPanel.tsx, and
// references/breaking-changes.md's `## React 16 → React 17` section. A future
// 16→17 migration run should leave the Add/Save flow on every tab behaving
// identically — grid updates with the new entry, ids increment the same way,
// field values carry over unchanged (IMPLEMENT.md Phase 8's business-logic
// freeze applies to this business logic exactly like anywhere else).
export function Workspace() {
  return (
    <Container>
      <h1>Workspace</h1>
      <p className="text-muted">
        Three grid-backed tabs (ag-grid + an Add/Save form each) wired with real,
        working React 16 patterns to test when this repo migrates to React 17.
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
      </Tabs>
    </Container>
  )
}

import { useEffect, useRef, useState } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

interface Order {
  id: number
  customer: string
  amount: number
  status: string
}

const initialOrders: Order[] = [
  { id: 1, customer: 'Acme Co', amount: 420, status: 'Pending' },
  { id: 2, customer: 'Globex', amount: 1150, status: 'Shipped' },
]

const activityLog = [
  'Order #1 created',
  'Payment received for #1',
  'Order #2 created',
  'Order #2 shipped',
  'Invoice sent for #1',
  'Invoice sent for #2',
  'Refund requested for #1',
  'Refund processed for #1',
  'Customer follow-up sent',
  'Order #2 delivered',
]

export function OrdersPanel() {
  const [orders, setOrders] = useState(initialOrders)
  const [showForm, setShowForm] = useState(false)
  const [customer, setCustomer] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('Pending')
  const [syncing, setSyncing] = useState(false)
  const formRef = useRef<HTMLDivElement | null>(null)

  // React 16 pattern: a native `document`-level "click outside to close"
  // listener, registered manually rather than via a library. React 16 attaches
  // its own synthetic-event listeners at the `document` level; React 17 moves
  // that attachment point to the app's root DOM container instead. That doesn't
  // break this listener outright, but it changes where React's own dispatch
  // sits relative to listeners like this one — re-verify outside-click/overlay
  // behavior here after the version bump rather than assuming it's unaffected.
  // See references/breaking-changes.md's `## React 16 → React 17` section.
  useEffect(() => {
    if (!showForm) return
    function handleDocumentClick(event: Event) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowForm(false)
      }
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [showForm])

  function openForm() {
    setCustomer('')
    setAmount('')
    setStatus('Pending')
    setShowForm(true)
  }

  function handleSave() {
    const nextId = orders.reduce((max, o) => Math.max(max, o.id), 0) + 1
    setOrders((prev) => [...prev, { id: nextId, customer, amount: Number(amount) || 0, status }])
    setShowForm(false)
  }

  const columnDefs: ColDef<Order>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'customer', headerName: 'Customer', flex: 1 },
    { field: 'amount', headerName: 'Amount', width: 120, valueFormatter: (p) => `$${p.value.toFixed(2)}` },
    { field: 'status', headerName: 'Status', width: 140 },
  ]

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Orders</h2>
        <Button size="sm" onClick={openForm} data-testid="orders-add-button">
          Add order
        </Button>
      </div>
      <div className="d-flex gap-3">
        <div style={{ height: 240, flex: 1 }} data-testid="orders-grid">
          <AgGridReact<Order> theme={themeQuartz} rowData={orders} columnDefs={columnDefs} />
        </div>
        {/* React 16 pattern: React makes `onScroll` bubble synthetically, so a
            handler on this outer (non-scrolling) wrapper fires when the *inner*
            list scrolls, even though native `scroll` events never bubble.
            React 17 changes `onScroll` to match native (non-bubbling) behavior
            — this outer handler stops firing for the inner list's scroll once
            migrated. See references/breaking-changes.md's
            `## React 16 → React 17` section. */}
        <div
          className="border rounded p-2"
          style={{ width: 200 }}
          data-testid="orders-activity-wrapper"
          onScroll={() => {
            setSyncing(true)
            window.setTimeout(() => setSyncing(false), 400)
          }}
        >
          <div className="d-flex justify-content-between">
            <strong className="small">Recent activity</strong>
            {syncing && (
              <small className="text-muted" data-testid="orders-syncing-indicator">
                syncing…
              </small>
            )}
          </div>
          <div style={{ maxHeight: 140, overflowY: 'auto' }} data-testid="orders-activity-list">
            {activityLog.map((entry, index) => (
              <div key={index} className="small text-muted py-1 border-top">
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div
          ref={formRef}
          className="border rounded p-3 mt-2 bg-white shadow-sm"
          style={{ maxWidth: 360 }}
          data-testid="order-form-panel"
        >
          <Form.Group className="mb-2">
            <Form.Label>Customer</Form.Label>
            <Form.Control value={customer} onChange={(event) => setCustomer(event.target.value)} data-testid="order-customer-input" />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              data-testid="order-amount-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select value={status} onChange={(event) => setStatus(event.target.value)} data-testid="order-status-select">
              <option>Pending</option>
              <option>Shipped</option>
              <option>Delivered</option>
            </Form.Select>
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="orders-save-button">
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

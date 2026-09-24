import { useState, type MouseEvent } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

interface Product {
  id: number
  name: string
  price: number
  category: string
}

const initialProducts: Product[] = [
  { id: 1, name: 'Wireless Mouse', price: 24.99, category: 'Accessories' },
  { id: 2, name: 'Mechanical Keyboard', price: 89.5, category: 'Accessories' },
]

export function ProductsPanel() {
  const [products, setProducts] = useState(initialProducts)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [pendingCheck, setPendingCheck] = useState<string | null>(null)

  const columnDefs: ColDef<Product>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'price', headerName: 'Price', width: 120, valueFormatter: (p) => `$${p.value.toFixed(2)}` },
    { field: 'category', headerName: 'Category', width: 160 },
  ]

  function openForm() {
    setName('')
    setPrice('')
    setCategory('')
    setShowForm(true)
  }

  // React 16 pattern: SyntheticEvents are pooled — their fields are nulled out
  // once the handler that received them returns. Reading a field asynchronously
  // (here, the `setTimeout` standing in for a debounced "confirm the SKU isn't a
  // duplicate before saving" check) requires `event.persist()` first, or
  // `event.type` below reads back empty/warns. React 17 removes event pooling
  // entirely — `persist()` becomes a harmless no-op there, safe to delete but
  // not required to. See references/breaking-changes.md's
  // `## React 16 → React 17` section.
  function handleSave(event: MouseEvent<HTMLButtonElement>) {
    event.persist()
    setPendingCheck(`confirming via ${event.type}…`)
    window.setTimeout(() => {
      setPendingCheck(null)
      const nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1
      setProducts((prev) => [...prev, { id: nextId, name, price: Number(price) || 0, category }])
      setShowForm(false)
    }, 0)
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">Products</h2>
        <Button size="sm" onClick={openForm} data-testid="products-add-button">
          Add product
        </Button>
      </div>
      <div style={{ height: 240, width: '100%' }} data-testid="products-grid">
        <AgGridReact<Product> theme={themeQuartz} rowData={products} columnDefs={columnDefs} />
      </div>

      <Modal show={showForm} onHide={() => setShowForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(event) => setName(event.target.value)} data-testid="product-name-input" />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              data-testid="product-price-input"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Category</Form.Label>
            <Form.Control
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              data-testid="product-category-input"
            />
          </Form.Group>
          {pendingCheck && <small className="text-muted">{pendingCheck}</small>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="products-save-button">
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

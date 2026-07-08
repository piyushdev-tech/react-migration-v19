import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import { useCounterStore } from '../store/counterStore'

export function Counter() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)

  return (
    <div className="d-flex align-items-center gap-3">
      <span data-testid="count-value" className="fs-4">
        Count: {count}
      </span>
      <ButtonGroup>
        <Button variant="outline-primary" onClick={decrement}>
          -
        </Button>
        <Button variant="outline-secondary" onClick={reset}>
          Reset
        </Button>
        <Button variant="outline-primary" onClick={increment}>
          +
        </Button>
      </ButtonGroup>
    </div>
  )
}

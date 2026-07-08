import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import { Counter } from '../components/Counter'
import { TodosGrid } from '../components/TodosGrid'
import { SearchBox } from '../components/SearchBox'
import { OutsideClick } from '../components/OutsideClick'

export function Home() {
  return (
    <Container>
      <Stack gap={4}>
        <section>
          <h1>Home</h1>
          <p className="text-muted">
            Zustand-backed counter, react-bootstrap buttons, ag-grid data fed by React Query.
          </p>
          <Counter />
        </section>
        <section>
          <h2>Search</h2>
          <SearchBox />
        </section>
        <section>
          <h2>Todos</h2>
          <TodosGrid />
          <OutsideClick label="Click outside the grid to deselect." />
        </section>
      </Stack>
    </Container>
  )
}

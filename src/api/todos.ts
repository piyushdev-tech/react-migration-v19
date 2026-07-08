export interface Todo {
  id: number
  title: string
  done: boolean
}

const MOCK_TODOS: Todo[] = [
  { id: 1, title: 'Upgrade to React 18.3', done: true },
  { id: 2, title: 'Run the React 19 codemods', done: false },
  { id: 3, title: 'Re-test ag-grid + react-bootstrap', done: false },
  { id: 4, title: 'Ship React 19.2.7', done: false },
]

// Simulates a network call. Swap this out for a real fetch() to your API.
export async function fetchTodos(): Promise<Todo[]> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  return MOCK_TODOS
}

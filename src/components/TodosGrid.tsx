import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community'
import { useMemo } from 'react'
import { useTodos } from '../hooks/useTodos'
import type { Todo } from '../api/todos'

ModuleRegistry.registerModules([AllCommunityModule])

export function TodosGrid() {
  const { data, isLoading, isError } = useTodos()

  const columnDefs = useMemo<ColDef<Todo>[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 90 },
      { field: 'title', headerName: 'Task', flex: 1 },
      { field: 'done', headerName: 'Done', width: 100 },
    ],
    [],
  )

  if (isLoading) return <p>Loading todos…</p>
  if (isError) return <p role="alert">Failed to load todos.</p>

  return (
    <div style={{ height: 260, width: '100%' }} data-testid="todos-grid">
      <AgGridReact<Todo>
        theme={themeQuartz}
        rowData={data}
        columnDefs={columnDefs}
      />
    </div>
  )
}

import { StrictMode } from 'react'
import * as ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'
import { queryClient } from './api/queryClient'
import { mountReleaseBanner } from './legacy/mountReleaseBanner'

// Legacy imperatively-mounted banner widget, running alongside the modern
// createRoot tree — see src/legacy/mountReleaseBanner.tsx (migrated by SKILL.md).
mountReleaseBanner()

// React 16 baseline: `createRoot`/`react-dom/client` don't exist until React 18,
// so the real root here uses the classic `ReactDOM.render` API — this becomes a
// genuine (wired) removed-API fixture once a later hop reaches 18→19; see
// `references/breaking-changes.md`'s `## React 18 → React 19` section for the
// `createRoot`/`hydrateRoot` replacement this will need then.
ReactDOM.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
  document.getElementById('root'),
)

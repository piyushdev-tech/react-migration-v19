import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)

import { Route, Routes } from 'react-router-dom'
import { AppNavBar } from './components/NavBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Home } from './pages/Home'
import { About } from './pages/About'

function App() {
  return (
    <ErrorBoundary>
      <AppNavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App

import { Route, Routes } from 'react-router-dom'
import { AppNavBar } from './components/NavBar'
import { Home } from './pages/Home'
import { About } from './pages/About'

function App() {
  return (
    <>
      <AppNavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  )
}

export default App

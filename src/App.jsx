import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import UploadPDF from './pages/UploadPDF'
import MergeManager from './pages/MergeManager'

function App() {
  return (
    <div className="admin-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPDF />} />
            <Route path="/merge" element={<MergeManager />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App

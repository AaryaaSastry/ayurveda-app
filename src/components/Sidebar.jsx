import { NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/upload" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Upload PDF
        </NavLink>
        <NavLink 
          to="/merge" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Merge Manager
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar

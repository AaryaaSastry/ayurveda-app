import { useState, useEffect } from 'react'
import { api } from '../services/api'

function Dashboard() {
  const [stats, setStats] = useState({
    totalPdfs: 0,
    totalMerged: 0,
    lastUpdated: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const response = await api.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total PDFs</h3>
          <p className="stat-value">{stats.totalPdfs}</p>
        </div>
        <div className="stat-card">
          <h3>Merged Files</h3>
          <p className="stat-value">{stats.totalMerged}</p>
        </div>
        <div className="stat-card">
          <h3>Last Updated</h3>
          <p className="stat-value">
            {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

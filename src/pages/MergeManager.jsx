import { useState, useEffect } from 'react'
import { api } from '../services/api'

function MergeManager() {
  const [availableFiles, setAvailableFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [merging, setMerging] = useState(false)
  const [message, setMessage] = useState(null)
  const [mergedHistory, setMergedHistory] = useState([])

  useEffect(() => {
    loadFiles()
    loadMergeHistory()
  }, [])

  const loadFiles = async () => {
    try {
      const response = await api.getFiles()
      setAvailableFiles(response.data)
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }

  const loadMergeHistory = async () => {
    try {
      const response = await api.getMergeHistory()
      setMergedHistory(response.data)
    } catch (error) {
      console.error('Failed to load merge history:', error)
    }
  }

  const handleDelete = async (filename) => {
    if (!confirm(`Delete merged file ${filename}? This cannot be undone.`)) return
    try {
      await api.deleteMergedFile(filename)
      loadMergeHistory()
    } catch (err) {
      console.error('Failed to delete merged file', err)
      setMessage({ type: 'error', text: 'Failed to delete merged file.' })
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL merged files and clear history?')) return
    try {
      await api.deleteAllMerged()
      setMergedHistory([])
      setMessage({ type: 'success', text: 'All merged files deleted.' })
    } catch (err) {
      console.error('Failed to delete all merged files', err)
      setMessage({ type: 'error', text: 'Failed to delete all merged files.' })
    }
  }

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      setMessage({ type: 'error', text: 'Please select at least 2 files to merge.' })
      return
    }

    setMerging(true)
    setMessage(null)

    try {
      await api.mergeFiles(selectedFiles)
      setMessage({ type: 'success', text: 'Files merged successfully!' })
      setSelectedFiles([])
      loadMergeHistory()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to merge files.' })
    } finally {
      setMerging(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'No files selected to delete.' })
      return
    }
    if (!confirm(`Delete ${selectedFiles.length} selected file(s)? This cannot be undone.`)) return

    try {
      // delete files in parallel
      await Promise.all(selectedFiles.map(id => api.deleteFile(id)))
      setMessage({ type: 'success', text: 'Selected files deleted.' })
      setSelectedFiles([])
      loadFiles()
      loadMergeHistory()
    } catch (err) {
      console.error('Failed to delete selected files', err)
      setMessage({ type: 'error', text: 'Failed to delete selected files.' })
    }
  }

  return (
    <div className="merge-manager">
      <h1>Merge Manager</h1>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="merge-section">
        <h2>Select Files to Merge</h2>
        <div className="file-list">
          {availableFiles.map(file => (
            <div 
              key={file.id} 
              className={`file-item ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
              onClick={() => toggleFileSelection(file.id)}
            >
              <input 
                type="checkbox" 
                checked={selectedFiles.includes(file.id)}
                onChange={() => {}}
              />
              <span>{file.name}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="merge-btn" 
            onClick={handleMerge}
            disabled={merging || selectedFiles.length < 2}
          >
            {merging ? 'Merging...' : `Merge ${selectedFiles.length} Files`}
          </button>

          <button
            className="btn-delete"
            onClick={handleDeleteSelected}
            disabled={selectedFiles.length === 0}
            title="Delete selected uploaded files"
          >
            Delete Selected
          </button>
        </div>
      </div>

      <div className="history-section">
        <h2>Merge History</h2>
        <div className="history-list">
          {mergedHistory.map(item => (
            <div key={item.id} className="history-item">
              <a
                className="history-name"
                href={`/api/merged/${item.output_file}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.output_file}
              </a>
              <span className="history-date">
                {new Date(item.created_at).toLocaleString()}
              </span>
              <button
                className="delete-merged-btn"
                onClick={() => handleDelete(item.output_file)}
                title="Delete this merged file"
              >
                Delete
              </button>
            </div>
          ))}
          {mergedHistory.length > 0 && (
            <div className="history-actions">
              <button className="delete-all-merged-btn" onClick={handleDeleteAll}>
                Delete All Merged Files
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MergeManager

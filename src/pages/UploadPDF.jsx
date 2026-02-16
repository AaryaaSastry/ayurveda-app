import { useState } from 'react'
import { api } from '../services/api'
import UploadCard from '../components/UploadCard'
import FileTable from '../components/FileTable'

function UploadPDF() {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [mergedFiles, setMergedFiles] = useState([])

  const handleUpload = async (selectedFiles) => {
    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      for (const file of selectedFiles) {
        formData.append('files', file)
      }

      await api.uploadPDF(formData)
      setMessage({ type: 'success', text: 'Files uploaded successfully!' })
      loadFiles()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload files.' })
    } finally {
      setUploading(false)
    }
  }

  const handleSelectionChange = (ids) => {
    setSelectedIds(ids)
  }

  const handleMerge = async () => {
    if (!selectedIds || selectedIds.length < 2) {
      setMessage({ type: 'error', text: 'Select at least 2 files to merge.' })
      return
    }
    try {
      const resp = await api.mergeFiles(selectedIds)
      if (resp && resp.data && resp.data.success) {
        setMessage({ type: 'success', text: `Merged: ${resp.data.output_file}` })
        setSelectedIds([])
        loadFiles()
        loadMergedFiles()
      } else {
        setMessage({ type: 'error', text: 'Merge failed.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Merge failed.' })
    }
  }

  const loadMergedFiles = async () => {
    try {
      const resp = await api.getMergedFiles()
      setMergedFiles(resp.data)
    } catch (e) {
      console.error('Failed to load merged files', e)
    }
  }

  const loadFiles = async () => {
    try {
      const response = await api.getFiles()
      setFiles(response.data)
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }

  const handleDelete = async (fileId) => {
    try {
      await api.deleteFile(fileId)
      loadFiles()
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  return (
    <div className="upload-pdf">
      <h1>Upload PDF</h1>
      
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <UploadCard onUpload={handleUpload} uploading={uploading} />
      
      <h2>Uploaded Files</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button className="btn-primary" onClick={handleMerge} disabled={uploading || selectedIds.length < 2}>Merge Selected</button>
        <div style={{ fontSize: 13, color: '#666' }}>{selectedIds.length} file(s) selected</div>
      </div>
      <FileTable files={files} onDelete={handleDelete} onSelectionChange={handleSelectionChange} selectedIds={selectedIds} />

      <h2 style={{ marginTop: 18 }}>Merged Outputs</h2>
      {mergedFiles.length === 0 ? (
        <div className="small text-muted">No merged files yet.</div>
      ) : (
        <ul>
          {mergedFiles.map(m => (
            <li key={m.name} style={{ marginBottom: 6 }}>
              <a href={`/api/merged/${encodeURIComponent(m.name)}`} target="_blank" rel="noreferrer">{m.name}</a>
              <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>({new Date(m.created_at).toLocaleString()})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UploadPDF

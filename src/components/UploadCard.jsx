import { useState, useRef } from 'react'

function UploadCard({ onUpload, uploading }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const inputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files) => {
    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
  }

  const handleUploadClick = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles)
    }
  }

  return (
    <div 
      className={`upload-card ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        ref={inputRef}
        type="file" 
        multiple 
        accept=".pdf"
        onChange={handleChange}
        className="file-input"
      />
      
      <div className="upload-content">
        <p className="upload-icon">📁</p>
        <p>Drag and drop PDF files here</p>
        <p className="upload-or">or</p>
        <button 
          className="btn-primary"
          onClick={() => inputRef.current?.click()}
        >
          Browse Files
        </button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <p>{selectedFiles.length} file(s) selected</p>
          <ul>
            {selectedFiles.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
          <button 
            className="btn-upload"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  )
}

export default UploadCard

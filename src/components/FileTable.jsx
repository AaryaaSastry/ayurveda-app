function FileTable({ files, onDelete, onSelectionChange, selectedIds = [] }) {
  if (!files || files.length === 0) {
    return <p className="no-files">No files uploaded yet.</p>
  }

  const toggle = (fileId) => {
    const next = selectedIds.includes(fileId) ? selectedIds.filter(id => id !== fileId) : [...selectedIds, fileId]
    onSelectionChange && onSelectionChange(next)
  }

  return (
    <table className="file-table">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Size</th>
          <th>Uploaded</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {files.map(file => (
          <tr key={file.id}>
            <td>
              <input type="checkbox" checked={selectedIds.includes(file.id)} onChange={() => toggle(file.id)} />
            </td>
            <td>{file.name}</td>
            <td>{formatFileSize(file.size)}</td>
            <td>{new Date(file.uploaded_at).toLocaleString()}</td>
            <td>
              <button 
                className="btn-delete"
                onClick={() => onDelete(file.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default FileTable

import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Dashboard stats
const getStats = () => apiClient.get('/stats')

// File management
const getFiles = () => apiClient.get('/files')
const uploadPDF = (formData) => apiClient.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})
const deleteFile = (fileId) => apiClient.delete(`/files/${fileId}`)

// Merge operations
const mergeFiles = (fileIds) => apiClient.post('/merge', { file_ids: fileIds })
const getMergeHistory = () => apiClient.get('/merge/history')
const getMergedFiles = () => apiClient.get('/merged')
const deleteMergedFile = (filename) => apiClient.delete(`/merged/${encodeURIComponent(filename)}`)
const deleteAllMerged = () => apiClient.delete('/merged')

// Export api object with all methods
export const api = {
  getStats,
  getFiles,
  uploadPDF,
  deleteFile,
  mergeFiles,
  getMergeHistory,
  getMergedFiles,
  deleteMergedFile,
  deleteAllMerged
}

export default api

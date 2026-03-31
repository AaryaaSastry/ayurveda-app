import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const CHAT_API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const patientApi = {
  getReports: () => api.get('/patient/reports'),
  getAppointments: () => api.get('/patient/appointments'),
  updateProfile: (data) => api.patch('/patient/profile', data),
  getMessages: (patientId) => api.get(`/messages/patient/${patientId}`),
  sendMessage: (data) => api.post('/messages/send', data),
};

export const publicApi = {
  getNearbyDoctors: (lat, lng) => api.get(`/public/doctors/nearby?lat=${lat}&lng=${lng}`),
  getAllDoctors: () => api.get('/public/doctors/nearby?all=true'),
  bookAppointment: (data) => api.post('/public/appointments/book', data),
};

// Chat API (FastAPI)
export const chatApi = {
  getSessions: (userId) => axios.get(`${CHAT_API_BASE_URL}/api/chat/sessions/${userId}`),
  getSession: (sessionId) => axios.get(`${CHAT_API_BASE_URL}/api/chat/session/${sessionId}`),
  createSession: (userId) => axios.post(`${CHAT_API_BASE_URL}/api/chat/create`, { userId }),
  deleteSession: (sessionId) => axios.delete(`${CHAT_API_BASE_URL}/api/chat/session/${sessionId}`),
  ask: (sessionId, message, diagnosis) => axios.post(`${CHAT_API_BASE_URL}/ask?user_id=${encodeURIComponent(sessionId)}`, { message, diagnosis }),
  getRecipes: (sessionId, diagnosis) => axios.post(`${CHAT_API_BASE_URL}/recipes?user_id=${encodeURIComponent(sessionId)}`, { diagnosis }),
};

export default api;

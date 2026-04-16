import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';
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

// Create a separate instance for chat API with token support
const chatApiInstance = axios.create({
  baseURL: CHAT_API_BASE_URL,
});

chatApiInstance.interceptors.request.use((config) => {
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
  hideAppointment: (id) => api.delete(`/patient/appointments/${id}`),
};

export const publicApi = {
  getNearbyDoctors: (lat, lng) => api.get(`/public/doctors/nearby?lat=${lat}&lng=${lng}`),
  getAllDoctors: () => api.get('/public/doctors/nearby?all=true'),
  bookAppointment: (data) => api.post('/public/appointments/book', data),
};

// Chat API (FastAPI with JWT auth)
export const chatApi = {
  getSessions: (userId) => chatApiInstance.get(`/api/chat/sessions/${userId}`),
  getSession: (sessionId) => chatApiInstance.get(`/api/chat/session/${sessionId}`),
  createSession: (userId) => chatApiInstance.post(`/api/chat/create`, { userId }),
  deleteSession: (sessionId) => chatApiInstance.delete(`/api/chat/session/${sessionId}`),
  ask: (sessionId, message, diagnosis) => chatApiInstance.post(`/ask?user_id=${encodeURIComponent(sessionId)}`, { message, diagnosis }),
  getRecipes: (sessionId, diagnosis) => chatApiInstance.post(`/recipes?user_id=${encodeURIComponent(sessionId)}`, { diagnosis }),
};

export const docConnectApi = {
  createChat: (user2_id) => api.post('/chat/create', { user2_id }),
  getChats: () => api.get('/chat/my-chats'),
  getMessages: (chatId) => api.get(`/chat/${chatId}/messages`),
  sendMessage: (chat_id, message_text) => api.post('/chat/send', { chat_id, message_text }),
  
  startNegotiation: (chatId, data) => api.post('/negotiation/start', { chat_id: chatId, ...data }),
  counterNegotiation: (id, data) => api.post('/negotiation/counter', { negotiation_id: id, ...data }),
  acceptNegotiation: (id) => api.post('/negotiation/accept', { negotiation_id: id }),
  lockNegotiation: (id) => api.post('/negotiation/lock', { negotiation_id: id }),
  getNegotiation: (chatId) => api.get(`/negotiation/${chatId}`),
};

export default api;

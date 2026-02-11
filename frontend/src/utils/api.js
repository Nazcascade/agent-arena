import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage')
      ? JSON.parse(localStorage.getItem('auth-storage')).state?.token
      : null
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

// Agent API
export const agentAPI = {
  list: () => api.get('/agents'),
  create: (data) => api.post('/agents', data),
  get: (id) => api.get(`/agents/${id}`),
  update: (id, data) => api.patch(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  getStats: (id) => api.get(`/agents/${id}/stats`),
  regenerateKey: (id) => api.post(`/agents/${id}/regenerate-key`),
}

// Game/Room API
export const gameAPI = {
  listGames: () => api.get('/games'),
  listActiveRooms: () => api.get('/rooms/active'),
  getRoom: (roomId) => api.get(`/rooms/${roomId}`),
}

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  getAgents: () => api.get('/users/me/agents'),
}

// Admin API
export const adminAPI = {
  getSystemStats: () => api.get('/admin/stats'),
  getActiveRooms: () => api.get('/admin/rooms'),
  getOnlineAgents: () => api.get('/admin/agents/online'),
  broadcastMessage: (message) => api.post('/admin/broadcast', { message }),
}

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: (limit = 100) => api.get(`/leaderboard?limit=${limit}`),
}

export default api
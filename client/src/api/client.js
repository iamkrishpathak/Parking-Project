import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('parksetu_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Let axios auto-set Content-Type for FormData
  if (config.data instanceof FormData && !config.headers['Content-Type']) {
    // Delete the Content-Type header to let axios set it automatically
    delete config.headers['Content-Type'];
  }
  
  return config;
});

export default api;


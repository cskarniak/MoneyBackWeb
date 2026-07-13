import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  response => response,
  error => {
    const message = error?.response?.data?.message;
    if (message) {
      error.message = Array.isArray(message) ? message.join(', ') : message;
    }
    return Promise.reject(error);
  },
);

export default api;

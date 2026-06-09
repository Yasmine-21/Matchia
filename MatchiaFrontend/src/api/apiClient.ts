import axios from 'axios';

const apiClient = axios.create({
  // L'URL de base de votre backend Spring Boot
  baseURL: 'http://localhost:8081',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
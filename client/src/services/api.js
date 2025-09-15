import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://codearena-backend-a9o6.onrender.com'
  : 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const problemsAPI = {
  // Get all problems with stats
  getAllProblems: () => api.get('/api/problems'),
  
  // Get specific problem with examples
  getProblem: (id) => api.get(`/api/problems/${id}`),
  
  // Get code template for specific language
  getTemplate: (id, language) => api.get(`/api/problems/${id}/template/${language}`),
  
  // Submit code for evaluation
  submitCode: (problemId, code, language) => api.post('/api/submit', {
    problemId,
    code,
    language
  }),
  
  // Get platform statistics
  getStats: () => api.get('/stats'),
  
  // Get recent submissions
  getRecentSubmissions: () => api.get('/api/recent-submissions'),
  
  // Health check
  getHealth: () => api.get('/health')
};

export default api;

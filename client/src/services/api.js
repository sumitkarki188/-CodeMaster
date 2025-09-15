import axios from 'axios';

const API_BASE_URL = 'https://codearena-backend-a9o6.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
});

// Add retry logic for sleeping services
const retryRequest = async (requestFn, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === retries) throw error;
      
      console.log(`Request failed, retrying... (${i + 1}/${retries})`);
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

export const problemsAPI = {
  getAllProblems: () => retryRequest(() => api.get('/api/problems')),
  getProblem: (id) => retryRequest(() => api.get(`/api/problems/${id}`)),
  getTemplate: (id, language) => retryRequest(() => api.get(`/api/problems/${id}/template/${language}`)),
  submitCode: (problemId, code, language) => retryRequest(() => 
    api.post('/api/submit', { problemId, code, language })
  ),
  getStats: () => retryRequest(() => api.get('/stats')),
  getHealth: () => retryRequest(() => api.get('/health'))
};

export default api;

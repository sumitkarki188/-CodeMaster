import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const problemsAPI = {
    getAllProblems: () => api.get('/problems'),
    getProblem: (id) => api.get(`/problems/${id}`),
    getTemplate: (id, language) => api.get(`/problems/${id}/template/${language}`),
    submitCode: (data) => api.post('/submit', data)
};

export default api;

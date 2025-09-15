import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { problemsAPI } from '../services/api';

const ProblemsList = () => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadProblems();
    }, []);

    const loadProblems = async () => {
        try {
            const response = await problemsAPI.getAllProblems();
            setProblems(response.data);
        } catch (apiError) {
            console.error('Failed to load problems:', apiError.message);
        }
        setLoading(false);
    };

    if (loading) return <div className="loading">Loading problems...</div>;

    return (
        <div className="problems-container">
            <h2>📚 Problems</h2>
            
            <div className="problems-table">
                <div className="table-header">
                    <div>Title</div>
                    <div>Difficulty</div>
                    <div>Action</div>
                </div>
                
                {problems.map((problem, index) => (
                    <div key={problem.id} className="table-row">
                        <div className="problem-title">
                            <span className="problem-number">{index + 1}.</span>
                            <span>{problem.title}</span>
                        </div>
                        <div>
                            <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>
                                {problem.difficulty}
                            </span>
                        </div>
                        <div>
                            <button 
                                onClick={() => navigate(`/problem/${problem.id}`)}
                                className="solve-btn"
                            >
                                Solve
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProblemsList;

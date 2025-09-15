import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI } from '../services/api';
import './ProblemsList.css';

const ProblemsList = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch problems and stats in parallel
      const [problemsRes, statsRes] = await Promise.all([
        problemsAPI.getAllProblems(),
        problemsAPI.getStats()
      ]);
      
      // Handle different response structures
      const problemsData = problemsRes.data.problems || problemsRes.data;
      setProblems(Array.isArray(problemsData) ? problemsData : []);
      setStats(statsRes.data);
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.error || 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#00b800';
      case 'medium': return '#ffa500';
      case 'hard': return '#ff0000';
      default: return '#666';
    }
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading problems...</p>
    </div>
  );

  if (error) return (
    <div className="error">
      <h3>❌ Error</h3>
      <p>{error}</p>
      <button onClick={fetchData} className="retry-btn">Retry</button>
    </div>
  );

  return (
    <div className="problems-list">
      {/* Platform Statistics */}
      {stats && (
        <div className="stats-card">
          <h3>📊 Platform Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{stats.total_problems || 0}</span>
              <span className="stat-label">Problems</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.total_submissions || 0}</span>
              <span className="stat-label">Submissions</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.acceptance_rate || 0}%</span>
              <span className="stat-label">Acceptance</span>
            </div>
          </div>
        </div>
      )}

      {/* Problems Header */}
      <div className="problems-header">
        <h2>🏆 Coding Problems</h2>
        <p>Choose a problem to start coding!</p>
      </div>

      {/* Problems Table */}
      <div className="problems-table">
        <div className="table-header">
          <div className="col-title">Problem</div>
          <div className="col-difficulty">Difficulty</div>
          <div className="col-acceptance">Acceptance</div>
          <div className="col-submissions">Submissions</div>
        </div>

        {problems.length > 0 ? (
          problems.map(problem => (
            <Link 
              key={problem.id} 
              to={`/problem/${problem.id}`}
              className="problem-row"
            >
              <div className="col-title">
                <span className="problem-id">#{problem.id}</span>
                <span className="problem-title">{problem.title}</span>
              </div>
              <div className="col-difficulty">
                <span 
                  className="difficulty-badge"
                  style={{ color: getDifficultyColor(problem.difficulty) }}
                >
                  {problem.difficulty}
                </span>
              </div>
              <div className="col-acceptance">
                {problem.acceptance_rate || 0}%
              </div>
              <div className="col-submissions">
                {problem.submission_count || 0}
              </div>
            </Link>
          ))
        ) : (
          <div className="no-problems">
            <h3>🤔 No problems available</h3>
            <p>Problems will appear here once they're added to the database.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsList;

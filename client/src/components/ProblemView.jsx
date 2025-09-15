import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { problemsAPI } from '../services/api';
import './ProblemView.css';

const ProblemView = () => {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const languages = {
    'cpp': 'C++',
    'python': 'Python',
    'java': 'Java',
    'c': 'C'
  };

  useEffect(() => {
    fetchProblem();
  }, [id]);

  useEffect(() => {
    if (problem) {
      loadTemplate();
    }
  }, [problem, selectedLanguage]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const response = await problemsAPI.getProblem(id);
      setProblem(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async () => {
    if (!problem || !selectedLanguage) return;
    
    try {
      const response = await problemsAPI.getTemplate(id, selectedLanguage);
      setCode(response.data.template || '');
    } catch (err) {
      console.error('Failed to load template:', err);
      setCode('// Write your code here');
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting!');
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      
      const response = await problemsAPI.submitCode(id, code, selectedLanguage);
      setResult(response.data);
    } catch (err) {
      setResult({
        verdict: 'System Error',
        error: err.response?.data?.error || 'Submission failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'Accepted': return '#00b800';
      case 'Wrong Answer': return '#ff0000';
      case 'Compilation Error': return '#ff6600';
      case 'Time Limit Exceeded': return '#ff9900';
      case 'Runtime Error': return '#cc0000';
      case 'System Error': return '#666';
      default: return '#666';
    }
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading problem...</p>
    </div>
  );

  if (error) return (
    <div className="error">
      <h3>❌ Error</h3>
      <p>{error}</p>
      <Link to="/" className="back-btn">← Back to Problems</Link>
    </div>
  );

  if (!problem) return null;

  return (
    <div className="problem-view">
      {/* Header */}
      <div className="problem-header">
        <Link to="/" className="back-link">← Back to Problems</Link>
        <div className="problem-title">
          <h1>#{problem.id}. {problem.title}</h1>
          <span 
            className="difficulty-badge"
            style={{ 
              backgroundColor: problem.difficulty === 'Easy' ? '#00b800' : 
                             problem.difficulty === 'Medium' ? '#ffa500' : '#ff0000' 
            }}
          >
            {problem.difficulty}
          </span>
        </div>
      </div>

      <div className="problem-content">
        {/* Problem Description */}
        <div className="problem-panel">
          <div className="panel-header">
            <h3>📋 Problem Description</h3>
          </div>
          <div className="panel-content">
            <div className="description">
              {problem.description}
            </div>

            {/* Examples */}
            {problem.examples && problem.examples.length > 0 && (
              <div className="examples">
                <h4>Examples:</h4>
                {problem.examples.map((example, index) => (
                  <div key={index} className="example">
                    <div className="example-header">Example {index + 1}:</div>
                    <div className="example-content">
                      <div><strong>Input:</strong> {example.input}</div>
                      <div><strong>Output:</strong> {example.output}</div>
                      {example.explanation && (
                        <div><strong>Explanation:</strong> {example.explanation}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Constraints */}
            {problem.constraints && (
              <div className="constraints">
                <h4>Constraints:</h4>
                <pre>{problem.constraints}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor */}
        <div className="code-panel">
          <div className="panel-header">
            <h3>💻 Code Editor</h3>
            <select 
              value={selectedLanguage} 
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="language-select"
            >
              {Object.entries(languages).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          <div className="panel-content">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your code here..."
              className="code-editor"
              spellCheck={false}
            />
            
            <div className="editor-actions">
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="submit-btn"
              >
                {submitting ? '🔄 Running...' : '🚀 Submit Solution'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="result-panel">
          <div className="panel-header">
            <h3>📊 Submission Result</h3>
          </div>
          <div className="panel-content">
            <div className="result-summary">
              <div 
                className="verdict"
                style={{ color: getVerdictColor(result.verdict) }}
              >
                {result.verdict}
              </div>
              
              {result.verdict === 'Accepted' && (
                <div className="success-stats">
                  <div>✅ All test cases passed!</div>
                  <div>⏱️ Runtime: {result.runtime}ms</div>
                  <div>💾 Memory: {result.memory}KB</div>
                  <div>🎯 Tests: {result.passedTests}/{result.totalTests}</div>
                </div>
              )}

              {result.verdict === 'Wrong Answer' && result.failedCase && (
                <div className="failed-case">
                  <div>❌ Test case #{result.failedCase.testNumber} failed</div>
                  <div><strong>Input:</strong> {result.failedCase.input}</div>
                  <div><strong>Expected:</strong> {result.failedCase.expected}</div>
                  <div><strong>Your output:</strong> {result.failedCase.actual}</div>
                </div>
              )}

              {(result.verdict === 'Compilation Error' || 
                result.verdict === 'Runtime Error' || 
                result.verdict === 'System Error') && result.failedCase && (
                <div className="error-details">
                  <div>❌ {result.verdict}</div>
                  <pre>{result.failedCase.error}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemView;

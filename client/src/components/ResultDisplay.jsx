import React from 'react'

const ResultDisplay = ({ result }) => {
  const getStatusIcon = (verdict) => {
    switch (verdict?.toLowerCase()) {
      case 'accepted': return '✅'
      case 'wrong answer': return '❌'
      case 'runtime error': return '💥'
      case 'time limit exceeded': return '⏱️'
      case 'error': return '🚨'
      default: return '❓'
    }
  }

  const getStatusClass = (verdict) => {
    switch (verdict?.toLowerCase()) {
      case 'accepted': return 'success'
      case 'wrong answer': return 'wrong'
      case 'runtime error': return 'error'
      case 'time limit exceeded': return 'timeout'
      case 'error': return 'error'
      default: return 'unknown'
    }
  }

  return (
    <div className={`result-display ${getStatusClass(result.verdict)}`}>
      <div className="result-header">
        <h4>
          {getStatusIcon(result.verdict)} 
          {result.isTestRun ? 'Test Run Result' : 'Submission Result'}
        </h4>
      </div>
      
      <div className="result-content">
        <div className="result-item">
          <strong>Verdict:</strong> 
          <span className={`verdict ${getStatusClass(result.verdict)}`}>
            {result.verdict}
          </span>
        </div>
        
        {result.runtime !== undefined && (
          <div className="result-item">
            <strong>Runtime:</strong> 
            <span className="runtime">{result.runtime}ms</span>
          </div>
        )}
        
        {result.error && (
          <div className="result-item error-detail">
            <strong>Error Details:</strong>
            <pre className="error-text">{result.error}</pre>
          </div>
        )}
        
        {result.submissionId && (
          <div className="result-item">
            <strong>Submission ID:</strong> 
            <span className="submission-id">#{result.submissionId}</span>
          </div>
        )}

        {result.isTestRun && (
          <div className="result-note">
            <small>💡 This was a test run. Click Submit for final submission.</small>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultDisplay

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { problemsAPI } from '../services/api';
import CodeEditor from './CodeEditor';

const ProblemView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProblem();
    }, [id]);

    const loadProblem = async () => {
        try {
            const response = await problemsAPI.getProblem(id);
            setProblem(response.data);
        } catch (apiError) {
            console.error('Failed to load problem:', apiError.message);
        }
        setLoading(false);
    };

    if (loading) return <div className="loading">Loading problem...</div>;
    if (!problem) return <div className="error">Problem not found</div>;

    // Use examples from API response (fetched from test_cases table)
    const examples = problem.examples && problem.examples.length > 0 
        ? problem.examples 
        : [{
            input: 'No examples available',
            output: 'Please check problem description',
            explanation: 'Test cases will be added soon.'
          }];

    return (
        <div className="problem-view">
            <div className="problem-layout">
                {/* Problem Description */}
                <div className="problem-panel">
                    <div className="problem-header">
                        <button onClick={() => navigate('/')} className="back-btn">
                            ← Problems
                        </button>
                        <h1>{problem.title}</h1>
                        <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>
                            {problem.difficulty}
                        </span>
                    </div>

                    <div className="problem-content">
                        <div className="section">
                            <p>{problem.description}</p>
                        </div>

                        {/* Auto-generated Examples from Test Cases */}
                        {examples.length > 0 && examples[0].input !== 'No examples available' && (
                            <div className="section">
                                <h3>Examples:</h3>
                                <div className="examples-container">
                                    {examples.map((example, index) => (
                                        <div key={index} className="example-card">
                                            <div className="example-header">
                                                <strong>Example {index + 1}:</strong>
                                            </div>
                                            <div className="example-content">
                                                <div className="example-row">
                                                    <span className="label">Input:</span>
                                                    <code className="example-code">{example.input}</code>
                                                </div>
                                                <div className="example-row">
                                                    <span className="label">Output:</span>
                                                    <code className="example-code">{example.output}</code>
                                                </div>
                                                {example.explanation && (
                                                    <div className="example-row">
                                                        <span className="label">Explanation:</span>
                                                        <span className="explanation">{example.explanation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {problem.constraints && (
                            <div className="section">
                                <h3>Constraints:</h3>
                                <div className="constraints">
                                    <p>{problem.constraints}</p>
                                </div>
                            </div>
                        )}

                        <div className="section">
                            <h3>Follow-up:</h3>
                            <p>Can you solve this with optimal time complexity?</p>
                        </div>
                    </div>
                </div>

                {/* Code Editor */}
                <div className="editor-panel">
                    <CodeEditor problem={problem} />
                </div>
            </div>
        </div>
    );
};

export default ProblemView;

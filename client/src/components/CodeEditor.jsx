import React, { useState, useEffect, useRef } from 'react';
import { problemsAPI } from '../services/api';
const CodeEditor = ({ problem }) => {
    const [language, setLanguage] = useState('cpp');
    const [code, setCode] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

    useEffect(() => {
        loadTemplate();
    }, [problem.id, language]);

    // Sync scrolling between line numbers and code
    const handleScroll = (e) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Get default templates for each language
    const getDefaultTemplate = (problemTitle, language) => {
        const templates = {
            'Two Sum': {
                cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    
}`,
                python: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    
    `,
                java: `public int[] twoSum(int[] nums, int target) {
    
}`,
                c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    
    return 0;
}`
            },
            'Valid Parentheses': {
                cpp: `bool isValid(string s) {
    
}`,
                python: `def isValid(self, s: str) -> bool:
    
    `,
                java: `public boolean isValid(String s) {
    
}`,
                c: `#include <stdio.h>
#include <stdbool.h>

int main() {
    
    return 0;
}`
            }
        };

        return templates[problemTitle]?.[language] || 
               templates['Two Sum'][language] || 
               getGenericTemplate(language);
    };

    const getGenericTemplate = (language) => {
        switch (language) {
            case 'cpp':
                return `// Write your C++ code here
int main() {
    
    return 0;
}`;
            case 'python':
                return `# Write your Python code here
def solution():
    pass`;
            case 'java':
                return `// Write your Java code here
public class Solution {
    
}`;
            case 'c':
                return `// Write your C code here
#include <stdio.h>

int main() {
    
    return 0;
}`;
            default:
                return `// Write your code here`;
        }
    };

    const loadTemplate = async () => {
        try {
            const response = await problemsAPI.getTemplate(problem.id, language);
            let template = response.data.template;
            
            if (!template || template.length < 15) {
                template = getDefaultTemplate(problem.title, language);
            }
            
            setCode(template);
        } catch (apiError) {
            console.error('Failed to load template:', apiError.message);
            const defaultTemplate = getDefaultTemplate(problem.title, language);
            setCode(defaultTemplate);
        }
    };

    const handleSubmit = async () => {
        if (!code.trim()) return;
        
        setLoading(true);
        setResult(null);

        try {
            const response = await problemsAPI.submitCode({
                problemId: problem.id,
                code,
                language
            });
            setResult(response.data);
        } catch (apiError) {
            console.error('Submit failed:', apiError.message);
            setResult({
                verdict: 'System Error',
                error: apiError.message
            });
        }
        setLoading(false);
    };

    const handleReset = () => {
        loadTemplate();
        setResult(null);
    };

    const handleKeyDown = (e) => {
        const textarea = e.target;
        
        if (e.key === 'Tab') {
            e.preventDefault();
            const { selectionStart, selectionEnd } = textarea;
            const spaces = '    '; // 4 spaces
            const newValue = code.substring(0, selectionStart) + spaces + code.substring(selectionEnd);
            setCode(newValue);
            
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = selectionStart + spaces.length;
            }, 0);
        }
        
        if (e.key === 'Enter') {
            e.preventDefault();
            const { selectionStart } = textarea;
            const lines = code.substring(0, selectionStart).split('\n');
            const currentLine = lines[lines.length - 1];
            const indent = currentLine.match(/^\s*/)[0];
            
            // Add extra indent for braces
            let extraIndent = '';
            if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith(':')) {
                extraIndent = '    ';
            }
            
            const newValue = code.substring(0, selectionStart) + '\n' + indent + extraIndent + code.substring(selectionStart);
            setCode(newValue);
            
            setTimeout(() => {
                const newPosition = selectionStart + 1 + indent.length + extraIndent.length;
                textarea.selectionStart = textarea.selectionEnd = newPosition;
            }, 0);
        }
    };

    const handleCodeChange = (e) => {
        setCode(e.target.value);
    };

    // Generate line numbers
    const lines = code.split('\n');
    const lineCount = Math.max(lines.length, 25);

    return (
        <div className="code-editor-container">
            {/* Header */}
            <div className="code-editor-header">
                <div className="header-left">
                    <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        className="language-selector"
                    >
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                    </select>
                    
                    <button onClick={handleReset} className="reset-button">
                        ↻ Reset
                    </button>
                </div>
                
                <div className="header-right">
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="submit-button"
                    >
                        {loading ? '⏳ Running...' : '▶ Submit'}
                    </button>
                </div>
            </div>

            {/* Editor Body */}
            <div className="code-editor-body">
                <div className="editor-main">
                    {/* Line Numbers */}
                    <div 
                        className="line-numbers"
                        ref={lineNumbersRef}
                    >
                        {Array.from({ length: lineCount }, (_, i) => (
                            <div key={i + 1} className="line-number">
                                {i + 1}
                            </div>
                        ))}
                    </div>
                    
                    {/* Code Area */}
                    <textarea
                        ref={textareaRef}
                        value={code}
                        onChange={handleCodeChange}
                        onKeyDown={handleKeyDown}
                        onScroll={handleScroll}
                        className="code-area"
                        placeholder="Write your code here..."
                        spellCheck="false"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="results-container">
                    <div className={`result-header ${result.verdict === 'Accepted' ? 'success' : 'error'}`}>
                        <div className="result-info">
                            <span className="result-icon">
                                {result.verdict === 'Accepted' ? '✓' : '✗'}
                            </span>
                            <span className="result-text">{result.verdict}</span>
                        </div>
                        {result.runtime && (
                            <div className="result-stats">
                                <span>⏱ {result.runtime}ms</span>
                                {result.memory && <span>💾 {result.memory}KB</span>}
                            </div>
                        )}
                    </div>

                    {result.passedTests !== undefined && (
                        <div className="test-summary">
                            <strong>Test Cases:</strong> {result.passedTests}/{result.totalTests} passed
                        </div>
                    )}

                    {result.failedCase && (
                        <div className="failed-case">
                            <h4>Failed Test Case</h4>
                            {result.failedCase.input && (
                                <div className="test-case-details">
                                    <div className="test-case-row">
                                        <span className="label">Input:</span>
                                        <code className="value">{result.failedCase.input}</code>
                                    </div>
                                    <div className="test-case-row">
                                        <span className="label">Expected:</span>
                                        <code className="value">{result.failedCase.expected}</code>
                                    </div>
                                    <div className="test-case-row">
                                        <span className="label">Your Output:</span>
                                        <code className="value">{result.failedCase.actual}</code>
                                    </div>
                                </div>
                            )}
                            {result.failedCase.error && (
                                <div className="error-message">
                                    <strong>Error:</strong>
                                    <pre>{result.failedCase.error}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CodeEditor;

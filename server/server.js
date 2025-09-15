const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';

// CORS configuration
app.use(cors({
    origin: isProduction 
        ? [
            'https://codearena-frontend.onrender.com',
            'https://your-custom-domain.com'
          ]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection with environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'abcd',
    database: process.env.DB_NAME || 'judge',
    port: process.env.DB_PORT || 3306,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

const db = mysql.createConnection(dbConfig);

// Database connection with retry logic
const connectToDatabase = () => {
    db.connect((err) => {
        if (err) {
            console.error('Database connection failed:', err.message);
            console.log('Retrying database connection in 5 seconds...');
            setTimeout(connectToDatabase, 5000);
        } else {
            console.log('✅ Connected to MySQL database');
        }
    });
};

connectToDatabase();

// Handle database disconnection
db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconnecting to database...');
        connectToDatabase();
    }
});

// Judge0 API Configuration
const JUDGE0_URL = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY || 'your_rapidapi_key';

const LANGUAGES = {
    'cpp': { id: 54, name: 'C++' },
    'c': { id: 50, name: 'C' },
    'python': { id: 71, name: 'Python' },
    'java': { id: 62, name: 'Java' }
};

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'CodeArena API Server',
        version: '1.0.0',
        status: 'Running',
        endpoints: [
            'GET /api/problems - Get all problems',
            'GET /api/problems/:id - Get specific problem with examples',
            'GET /api/problems/:id/template/:language - Get code template',
            'POST /api/submit - Submit code for evaluation',
            'GET /health - Health check'
        ]
    });
});

// Get all problems
app.get('/api/problems', (req, res) => {
    const query = 'SELECT id, title, difficulty FROM problems ORDER BY id';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching problems:', err);
            return res.status(500).json({ error: 'Failed to fetch problems' });
        }
        
        res.json(results);
    });
});

// Get problem with first 3 test cases as examples
app.get('/api/problems/:id', (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid problem ID' });
    }
    
    // Get problem details
    db.query('SELECT * FROM problems WHERE id = ?', [id], (err, problemResults) => {
        if (err) {
            console.error('Error fetching problem:', err);
            return res.status(500).json({ error: 'Failed to fetch problem' });
        }
        
        if (!problemResults[0]) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        let problem = problemResults[0];
        
        // Parse JSON parameters if they exist
        if (problem.parameters) {
            try {
                if (typeof problem.parameters === 'string') {
                    problem.parameters = JSON.parse(problem.parameters);
                }
            } catch (parseError) {
                console.error('Failed to parse parameters:', parseError.message);
                problem.parameters = [];
            }
        } else {
            problem.parameters = [];
        }

        // Fetch first 3 test cases as examples
        db.query(
            'SELECT input, expected_output FROM test_cases WHERE problem_id = ? ORDER BY id ASC LIMIT 3',
            [id],
            (testErr, testResults) => {
                if (testErr) {
                    console.error('Failed to fetch test cases:', testErr.message);
                    problem.examples = [];
                } else {
                    // Format test cases as examples with better formatting
                    problem.examples = testResults.map((testCase, index) => {
                        let formattedInput = testCase.input;
                        let explanation = `Example ${index + 1}`;

                        // Format based on problem function name
                        if (problem.function_name === 'twoSum') {
                            const lines = testCase.input.split('\n');
                            if (lines.length >= 2) {
                                formattedInput = `nums = [${lines[0].split(' ').join(',')}], target = ${lines[1]}`;
                                explanation = `Find indices where numbers add up to ${lines[1]}`;
                            }
                        } else if (problem.function_name === 'isValid') {
                            formattedInput = `s = "${testCase.input}"`;
                            explanation = 'Check if parentheses are valid';
                        } else if (problem.function_name === 'lengthOfLongestSubstring') {
                            formattedInput = `s = "${testCase.input}"`;
                            explanation = 'Find length of longest substring without repeating characters';
                        }

                        return {
                            input: formattedInput,
                            output: testCase.expected_output,
                            explanation: explanation
                        };
                    });
                }
                
                res.json(problem);
            }
        );
    });
});

// Generate function templates
const generateFunctionTemplate = (problem, language) => {
    if (!problem || !problem.function_name) {
        return getDefaultTemplate(language);
    }

    const { function_name, parameters, return_type } = problem;
    const params = parameters || [];

    switch (language) {
        case 'cpp':
            const cppParams = params.map(p => {
                const typeMap = {
                    'int[]': 'vector<int>&',
                    'string': 'string',
                    'int': 'int',
                    'bool': 'bool',
                    'ListNode*': 'ListNode*'
                };
                return `${typeMap[p.type] || 'auto'} ${p.name}`;
            }).join(', ');
            
            const cppReturnType = {
                'int[]': 'vector<int>',
                'string': 'string', 
                'int': 'int',
                'bool': 'bool',
                'ListNode*': 'ListNode*'
            }[return_type] || 'auto';

            return `${cppReturnType} ${function_name}(${cppParams}) {
    // Write your code here
    
}`;

        case 'python':
            const pythonParams = params.map(p => {
                const typeMap = {
                    'int[]': 'List[int]',
                    'string': 'str',
                    'int': 'int', 
                    'bool': 'bool',
                    'ListNode*': 'Optional[ListNode]'
                };
                return `${p.name}: ${typeMap[p.type] || 'Any'}`;
            }).join(', ');
            
            const pythonReturnType = {
                'int[]': 'List[int]',
                'string': 'str',
                'int': 'int',
                'bool': 'bool', 
                'ListNode*': 'Optional[ListNode]'
            }[return_type] || 'Any';

            return `def ${function_name}(self, ${pythonParams}) -> ${pythonReturnType}:
    # Write your code here
    pass`;

        case 'java':
            const javaParams = params.map(p => {
                const typeMap = {
                    'int[]': 'int[]',
                    'string': 'String',
                    'int': 'int',
                    'bool': 'boolean',
                    'ListNode*': 'ListNode'
                };
                return `${typeMap[p.type] || 'Object'} ${p.name}`;
            }).join(', ');
            
            const javaReturnType = {
                'int[]': 'int[]',
                'string': 'String',
                'int': 'int',
                'bool': 'boolean',
                'ListNode*': 'ListNode'
            }[return_type] || 'Object';

            return `public ${javaReturnType} ${function_name}(${javaParams}) {
    // Write your code here
    
}`;

        case 'c':
            return `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your C code here
    
    return 0;
}`;

        default:
            return getDefaultTemplate(language);
    }
};

// Default templates
const getDefaultTemplate = (language) => {
    const templates = {
        cpp: `// Write your C++ code here
int main() {
    
    return 0;
}`,
        python: `# Write your Python code here
def solution():
    pass`,
        java: `// Write your Java code here
public class Solution {
    
}`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    
    return 0;
}`
    };
    
    return templates[language] || '// Write your code here';
};

// Get code template
app.get('/api/problems/:id/template/:language', (req, res) => {
    const { id, language } = req.params;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid problem ID' });
    }
    
    if (!LANGUAGES[language]) {
        return res.status(400).json({ error: 'Unsupported language' });
    }
    
    db.query('SELECT * FROM problems WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching problem for template:', err);
            return res.status(500).json({ error: 'Failed to fetch problem' });
        }
        
        let problem = results[0];
        
        if (problem && problem.parameters) {
            try {
                if (typeof problem.parameters === 'string') {
                    problem.parameters = JSON.parse(problem.parameters);
                }
            } catch (parseError) {
                console.error('Failed to parse parameters:', parseError.message);
                problem.parameters = [];
            }
        }

        const template = generateFunctionTemplate(problem, language);
        res.json({ template });
    });
});

// Execute code with Judge0
const executeWithJudge0 = async (code, languageId, input = '') => {
    try {
        if (!API_KEY || API_KEY === 'your_rapidapi_key') {
            throw new Error('Judge0 API key not configured. Please set RAPIDAPI_KEY environment variable.');
        }

        const response = await axios.post(
            `${JUDGE0_URL}/submissions`,
            {
                source_code: code,
                language_id: languageId,
                stdin: input
            },
            {
                headers: {
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                    'X-RapidAPI-Key': API_KEY,
                    'Content-Type': 'application/json'
                },
                params: { wait: 'true' },
                timeout: 30000
            }
        );
        return response.data;
    } catch (apiError) {
        console.error('Judge0 API Error:', apiError.response?.data || apiError.message);
        
        if (apiError.response?.status === 401) {
            throw new Error('Invalid Judge0 API key. Please check your RapidAPI key.');
        } else if (apiError.response?.status === 429) {
            throw new Error('Judge0 API rate limit exceeded. Please try again later.');
        } else if (apiError.code === 'ECONNABORTED') {
            throw new Error('Code execution timeout. Please optimize your code.');
        }
        
        throw new Error('Code execution failed: ' + (apiError.response?.data?.message || apiError.message));
    }
};

// Generate test function calls based on problem
const generateTestCall = (problem, inputLines, language) => {
    const { function_name } = problem;

    if (function_name === 'twoSum') {
        const nums = inputLines[0] ? inputLines[0].split(' ').map(x => x.trim()) : [];
        const target = inputLines[1] || '0';
        
        switch (language) {
            case 'cpp':
                return `vector<int> nums = {${nums.join(', ')}};
    int target = ${target};
    Solution solution;
    vector<int> result = solution.${function_name}(nums, target);
    for(int i = 0; i < result.size(); i++) {
        cout << result[i];
        if(i < result.size() - 1) cout << " ";
    }`;
            
            case 'python':
                return `nums = [${nums.join(', ')}]
    target = ${target}
    solution = Solution()
    result = solution.${function_name}(nums, target)
    print(' '.join(map(str, result)))`;
            
            case 'java':
                return `int[] nums = {${nums.join(', ')}};
    int target = ${target};
    Solution solution = new Solution();
    int[] result = solution.${function_name}(nums, target);
    for(int i = 0; i < result.length; i++) {
        System.out.print(result[i]);
        if(i < result.length - 1) System.out.print(" ");
    }`;
        }
    } else if (function_name === 'isValid') {
        const input = inputLines[0] || '';
        
        switch (language) {
            case 'cpp':
                return `string s = "${input}";
    Solution solution;
    bool result = solution.${function_name}(s);
    cout << (result ? "true" : "false");`;
            
            case 'python':
                return `s = "${input}"
    solution = Solution()
    result = solution.${function_name}(s)
    print("true" if result else "false")`;
            
            case 'java':
                return `String s = "${input}";
    Solution solution = new Solution();
    boolean result = solution.${function_name}(s);
    System.out.print(result ? "true" : "false");`;
        }
    }

    return '// Default test implementation needed';
};

// Wrap user function with complete class/main structure
const wrapUserFunction = (userFunction, problem, testInput, language) => {
    const inputLines = testInput.split('\n');

    switch (language) {
        case 'cpp':
            return `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <stack>
#include <algorithm>
using namespace std;

class Solution {
public:
    ${userFunction}
};

int main() {
    ${generateTestCall(problem, inputLines, 'cpp')}
    return 0;
}`;

        case 'python':
            return `class Solution:
    ${userFunction.split('\n').join('\n    ')}

if __name__ == "__main__":
    ${generateTestCall(problem, inputLines, 'python')}`;

        case 'java':
            return `import java.util.*;

class Solution {
    ${userFunction}
}

public class Main {
    public static void main(String[] args) {
        ${generateTestCall(problem, inputLines, 'java')}
    }
}`;

        case 'c':
            return userFunction; // For C, assume user provides complete program

        default:
            return userFunction;
    }
};

// Submit code endpoint
app.post('/api/submit', async (req, res) => {
    const { problemId, code, language } = req.body;
    const startTime = Date.now();

    try {
        // Validate input
        if (!problemId || !code || !language) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                required: ['problemId', 'code', 'language']
            });
        }

        if (!LANGUAGES[language]) {
            return res.status(400).json({ 
                error: 'Unsupported language',
                supported: Object.keys(LANGUAGES)
            });
        }

        // Get problem details
        const problem = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM problems WHERE id = ?', [problemId], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (results[0] && results[0].parameters) {
                    try {
                        results[0].parameters = JSON.parse(results[0].parameters);
                    } catch (parseError) {
                        console.error('Failed to parse parameters:', parseError.message);
                        results[0].parameters = [];
                    }
                }
                resolve(results[0]);
            });
        });

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Get test cases
        const testCases = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM test_cases WHERE problem_id = ? ORDER BY id', [problemId], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });

        if (testCases.length === 0) {
            return res.status(404).json({ error: 'No test cases found for this problem' });
        }

        let verdict = 'Accepted';
        let passedTests = 0;
        let failedCase = null;
        let executionTime = 0;
        let maxMemory = 0;

        // Run against test cases
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const completeCode = wrapUserFunction(code, problem, testCase.input, language);
            
            try {
                const result = await executeWithJudge0(completeCode, LANGUAGES[language].id, testCase.input);
                
                executionTime = Math.max(executionTime, parseFloat(result.time || 0));
                maxMemory = Math.max(maxMemory, parseInt(result.memory || 0));

                if (result.status.id === 3) { // Success
                    const expected = testCase.expected_output.trim();
                    const actual = (result.stdout || '').trim();
                    
                    if (expected === actual) {
                        passedTests++;
                    } else {
                        verdict = 'Wrong Answer';
                        failedCase = {
                            testNumber: i + 1,
                            input: testCase.input,
                            expected: expected,
                            actual: actual
                        };
                        break;
                    }
                } else if (result.status.id === 6) {
                    verdict = 'Compilation Error';
                    failedCase = { error: result.compile_output || 'Compilation failed' };
                    break;
                } else if (result.status.id === 5) {
                    verdict = 'Time Limit Exceeded';
                    failedCase = { error: 'Your code took too long to execute' };
                    break;
                } else {
                    verdict = 'Runtime Error';
                    failedCase = { error: result.stderr || 'Runtime error occurred' };
                    break;
                }
            } catch (execError) {
                console.error('Execution error:', execError.message);
                verdict = 'System Error';
                failedCase = { error: execError.message };
                break;
            }
        }

        const runtime = Math.max(executionTime * 1000, Date.now() - startTime);

        // Save submission
        db.query(
            'INSERT INTO submissions (problem_id, code, language, verdict, runtime, memory_used, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [problemId, code, language, verdict, Math.round(runtime), maxMemory],
            (saveError) => {
                if (saveError) {
                    console.error('Failed to save submission:', saveError.message);
                }
            }
        );

        res.json({
            verdict,
            runtime: Math.round(runtime),
            memory: maxMemory,
            passedTests,
            totalTests: testCases.length,
            failedCase,
            submissionId: Math.floor(Math.random() * 1000000) // Simplified ID
        });

    } catch (submitError) {
        console.error('Submit error:', submitError.message);
        res.status(500).json({
            verdict: 'System Error',
            error: submitError.message,
            runtime: Date.now() - startTime
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected',
        apiKeyConfigured: API_KEY !== 'your_rapidapi_key',
        version: '1.0.0'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'Something went wrong' : err.message
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    db.end(() => {
        console.log('Database connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    db.end(() => {
        console.log('Database connection closed');
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 CodeArena Server running on port ${PORT}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔤 Supported languages: ${Object.keys(LANGUAGES).join(', ')}`);
    
    if (API_KEY === 'your_rapidapi_key') {
        console.log('⚠️  WARNING: Please set your RAPIDAPI_KEY environment variable!');
    } else {
        console.log('✅ Judge0 API key configured');
    }
});

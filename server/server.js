const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const axios = require('axios');

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

// Database connection for your InfinityFree database
const dbConfig = {
    host: process.env.DB_HOST || 'sql210.infinityfree.com',
    user: process.env.DB_USER || 'if0_39766082',
    password: process.env.DB_PASSWORD || 'K0RataBiN4wy9',
    database: process.env.DB_NAME || 'if0_39766082_judge',
    port: process.env.DB_PORT || 3306,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4',
    // InfinityFree specific settings
    ssl: false,
    multipleStatements: false
};

const db = mysql.createConnection(dbConfig);

// Database connection with retry logic
const connectToDatabase = () => {
    db.connect((err) => {
        if (err) {
            console.error('❌ Database connection failed:', err.message);
            console.error('Connection details:', {
                host: dbConfig.host,
                user: dbConfig.user,
                database: dbConfig.database,
                port: dbConfig.port
            });
            
            if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error('❌ Check your InfinityFree database credentials');
            } else if (err.code === 'ECONNREFUSED') {
                console.error('❌ InfinityFree database server not reachable');
            } else if (err.code === 'ER_BAD_DB_ERROR') {
                console.error('❌ Database if0_39766082_judge does not exist');
            }
            
            console.log('🔄 Retrying database connection in 10 seconds...');
            setTimeout(connectToDatabase, 10000);
        } else {
            console.log('✅ Connected to InfinityFree MySQL database');
            console.log(`📊 Database: ${dbConfig.database}`);
            console.log(`🖥️  Host: ${dbConfig.host}`);
            console.log(`👤 User: ${dbConfig.user}`);
        }
    });
};

connectToDatabase();

// Handle database disconnection
db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Reconnecting to InfinityFree database...');
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
        message: 'CodeArena API Server - Powered by InfinityFree',
        version: '1.0.0',
        status: 'Running',
        database: {
            provider: 'InfinityFree MySQL',
            host: 'sql210.infinityfree.com',
            database: 'if0_39766082_judge'
        },
        features: [
            'Multi-language code execution (C++, Python, Java, C)',
            'Automatic test case examples from database',
            'Real-time code evaluation with Judge0',
            'Comprehensive problem database',
            'Submission tracking and statistics'
        ],
        endpoints: [
            'GET /api/problems - Get all problems with stats',
            'GET /api/problems/:id - Get specific problem with examples',
            'GET /api/problems/:id/template/:language - Get code template',
            'POST /api/submit - Submit code for evaluation',
            'GET /health - Health check with database verification',
            'GET /stats - Platform statistics',
            'GET /test-db - Database connection test',
            'GET /api/recent-submissions - Recent submissions'
        ]
    });
});

// Get all problems with submission statistics
app.get('/api/problems', (req, res) => {
    const query = `
        SELECT 
            p.id, 
            p.title, 
            p.difficulty,
            COUNT(s.id) as submission_count,
            COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) as accepted_count
        FROM problems p
        LEFT JOIN submissions s ON p.id = s.problem_id
        GROUP BY p.id, p.title, p.difficulty
        ORDER BY p.id
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching problems:', err);
            return res.status(500).json({ 
                error: 'Failed to fetch problems from database',
                details: isProduction ? null : err.message
            });
        }
        
        // Calculate acceptance rate for each problem
        const problemsWithStats = results.map(problem => ({
            ...problem,
            acceptance_rate: problem.submission_count > 0 
                ? Math.round((problem.accepted_count / problem.submission_count) * 100)
                : 0
        }));
        
        res.json({
            problems: problemsWithStats,
            total_problems: problemsWithStats.length,
            timestamp: new Date().toISOString()
        });
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
            return res.status(500).json({ 
                error: 'Failed to fetch problem',
                details: isProduction ? null : err.message
            });
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

        // Fetch first 3 test cases as examples (only non-hidden ones)
        db.query(
            'SELECT input, expected_output FROM test_cases WHERE problem_id = ? AND is_hidden = FALSE ORDER BY id ASC LIMIT 3',
            [id],
            (testErr, testResults) => {
                if (testErr) {
                    console.error('Failed to fetch test cases:', testErr.message);
                    problem.examples = [];
                } else {
                    // Format test cases as examples with enhanced formatting
                    problem.examples = testResults.map((testCase, index) => {
                        let formattedInput = testCase.input;
                        let explanation = `Example ${index + 1}`;

                        // Enhanced formatting based on problem function name
                        if (problem.function_name === 'twoSum') {
                            const lines = testCase.input.split('\n');
                            if (lines.length >= 2) {
                                const nums = lines[0].split(' ').join(',');
                                formattedInput = `nums = [${nums}], target = ${lines[1]}`;
                                explanation = `Find indices of two numbers that add up to ${lines[1]}`;
                            }
                        } else if (problem.function_name === 'isValid') {
                            formattedInput = `s = "${testCase.input}"`;
                            explanation = 'Check if the parentheses string is valid';
                        } else if (problem.function_name === 'lengthOfLongestSubstring') {
                            formattedInput = `s = "${testCase.input}"`;
                            explanation = 'Find length of longest substring without repeating characters';
                        } else if (problem.function_name === 'maxSubArray') {
                            const nums = testCase.input.split(' ').join(',');
                            formattedInput = `nums = [${nums}]`;
                            explanation = 'Find the maximum sum of contiguous subarray';
                        } else if (problem.function_name === 'addTwoNumbers') {
                            const lines = testCase.input.split('\n');
                            if (lines.length >= 2) {
                                formattedInput = `l1 = [${lines[0].split(' ').join(',')}], l2 = [${lines[1].split(' ').join(',')}]`;
                                explanation = 'Add two numbers represented as linked lists';
                            }
                        }

                        return {
                            input: formattedInput,
                            output: testCase.expected_output,
                            explanation: explanation
                        };
                    });
                }
                
                // Also get submission statistics for this problem
                db.query(
                    'SELECT COUNT(*) as total_submissions, COUNT(CASE WHEN verdict = "Accepted" THEN 1 END) as accepted_submissions FROM submissions WHERE problem_id = ?',
                    [id],
                    (statsErr, statsResults) => {
                        if (!statsErr && statsResults[0]) {
                            problem.submission_stats = {
                                total_submissions: statsResults[0].total_submissions,
                                accepted_submissions: statsResults[0].accepted_submissions,
                                acceptance_rate: statsResults[0].total_submissions > 0 
                                    ? Math.round((statsResults[0].accepted_submissions / statsResults[0].total_submissions) * 100)
                                    : 0
                            };
                        }
                        
                        res.json(problem);
                    }
                );
            }
        );
    });
});

// Generate function templates with comprehensive language support
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
    // Write your C++ solution here
    
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
    # Write your Python solution here
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
    // Write your Java solution here
    
}`;

        case 'c':
            return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

int main() {
    // Write your C solution here
    
    return 0;
}`;

        default:
            return getDefaultTemplate(language);
    }
};

// Enhanced default templates
const getDefaultTemplate = (language) => {
    const templates = {
        cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // Write your C++ code here
    
    return 0;
}`,
        python: `# Write your Python code here
def solution():
    pass

if __name__ == "__main__":
    solution()`,
        java: `import java.util.*;

public class Solution {
    // Write your Java code here
    
    public static void main(String[] args) {
        
    }
}`,
        c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

int main() {
    // Write your C code here
    
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
        return res.status(400).json({ 
            error: 'Unsupported language',
            supported: Object.keys(LANGUAGES)
        });
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
        res.json({ 
            template,
            language: LANGUAGES[language].name,
            problem_id: id,
            problem_title: problem ? problem.title : 'Unknown Problem'
        });
    });
});

// Execute code with Judge0 API
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
                stdin: input,
                wait: true
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

// Generate test function calls
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
    } else if (function_name === 'lengthOfLongestSubstring') {
        const input = inputLines[0] || '';
        
        switch (language) {
            case 'cpp':
                return `string s = "${input}";
    Solution solution;
    int result = solution.${function_name}(s);
    cout << result;`;
            
            case 'python':
                return `s = "${input}"
    solution = Solution()
    result = solution.${function_name}(s)
    print(result)`;
            
            case 'java':
                return `String s = "${input}";
    Solution solution = new Solution();
    int result = solution.${function_name}(s);
    System.out.print(result);`;
        }
    } else if (function_name === 'maxSubArray') {
        const nums = inputLines[0] ? inputLines[0].split(' ').map(x => x.trim()) : [];
        
        switch (language) {
            case 'cpp':
                return `vector<int> nums = {${nums.join(', ')}};
    Solution solution;
    int result = solution.${function_name}(nums);
    cout << result;`;
            
            case 'python':
                return `nums = [${nums.join(', ')}]
    solution = Solution()
    result = solution.${function_name}(nums)
    print(result)`;
            
            case 'java':
                return `int[] nums = {${nums.join(', ')}};
    Solution solution = new Solution();
    int result = solution.${function_name}(nums);
    System.out.print(result);`;
        }
    }

    return '// Test implementation not available for this problem yet';
};

// Wrap user function with complete execution environment
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
#include <climits>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

class Solution {
public:
    ${userFunction}
};

int main() {
    ${generateTestCall(problem, inputLines, 'cpp')}
    return 0;
}`;

        case 'python':
            return `from typing import List, Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    ${userFunction.split('\n').join('\n    ')}

if __name__ == "__main__":
    ${generateTestCall(problem, inputLines, 'python')}`;

        case 'java':
            return `import java.util.*;

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class Solution {
    ${userFunction}
}

public class Main {
    public static void main(String[] args) {
        ${generateTestCall(problem, inputLines, 'java')}
    }
}`;

        case 'c':
            return userFunction; // For C, assume complete program

        default:
            return userFunction;
    }
};

// Submit code endpoint
app.post('/api/submit', async (req, res) => {
    const { problemId, code, language } = req.body;
    const startTime = Date.now();

    try {
        // Enhanced input validation
        if (!problemId || !code || !language) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                required: ['problemId', 'code', 'language'],
                received: { problemId: !!problemId, code: !!code, language: !!language }
            });
        }

        if (!LANGUAGES[language]) {
            return res.status(400).json({ 
                error: 'Unsupported language',
                supported: Object.keys(LANGUAGES),
                received: language
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

        // Get all test cases
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

        // Run against all test cases
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const completeCode = wrapUserFunction(code, problem, testCase.input, language);
            
            try {
                const result = await executeWithJudge0(completeCode, LANGUAGES[language].id, testCase.input);
                
                executionTime = Math.max(executionTime, parseFloat(result.time || 0));
                maxMemory = Math.max(maxMemory, parseInt(result.memory || 0));

                if (result.status.id === 3) { // Accepted
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
                            actual: actual,
                            isHidden: testCase.is_hidden
                        };
                        break;
                    }
                } else if (result.status.id === 6) {
                    verdict = 'Compilation Error';
                    failedCase = { 
                        error: result.compile_output || 'Compilation failed',
                        testNumber: i + 1
                    };
                    break;
                } else if (result.status.id === 5) {
                    verdict = 'Time Limit Exceeded';
                    failedCase = { 
                        error: 'Your code took too long to execute',
                        testNumber: i + 1
                    };
                    break;
                } else {
                    verdict = 'Runtime Error';
                    failedCase = { 
                        error: result.stderr || 'Runtime error occurred',
                        testNumber: i + 1
                    };
                    break;
                }
            } catch (execError) {
                console.error('Execution error:', execError.message);
                verdict = 'System Error';
                failedCase = { 
                    error: execError.message,
                    testNumber: i + 1
                };
                break;
            }
        }

        const runtime = Math.max(executionTime * 1000, Date.now() - startTime);

        // Save submission to InfinityFree database
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
            submissionId: Math.floor(Math.random() * 1000000),
            language: LANGUAGES[language].name,
            problemTitle: problem.title,
            timestamp: new Date().toISOString()
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

// Platform statistics
app.get('/stats', (req, res) => {
    const statsQuery = `
        SELECT 
            (SELECT COUNT(*) FROM problems) as total_problems,
            (SELECT COUNT(*) FROM submissions) as total_submissions,
            (SELECT COUNT(*) FROM submissions WHERE verdict = 'Accepted') as accepted_submissions,
            (SELECT COUNT(DISTINCT problem_id) FROM submissions) as attempted_problems,
            (SELECT COUNT(*) FROM problems WHERE difficulty = 'Easy') as easy_problems,
            (SELECT COUNT(*) FROM problems WHERE difficulty = 'Medium') as medium_problems,
            (SELECT COUNT(*) FROM problems WHERE difficulty = 'Hard') as hard_problems
    `;
    
    db.query(statsQuery, (err, results) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        
        const stats = results[0];
        const acceptanceRate = stats.total_submissions > 0 
            ? Math.round((stats.accepted_submissions / stats.total_submissions) * 100)
            : 0;
            
        res.json({
            ...stats,
            acceptance_rate: acceptanceRate,
            problems_by_difficulty: {
                easy: stats.easy_problems,
                medium: stats.medium_problems,
                hard: stats.hard_problems
            },
            database: 'InfinityFree MySQL (if0_39766082_judge)',
            last_updated: new Date().toISOString()
        });
    });
});

// Recent submissions
app.get('/api/recent-submissions', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    const query = `
        SELECT 
            s.id,
            s.verdict,
            s.language,
            s.runtime,
            s.memory_used,
            s.created_at,
            p.title as problem_title,
            p.difficulty,
            p.id as problem_id
        FROM submissions s
        JOIN problems p ON s.problem_id = p.id
        ORDER BY s.created_at DESC
        LIMIT ?
    `;
    
    db.query(query, [limit], (err, results) => {
        if (err) {
            console.error('Error fetching recent submissions:', err);
            return res.status(500).json({ error: 'Failed to fetch recent submissions' });
        }
        
        res.json({
            submissions: results,
            total_returned: results.length,
            timestamp: new Date().toISOString()
        });
    });
});

// Health check with comprehensive database verification
app.get('/health', (req, res) => {
    // Test database connection and get comprehensive stats
    const healthQuery = `
        SELECT 
            (SELECT COUNT(*) FROM problems) as problem_count,
            (SELECT COUNT(*) FROM submissions) as submission_count,
            (SELECT COUNT(*) FROM test_cases) as test_case_count,
            (SELECT COUNT(*) FROM users) as user_count
    `;
    
    db.query(healthQuery, (err, results) => {
        if (err) {
            res.status(500).json({
                status: 'ERROR',
                database: {
                    provider: 'InfinityFree MySQL',
                    host: 'sql210.infinityfree.com',
                    database: 'if0_39766082_judge',
                    status: 'Connection Failed'
                },
                error: err.message,
                timestamp: new Date().toISOString()
            });
        } else {
            const stats = results[0];
            res.json({ 
                status: 'OK',
                database: {
                    provider: 'InfinityFree MySQL',
                    host: 'sql210.infinityfree.com',
                    database: 'if0_39766082_judge',
                    status: 'Connected'
                },
                stats: {
                    problems: stats.problem_count,
                    submissions: stats.submission_count,
                    test_cases: stats.test_case_count,
                    users: stats.user_count
                },
                server: {
                    environment: process.env.NODE_ENV || 'development',
                    uptime: Math.floor(process.uptime()),
                    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
                },
                apis: {
                    judge0_configured: API_KEY !== 'your_rapidapi_key',
                    supported_languages: Object.keys(LANGUAGES)
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        }
    });
});

// Database connection test
app.get('/test-db', (req, res) => {
    db.query('SELECT id, title, difficulty FROM problems LIMIT 5', (err, results) => {
        if (err) {
            res.status(500).json({ 
                status: 'Database connection failed',
                error: err.message,
                connection_details: {
                    host: 'sql210.infinityfree.com',
                    database: 'if0_39766082_judge',
                    user: 'if0_39766082'
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                status: 'Database connection successful',
                connection_details: {
                    host: 'sql210.infinityfree.com',
                    database: 'if0_39766082_judge',
                    user: 'if0_39766082',
                    charset: 'utf8mb4'
                },
                sample_problems: results,
                total_found: results.length,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
            'GET / - API information',
            'GET /api/problems - List all problems',
            'GET /api/problems/:id - Get specific problem',
            'GET /api/problems/:id/template/:language - Get code template',
            'POST /api/submit - Submit solution',
            'GET /health - Health check',
            'GET /stats - Platform statistics',
            'GET /test-db - Database test',
            'GET /api/recent-submissions - Recent submissions'
        ],
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'Something went wrong' : err.message,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    db.end(() => {
        console.log('InfinityFree database connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    db.end(() => {
        console.log('InfinityFree database connection closed');
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 ===== CODEARENA SERVER STARTED =====');
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🖥️  Running on port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('\n🗄️  DATABASE CONNECTION:');
    console.log(`   Provider: InfinityFree MySQL`);
    console.log(`   Host: sql210.infinityfree.com`);
    console.log(`   Database: if0_39766082_judge`);
    console.log(`   User: if0_39766082`);
    
    console.log('\n🔗 API ENDPOINTS:');
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Database Test: http://localhost:${PORT}/test-db`);
    console.log(`   Statistics: http://localhost:${PORT}/stats`);
    console.log(`   Problems API: http://localhost:${PORT}/api/problems`);
    
    console.log('\n🔤 SUPPORTED LANGUAGES:');
    console.log(`   ${Object.keys(LANGUAGES).join(', ')}`);
    
    console.log('\n⚡ JUDGE0 API:');
    if (API_KEY === 'your_rapidapi_key') {
        console.log('   ❌ WARNING: Please set your RAPIDAPI_KEY environment variable!');
    } else {
        console.log('   ✅ API key configured and ready');
    }
    
    console.log('\n🎯 CodeArena is ready to serve coding challenges!');
    console.log('=====================================\n');
});

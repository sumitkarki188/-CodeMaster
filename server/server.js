const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'abcd',
    database: 'judge'
});

// Test database connection
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

// Judge0 API Configuration
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
const API_KEY = 'your_rapidapi_key'; // Replace with your actual RapidAPI key

const LANGUAGES = {
    'cpp': { id: 54, name: 'C++' },
    'c': { id: 50, name: 'C' },
    'python': { id: 71, name: 'Python' },
    'java': { id: 62, name: 'Java' }
};

// Get all problems
app.get('/api/problems', (req, res) => {
    db.query('SELECT id, title, difficulty FROM problems ORDER BY id', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get problem with first 3 test cases as examples
app.get('/api/problems/:id', (req, res) => {
    const { id } = req.params;
    
    // Get problem details
    db.query('SELECT * FROM problems WHERE id = ?', [id], (err, problemResults) => {
        if (err) return res.status(500).json({ error: err.message });
        
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
                        let explanation = `Example ${index + 1} test case`;

                        // Format based on problem function name
                        if (problem.function_name === 'twoSum') {
                            const lines = testCase.input.split('\n');
                            if (lines.length >= 2) {
                                formattedInput = `nums = [${lines[0].split(' ').join(',')}], target = ${lines[1]}`;
                                explanation = `Find two numbers that add up to ${lines[1]}`;
                            }
                        } else if (problem.function_name === 'isValid') {
                            formattedInput = `s = "${testCase.input}"`;
                            explanation = 'Check if parentheses are valid';
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

// Generate simple function templates (just the function signature)
const generateFunctionTemplate = (problem, language) => {
    if (!problem) return '';

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
            return '// Write your function here';
    }
};

// Get code template
app.get('/api/problems/:id/template/:language', async (req, res) => {
    const { id, language } = req.params;
    
    try {
        const problem = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM problems WHERE id = ?', [id], (err, results) => {
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

        const template = generateFunctionTemplate(problem, language);
        res.json({ template });
    } catch (dbError) {
        res.status(500).json({ error: dbError.message });
    }
});

// Execute code with Judge0
const executeWithJudge0 = async (code, languageId, input = '') => {
    try {
        if (API_KEY === 'your_rapidapi_key') {
            throw new Error('Please set your RapidAPI key in the server configuration');
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
                timeout: 30000 // 30 second timeout
            }
        );
        return response.data;
    } catch (apiError) {
        console.error('Judge0 API Error:', apiError.response?.data || apiError.message);
        if (apiError.response?.status === 401) {
            throw new Error('Invalid API key. Please check your RapidAPI key.');
        } else if (apiError.response?.status === 429) {
            throw new Error('API rate limit exceeded. Please try again later.');
        }
        throw new Error('Code execution failed: ' + (apiError.response?.data?.message || apiError.message));
    }
};

// Generate test function calls based on problem
const generateTestCall = (problem, inputLines, language) => {
    const { function_name } = problem;

    if (function_name === 'twoSum') {
        const nums = inputLines[0].split(' ').map(x => x.trim());
        const target = inputLines[1];
        
        switch (language) {
            case 'cpp':
                return `vector<int> nums = {${nums.join(', ')}};
    int target = ${target};
    Solution solution;
    vector<int> result = solution.${function_name}(nums, target);
    cout << result[0] << " " << result[1] << endl;`;
            
            case 'python':
                return `nums = [${nums.join(', ')}]
    target = ${target}
    solution = Solution()
    result = solution.${function_name}(nums, target)
    print(result[0], result[1])`;
            
            case 'java':
                return `int[] nums = {${nums.join(', ')}};
    int target = ${target};
    Solution solution = new Solution();
    int[] result = solution.${function_name}(nums, target);
    System.out.println(result[0] + " " + result[1]);`;
        }
    } else if (function_name === 'isValid') {
        const input = inputLines[0];
        
        switch (language) {
            case 'cpp':
                return `string s = "${input}";
    Solution solution;
    bool result = solution.${function_name}(s);
    cout << (result ? "true" : "false") << endl;`;
            
            case 'python':
                return `s = "${input}"
    solution = Solution()
    result = solution.${function_name}(s)
    print("true" if result else "false")`;
            
            case 'java':
                return `String s = "${input}";
    Solution solution = new Solution();
    boolean result = solution.${function_name}(s);
    System.out.println(result ? "true" : "false");`;
        }
    } else if (function_name === 'lengthOfLongestSubstring') {
        const input = inputLines[0];
        
        switch (language) {
            case 'cpp':
                return `string s = "${input}";
    Solution solution;
    int result = solution.${function_name}(s);
    cout << result << endl;`;
            
            case 'python':
                return `s = "${input}"
    solution = Solution()
    result = solution.${function_name}(s)
    print(result)`;
            
            case 'java':
                return `String s = "${input}";
    Solution solution = new Solution();
    int result = solution.${function_name}(s);
    System.out.println(result);`;
        }
    } else if (function_name === 'maxSubArray') {
        const nums = inputLines[0].split(' ').map(x => x.trim());
        
        switch (language) {
            case 'cpp':
                return `vector<int> nums = {${nums.join(', ')}};
    Solution solution;
    int result = solution.${function_name}(nums);
    cout << result << endl;`;
            
            case 'python':
                return `nums = [${nums.join(', ')}]
    solution = Solution()
    result = solution.${function_name}(nums)
    print(result)`;
            
            case 'java':
                return `int[] nums = {${nums.join(', ')}};
    Solution solution = new Solution();
    int result = solution.${function_name}(nums);
    System.out.println(result);`;
        }
    }

    return '// Test case not implemented';
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
            return `#include <stdio.h>
#include <stdlib.h>

${userFunction}`;

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
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        if (!LANGUAGES[language]) {
            return res.status(400).json({ error: 'Unsupported language' });
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
            db.query('SELECT * FROM test_cases WHERE problem_id = ?', [problemId], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results);
            });
        });

        if (testCases.length === 0) {
            return res.status(404).json({ error: 'No test cases found' });
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
                const result = await executeWithJudge0(completeCode, LANGUAGES[language].id);
                
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
                    failedCase = { error: result.compile_output };
                    break;
                } else if (result.status.id === 5) {
                    verdict = 'Time Limit Exceeded';
                    break;
                } else {
                    verdict = 'Runtime Error';
                    failedCase = { error: result.stderr };
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
            'INSERT INTO submissions (problem_id, code, language, verdict, runtime, memory_used) VALUES (?, ?, ?, ?, ?, ?)',
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
            failedCase
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
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        apiKeyConfigured: API_KEY !== 'your_rapidapi_key'
    });
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
    console.log('Supported languages:', Object.keys(LANGUAGES));
    if (API_KEY === 'your_rapidapi_key') {
        console.log('⚠️  WARNING: Please set your RapidAPI key!');
    } else {
        console.log('✅ API key configured');
    }
});

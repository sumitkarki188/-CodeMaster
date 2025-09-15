# 🏆 Code Master - Online Judge Platform




## 🎯 About The Project

**Code Master** is a modern, full-stack online judge platform that allows users to solve coding problems in multiple programming languages. It provides real-time code execution, comprehensive problem management, and detailed submission tracking - similar to LeetCode or HackerRank.

### 🌟 Why Code Master?

- **Multi-Language Support**: Write solutions in C++, Python, Java, and C
- **Real-Time Execution**: Instant code evaluation with detailed feedback
- **Professional UI/UX**: Clean, responsive interface built with React
- **Scalable Architecture**: Microservices architecture ready for production
- **Free to Use**: Deployed on free tier services, accessible to everyone

## ✨ Features

### 🔥 Core Features
- **Problem Solving**: Browse and solve coding challenges of varying difficulty
- **Code Editor**: Built-in code editor with syntax highlighting
- **Multi-Language Execution**: Support for C++, Python, Java, and C
- **Real-Time Testing**: Instant feedback with test case results
- **Submission Tracking**: Complete history of submissions with verdicts

### 📊 Platform Features
- **Problem Management**: CRUD operations for coding problems
- **Test Case Management**: Multiple test cases per problem with hidden cases
- **Statistics Dashboard**: Platform-wide statistics and analytics
- **Responsive Design**: Works seamlessly on desktop and mobile
- **RESTful API**: Well-documented API for all operations

### 🎨 User Experience
- **Clean Interface**: Modern, intuitive design
- **Fast Performance**: Optimized for speed and responsiveness
- **Error Handling**: Comprehensive error messages and graceful failures
- **Loading States**: Professional loading indicators and status updates

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Styling**: CSS3 with Flexbox/Grid
- **Build Tool**: Vite
- **Deployment**: Render (Static Site)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: mysql2 (Raw SQL)
- **Code Execution**: Judge0 API
- **CORS**: Enabled for cross-origin requests
- **Deployment**: Render (Web Service)


🖥️ How to Run Code Master Locally
📋 Prerequisites
bash
# Check if you have these installed:
node --version    # Need v16+
npm --version     # Comes with Node.js
mysql --version   # Need MySQL 8+
git --version     # For cloning repo
🚀 Quick Setup Commands
1. Clone & Install
bash
# Clone the project
git clone https://github.com/yourusername/code-master.git
cd code-master

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
2. Setup Database
bash
# Connect to MySQL
mysql -u root -p

# Create database and tables
CREATE DATABASE code_master_db;
USE code_master_db;

# Run the table creation SQL (copy from setup section above)
# Then add sample data and exit MySQL
3. Configure Environment
bash
# Backend .env file (server/.env)
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=code_master_db
DB_PORT=3306
RAPIDAPI_KEY=your_judge0_api_key

# Frontend .env file (client/.env)
VITE_API_URL=http://localhost:5000
4. Start Both Servers
bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
cd client
npm run dev
5. Access Application
Frontend: http://localhost:3000

Backend API: http://localhost:5000

Health Check: http://localhost:5000/health

✅ That's It!
Your Code Master platform should now be running locally with:

React frontend on port 3000

Express backend on port 5000

MySQL database with sample problems

Judge0 API integration for code execution

If you see connection errors, check that MySQL is running and credentials are correct in the .env files.


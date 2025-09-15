# 🏆 Code Master - Online Judge Platform




## 🎯 About The Project

**Code Master** is a modern, full-stack online judge platform that allows users to solve coding problems in multiple programming languages. It provides real-time code execution, comprehensive problem management, and detailed submission tracking - similar to LeetCode or HackerRank.


![Code Master Logo](screenshots/front.png)

![question Logo](screenshots/problem.png)

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

## 📋 Prerequisites

Install these on Windows (or macOS/Linux):

- **Node.js** v16+ → [Download](https://nodejs.org)  
- **MySQL** 8.0+ → [Download](https://dev.mysql.com/downloads/mysql/)  
- **Git** (optional) → [Download](https://git-scm.com)  

Verify installation:

```bash
node --version
npm --version
mysql --version
git --version
```

---

## 📁 Project Structure

```
code-master/
├── client/        # React frontend
├── server/        # Express backend
├── package.json   # root scripts to start both
├── README.md
```

---

## 🛠 Database Setup

Open MySQL shell:

```bash
mysql -u root -p
```

Run:

```sql
CREATE DATABASE IF NOT EXISTS code_master_db;
USE code_master_db;

CREATE TABLE problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty ENUM('Easy','Medium','Hard') DEFAULT 'Easy',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  problem_id INT NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE TABLE submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  problem_id INT NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(20) NOT NULL,
  verdict VARCHAR(50) DEFAULT 'Pending',
  runtime INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

-- Sample problems
INSERT INTO problems (title, description, difficulty) VALUES
('Two Sum', 'Find two numbers that add up to target', 'Easy'),
('Valid Parentheses', 'Check if parentheses are balanced', 'Easy');

INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
(1, '2 7 11 15\n9', '0 1', FALSE),
(2, '()', 'true', FALSE);
```

Exit:

```sql
EXIT;
```

---

## 🔐 Environment Configuration

**Backend → `server/.env`:**

```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=code_master_db
DB_PORT=3306
RAPIDAPI_KEY=your_judge0_api_key
```

**Frontend → `client/.env`:**

```
VITE_API_URL=http://localhost:5000
VITE_ENVIRONMENT=development
```

---

## 🚀 Installation & One-Terminal Start

From project root:

```bash
# Install deps in backend & frontend
cd server && npm install && cd ..
cd client && npm install && cd ..

# Install concurrently in root
npm install -D concurrently
```

Create **root `package.json`** (or edit existing):

```json
{
  "name": "code-master",
  "private": true,
  "scripts": {
    "start:server": "cd server && npm start",
    "start:client": "cd client && npm run dev",
    "start": "concurrently \"npm run start:server\" \"npm run start:client\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

Now simply run:

```bash
npm run start
```

✅ This launches **backend + frontend in one terminal**.

---

## 🌐 Access URLs

- **Frontend:** http://localhost:3000 (CRA) or http://localhost:5173 (Vite)  
- **Backend API:** http://localhost:5000  
- **Health Check:** http://localhost:5000/health  
- **Problems API:** http://localhost:5000/api/problems  

---

## 🛠 Troubleshooting

- **DB connection failed** → check `server/.env` and ensure MySQL is running.  
- **Port in use** → change port in `.env` or kill process:  
  ```powershell
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```
- **Frontend not reaching backend** → verify `VITE_API_URL` in `client/.env`.  
- **Module not found** → run `npm install` again inside the correct folder.  

---

## ✅ Success Indicators

- Backend logs show **“Connected to MySQL database”**.  
- Frontend loads at `http://localhost:3000` (or `5173`).  
- `http://localhost:5000/health` returns DB status.  
- Problems API returns the sample problems.  

---

**🎉 That’s it — your Code Master platform runs with a single `npm run start` command!**

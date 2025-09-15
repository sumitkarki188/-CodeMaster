import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProblemsList from './components/ProblemsList';
import ProblemView from './components/ProblemView';

function App() {
    return (
        <Router>
            <div className="app">
                <header className="header">
                    <h1>🚀 LeetCode Clone</h1>
                </header>

                <main className="main">
                    <Routes>
                        <Route path="/" element={<ProblemsList />} />
                        <Route path="/problems" element={<ProblemsList />} />
                        <Route path="/problem/:id" element={<ProblemView />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;

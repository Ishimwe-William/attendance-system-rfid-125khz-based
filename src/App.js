import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import {Navigation} from './components/Navigation';
import {Login} from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AttendanceList from './components/AttendanceList';
import CoursesList from './components/CoursesList';
import DevicesList from './components/DevicesList';
import ExamsList from './components/ExamsList';
import LecturersList from './components/LecturersList';
import StudentsList from './components/StudentsList';
import Settings from './pages/Settings';

const PrivateRoute = ({ children, adminOnly }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
    return (
        <>
            <Navigation />
            {children}
        </>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/attendance" element={<PrivateRoute><AttendanceList /></PrivateRoute>} />
                    <Route path="/courses" element={<PrivateRoute adminOnly><CoursesList /></PrivateRoute>} />
                    <Route path="/devices" element={<PrivateRoute adminOnly><DevicesList /></PrivateRoute>} />
                    <Route path="/exams" element={<PrivateRoute adminOnly><ExamsList /></PrivateRoute>} />
                    <Route path="/lecturers" element={<PrivateRoute adminOnly><LecturersList /></PrivateRoute>} />
                    <Route path="/students" element={<PrivateRoute adminOnly><StudentsList /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute adminOnly><Settings /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
import React from 'react';
import {Routes, Route, Navigate, HashRouter} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AttendanceList from './components/AttendanceList';
import CoursesList from './components/CoursesList';
import DevicesList from './components/DevicesList';
import ExamsList from './components/ExamsList';
import LecturersList from './components/LecturersList';
import StudentsList from './components/StudentsList';
import Settings from './pages/Settings';
import PrivateRoute from "./components/PrivateRoute";
import UsersList from "./components/UsersList";
import NavigationBar from "./components/NavigationBar";

const App = () => {
    return (
        <AuthProvider>
            <HashRouter>
                <NavigationBar/>
                <Routes>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/signup" element={<Signup/>}/>
                    <Route path="/" element={<PrivateRoute><Dashboard/></PrivateRoute>}/>
                    <Route path="/attendance" element={<PrivateRoute><AttendanceList/></PrivateRoute>}/>
                    <Route path="/courses" element={<PrivateRoute adminOnly={true}><CoursesList/></PrivateRoute>}/>
                    <Route path="/devices" element={<PrivateRoute adminOnly={true}><DevicesList/></PrivateRoute>}/>
                    <Route path="/exams" element={<PrivateRoute adminOnly={true}><ExamsList/></PrivateRoute>}/>
                    <Route path="/lecturers" element={<PrivateRoute adminOnly={true}><LecturersList/></PrivateRoute>}/>
                    <Route path="/students" element={<PrivateRoute adminOnly={true}><StudentsList/></PrivateRoute>}/>
                    <Route path="/settings" element={<PrivateRoute adminOnly={true}><Settings/></PrivateRoute>}/>
                    <Route path="/users" element={<PrivateRoute adminOnly={true}><UsersList/></PrivateRoute>}/>
                    <Route path="*" element={<Navigate to="/"/>}/>
                </Routes>
            </HashRouter>
        </AuthProvider>
    );
};

export default App;
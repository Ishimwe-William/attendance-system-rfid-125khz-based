import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { DataGrid } from '@mui/x-data-grid';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Divider
} from '@mui/material';
import {
    School as SchoolIcon,
    Class as ClassIcon,
    Person as PersonIcon,
    Event as EventIcon,
    Devices as DevicesIcon,
} from '@mui/icons-material';
import { ExamStatus } from '../models/types';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({
        activeExams: 0,
        devices: 0,
        courses: 0,
        lecturers: 0,
        students: 0,
    });
    const [recentAttendance, setRecentAttendance] = useState([]);

    useEffect(() => {
        // Fetch metrics
        const examQuery = query(collection(db, COLLECTIONS.EXAMS));
        const deviceQuery = query(collection(db, COLLECTIONS.DEVICES));
        const courseQuery = query(collection(db, COLLECTIONS.COURSES));
        const lecturerQuery = query(collection(db, COLLECTIONS.LECTURERS));
        const studentQuery = query(collection(db, COLLECTIONS.STUDENTS));
        const attendanceQuery = query(
            collection(db, COLLECTIONS.ATTENDANCE),
            orderBy('checkInTime', 'desc'),
            limit(5)
        );

        const unsubscribeExams = onSnapshot(examQuery, (snapshot) => {
            setMetrics(prev => ({
                ...prev,
                activeExams: snapshot.docs.filter(doc => doc.data().status === ExamStatus.ACTIVE).length,
            }));
        });

        const unsubscribeDevices = onSnapshot(deviceQuery, (snapshot) => {
            setMetrics(prev => ({ ...prev, devices: snapshot.docs.length }));
        });

        const unsubscribeCourses = onSnapshot(courseQuery, (snapshot) => {
            setMetrics(prev => ({ ...prev, courses: snapshot.docs.length }));
        });

        const unsubscribeLecturers = onSnapshot(lecturerQuery, (snapshot) => {
            setMetrics(prev => ({ ...prev, lecturers: snapshot.docs.length }));
        });

        const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
            setMetrics(prev => ({ ...prev, students: snapshot.docs.length }));
        });

        const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
            setRecentAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeExams();
            unsubscribeDevices();
            unsubscribeCourses();
            unsubscribeLecturers();
            unsubscribeStudents();
            unsubscribeAttendance();
        };
    }, []);

    const columns = [
        { field: 'examId', headerName: 'Exam ID', width: 150, flex: 1,
            valueGetter: (value, row) => {
                return row?.currentExam || row?.examId;
            },
        },
        { field: 'studentId', headerName: 'Student ID', width: 120, flex: 1, },
        { field: 'rfidTag', headerName: 'RFID Tag', flex: 1, width: 120,
            valueGetter: (value, row) => row?.rfidTag || row?.studentId,
        },
        { field: 'checkInTime', headerName: 'Check-In', width: 150, },
        { field: 'checkOutTime', headerName: 'Check-Out', width: 150 },
        { field: 'status', headerName: 'Status', width: 200, flex: 1,
            valueGetter: (value, row) => row?.status || "-- View on attendance page --",
        },
        { field: 'deviceId', headerName: 'Device', flex: 1, width: 100 },
    ];

    const navigationItems = [
        { text: 'Students', path: '/students', icon: <SchoolIcon />, roles: ['admin'] },
        { text: 'Courses', path: '/courses', icon: <ClassIcon />, roles: ['admin'] },
        { text: 'Lecturers', path: '/lecturers', icon: <PersonIcon />, roles: ['admin'] },
        { text: 'Exams', path: '/exams', icon: <EventIcon />, roles: ['admin'] },
        { text: 'Devices', path: '/devices', icon: <DevicesIcon />, roles: ['admin'] },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Dashboard</Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Welcome, {user?.email} ({user?.role})
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Active Exams</Typography>
                            <Typography variant="h4">{metrics.activeExams}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Devices</Typography>
                            <Typography variant="h4">{metrics.devices}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Courses</Typography>
                            <Typography variant="h4">{metrics.courses}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Lecturers</Typography>
                            <Typography variant="h4">{metrics.lecturers}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Students</Typography>
                            <Typography variant="h4">{metrics.students}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Typography variant="h5" gutterBottom>Quick Actions</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {navigationItems.map((item) => (
                    (item.roles.includes(user?.role)) && (
                        <Grid item key={item.text}>
                            <Button
                                variant="contained"
                                startIcon={item.icon}
                                onClick={() => navigate(item.path)}
                            >
                                {item.text}
                            </Button>
                        </Grid>
                    )
                ))}
            </Grid>

            <Typography variant="h5" gutterBottom>Recent Attendance</Typography>
            <div style={{ height: 300, width: '100%' }}>
                <DataGrid
                    rows={recentAttendance}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                />
            </div>
        </Box>
    );
};

export default Dashboard;
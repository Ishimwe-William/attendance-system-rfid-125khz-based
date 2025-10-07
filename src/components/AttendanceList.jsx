import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {collection, onSnapshot, query} from 'firebase/firestore';
import {db, COLLECTIONS} from '../config/firebase';
import {useDatabase} from '../hooks/useDatabase';
import {useAuth} from '../context/AuthContext';
import {Box, Typography, Button, Alert, Chip, Card, CardContent, Grid} from '@mui/material';
import * as Yup from 'yup';
import OngoingExamsSummary from './attendance/OngoingExamsSummary';
import AttendanceFormDialog from './attendance/AttendanceFormDialog';
import ConfirmDeleteDialog from './attendance/ConfirmDeleteDialog';
import {AttendanceStatus} from '../models/types';

const AttendanceList = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const isAdmin = user?.role === 'admin';
    const [attendance, setAttendance] = useState([]);
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [open, setOpen] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [deletingRow, setDeletingRow] = useState(null);
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [error, setError] = useState(null);
    const {addDocument, updateDocument, deleteDocument, loading} = useDatabase();

    useEffect(() => {
        const attendanceQuery = query(collection(db, COLLECTIONS.ATTENDANCE));
        const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
            setAttendance(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        const examQuery = query(collection(db, COLLECTIONS.EXAMS));
        const unsubscribeExams = onSnapshot(examQuery, (snapshot) => {
            setExams(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        const courseQuery = query(collection(db, COLLECTIONS.COURSES));
        const unsubscribeCourse = onSnapshot(courseQuery, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        const studentQuery = query(collection(db, COLLECTIONS.STUDENTS));
        const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        return () => {
            unsubscribeAttendance();
            unsubscribeExams();
            unsubscribeCourse();
            unsubscribeStudents();
        };
    }, []);

    const handleOpen = (record = null) => {
        if (!isAdmin) return;
        if (record && !record.rfidTag) {
            setError('Cannot edit RFID recorded attendance.');
            return;
        }
        setEditingAttendance(record);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingAttendance(null);
        setError(null);
    };

    const handleSubmit = async (values) => {
        try {
            values.deviceId = "Manual";
            values.deviceName = "-- Manual --";
            const student = students.find((s) => s.id === values.studentId);
            if (student && values.rfidTag !== student.rfidTag) {
                throw new Error("RFID tag does not match selected student.");
            }

            const exam = exams.find((e) => e.id === values.examId);
            if (!exam) {
                throw new Error("Selected exam not found.");
            }

            if (values.checkInTime) {
                const checkInDate = new Date(values.checkInTime);
                if (isNaN(checkInDate.getTime())) {
                    throw new Error("Invalid check-in date and time format.");
                }
                const examStart = new Date(`${exam.examDate}T${exam.startTime}`);
                const examEnd = new Date(examStart.getTime() + exam.duration * 60 * 60 * 1000);

                const checkInDateOnly = values.checkInTime.split("T")[0];
                if (checkInDateOnly !== exam.examDate) {
                    throw new Error(`Check-in date must match exam date (${exam.examDate}).`);
                }

                if (checkInDate < examStart) {
                    throw new Error(`Cannot check in before exam starts (${exam.startTime}).`);
                }

                if (checkInDate > examEnd) {
                    throw new Error(`Cannot check in after exam ends.`);
                }
            } else {
                const now = new Date();
                const examStart = new Date(`${exam.examDate}T${exam.startTime}`);
                const examEnd = new Date(examStart.getTime() + (exam.duration * 60 * 60 * 1000));

                if (now >= examStart && now <= examEnd) {
                    values.checkInTime = now.toISOString();
                }
            }

            if (values.checkOutTime) {
                const checkOutDate = new Date(values.checkOutTime);
                const examEnd = new Date(`${exam.examDate}T${exam.startTime}`);
                examEnd.setTime(examEnd.getTime() + (exam.duration * 60 * 60 * 1000));

                const checkOutDateOnly = values.checkOutTime.split('T')[0];
                if (checkOutDateOnly !== exam.examDate) {
                    throw new Error(`Check-out date must match exam date (${exam.examDate}).`);
                }

                if (values.checkInTime && checkOutDate < new Date(values.checkInTime)) {
                    throw new Error('Check-out time cannot be before check-in time.');
                }
            }

            if (editingAttendance) {
                await updateDocument(COLLECTIONS.ATTENDANCE, editingAttendance.id, values);
            } else {
                await addDocument(COLLECTIONS.ATTENDANCE, values);
            }
            handleClose();
        } catch (err) {
            setError(err.message);
        }
    };

    // const handleDelete = (row) => {
    //     setDeletingRow(row);
    //     setOpenConfirm(true);
    // };

    const confirmDelete = async () => {
        try {
            if (!isAdmin) throw new Error('Unauthorized');
            if (!deletingRow?.rfidTag) throw new Error('Cannot delete RFID recorded attendance.');
            await deleteDocument(COLLECTIONS.ATTENDANCE, deletingRow?.id);
            setOpenConfirm(false);
            setDeletingRow(null);
        } catch (err) {
            setError(err.message);
            setOpenConfirm(false);
        }
    };

    const validationSchema = Yup.object({
        examId: Yup.string().required('Required'),
        studentId: Yup.string().required('Required'),
        rfidTag: Yup.string().required('Required'),
        checkInTime: Yup.string().test('check-in-time', 'Invalid date and time format', (value) => {
            if (!value) return true;
            const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
            return regex.test(value);
        }),
        checkOutTime: Yup.string().test('check-out-time', 'Invalid date and time format', (value) => {
            if (!value) return true;
            const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
            return regex.test(value);
        }),
        status: Yup.string().oneOf([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]).required('Required'),
        emailSent: Yup.boolean().required('Required'),
    });

    const getCheckInDate = (row) => {
        if (row?.checkInEpochTime) {
            return new Date(row?.checkInEpochTime * 1000);
        } else if (row?.checkInTime) {
            const checkInDate = new Date(row?.checkInTime);
            if (isNaN(checkInDate.getTime())) {
                return null;
            }
            return checkInDate;
        }
        return null;
    };

    const RFID_TIMEZONE_OFFSET_HOURS = 2;
    const GRACE_PERIOD_MINUTES = 30;

    const getAttendanceStatus = (exam, attendanceRecord) => {
        if (!exam) return "Unknown";

        if (attendanceRecord.status) {
            return attendanceRecord.status;
        }

        let checkInEpoch = attendanceRecord.checkInEpochTime;
        if (!checkInEpoch && attendanceRecord.checkInTime) {
            const checkInDate = new Date(`${exam.examDate}T${attendanceRecord.checkInTime}`);
            if (isNaN(checkInDate.getTime())) return "Invalid";
            checkInEpoch = Math.floor(checkInDate.getTime() / 1000);
        }
        if (!checkInEpoch) {
            return AttendanceStatus.ABSENT;
        }

        if (attendanceRecord.checkInEpochTime) {
            checkInEpoch = checkInEpoch - (RFID_TIMEZONE_OFFSET_HOURS * 3600);
        }

        const examStartDate = new Date(`${exam.examDate}T${exam.startTime}`);
        const examStartEpoch = Math.floor(examStartDate.getTime() / 1000);
        const examEndEpoch = examStartEpoch + (exam.duration * 3600);

        const earlyCheckInSeconds = 10 * 60;
        const earlyCheckInEpoch = examStartEpoch - earlyCheckInSeconds;

        const gracePeriodSeconds = GRACE_PERIOD_MINUTES * 60;
        const graceEndEpoch = examStartEpoch + gracePeriodSeconds;

        if (checkInEpoch < earlyCheckInEpoch || checkInEpoch > examEndEpoch) {
            return "Invalid";
        }

        if (checkInEpoch <= graceEndEpoch) {
            return AttendanceStatus.PRESENT;
        }

        return AttendanceStatus.LATE;
    };

    const getExamStatus = (exam) => {
        if (!exam) return 'Unknown';

        const now = new Date();
        const examStart = new Date(`${exam.examDate}T${exam.startTime}`);
        const examEnd = new Date(examStart.getTime() + (exam.duration * 60 * 60 * 1000));

        if (exam.status) {
            return exam.status;
        }

        if (now < examStart) {
            return 'Awaiting';
        } else if (now >= examStart && now <= examEnd) {
            return 'In Progress';
        } else {
            return 'Ended';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case AttendanceStatus.PRESENT:
            case 'active':
            case 'in-progress':
            case 'In Progress':
                return 'success';
            case AttendanceStatus.LATE:
                return 'warning';
            case AttendanceStatus.ABSENT:
            case 'Invalid':
                return 'error';
            case 'scheduled':
            case 'Awaiting':
                return 'info';
            case 'completed':
            case 'Ended':
                return 'default';
            default:
                return 'default';
        }
    };

    // Group attendance by exam and sort by latest attendance
    const getExamsWithAttendance = () => {
        const examAttendanceMap = {};

        attendance.forEach(record => {
            const examId = record.currentExam || record.examId;
            if (!examAttendanceMap[examId]) {
                examAttendanceMap[examId] = {
                    examId,
                    recordCount: 0,
                    lastAttendanceTime: null
                };
            }
            examAttendanceMap[examId].recordCount++;

            const checkInDate = getCheckInDate(record);
            if (checkInDate && (!examAttendanceMap[examId].lastAttendanceTime ||
                checkInDate > examAttendanceMap[examId].lastAttendanceTime)) {
                examAttendanceMap[examId].lastAttendanceTime = checkInDate;
            }
        });

        return Object.values(examAttendanceMap).sort((a, b) => {
            if (!a.lastAttendanceTime) return 1;
            if (!b.lastAttendanceTime) return -1;
            return b.lastAttendanceTime - a.lastAttendanceTime;
        });
    };

    const examsWithAttendance = getExamsWithAttendance();

    return (
        <Box sx={{p: 3}}>
            <Typography variant="h4" gutterBottom>Attendance Management</Typography>
            <OngoingExamsSummary
                exams={exams}
                courses={courses}
                attendance={attendance}
                getExamStatus={getExamStatus}
                getStatusColor={getStatusColor}
                getAttendanceStatus={getAttendanceStatus}
                AttendanceStatus={AttendanceStatus}
            />
            {isAdmin && (
                <Button
                    variant="contained"
                    onClick={() => handleOpen()}
                    sx={{mb: 2}}
                >
                    Add Manual Attendance
                </Button>
            )}
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

            <Box sx={{mt: 3}}>
                {examsWithAttendance.length === 0 ? (
                    <Alert severity="info">No attendance records found.</Alert>
                ) : (
                    examsWithAttendance.map(({examId, recordCount, lastAttendanceTime}) => {
                        const exam = exams.find(e => e.id === examId);
                        if (!exam) return null;

                        const course = courses.find(c => c.id === exam.courseCode);
                        const examStatus = getExamStatus(exam);
                        const endTime = exam.endTime || (() => {
                            const start = new Date(`2000-01-01T${exam.startTime}`);
                            const end = new Date(start.getTime() + (exam.duration * 60 * 60 * 1000));
                            return end.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false});
                        })();

                        const examAttendance = attendance.filter(record =>
                            (record.currentExam || record.examId) === examId
                        );

                        const statusCounts = {
                            present: 0,
                            late: 0,
                            absent: 0
                        };

                        examAttendance.forEach(record => {
                            const status = getAttendanceStatus(exam, record);
                            if (status === AttendanceStatus.PRESENT) statusCounts.present++;
                            else if (status === AttendanceStatus.LATE) statusCounts.late++;
                            else if (status === AttendanceStatus.ABSENT) statusCounts.absent++;
                        });

                        return (
                            <Card
                                key={examId}
                                sx={{
                                    mb: 2,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        boxShadow: 4,
                                        bgcolor: 'action.hover'
                                    }
                                }}
                                onClick={() => navigate(`/attendance/${examId}`)}
                            >
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="h6">{course?.courseName || 'N/A'}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {exam.examType} • Room {exam.room}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                                            <Typography variant="body1">
                                                {exam.examDate}
                                            </Typography>
                                            <Typography variant="body2">
                                                {exam.startTime} - {endTime} ({exam.duration}h)
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <Chip
                                                label={examStatus}
                                                color={getStatusColor(examStatus)}
                                                size="small"
                                            />
                                            <Typography variant="caption" display="block" sx={{mt: 0.5}}>
                                                {recordCount} record{recordCount !== 1 ? 's' : ''}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="body2" color="text.secondary">Attendance</Typography>
                                            <Box sx={{display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap'}}>
                                                <Chip label={`✓ ${statusCounts.present}`} size="small" color="success" variant="outlined" />
                                                <Chip label={`⚠ ${statusCounts.late}`} size="small" color="warning" variant="outlined" />
                                                <Chip label={`✗ ${statusCounts.absent}`} size="small" color="error" variant="outlined" />
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </Box>

            {isAdmin && (
                <AttendanceFormDialog
                    open={open}
                    handleClose={handleClose}
                    editingAttendance={editingAttendance}
                    exams={exams}
                    courses={courses}
                    students={students}
                    handleSubmit={handleSubmit}
                    validationSchema={validationSchema}
                    error={error}
                    loading={loading}
                    AttendanceStatus={AttendanceStatus}
                />
            )}
            <ConfirmDeleteDialog
                openConfirm={openConfirm}
                setOpenConfirm={setOpenConfirm}
                confirmDelete={confirmDelete}
            />
        </Box>
    );
};

export default AttendanceList;
import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {collection, onSnapshot, query} from 'firebase/firestore';
import {db, COLLECTIONS} from '../../config/firebase';
import {useDatabase} from '../../hooks/useDatabase';
import {useAuth} from '../../context/AuthContext';
import {Box, Typography, Button, Alert, Chip, Card, CardContent, Grid, IconButton} from '@mui/material';
import {ArrowBack as ArrowBackIcon} from '@mui/icons-material';
import * as Yup from 'yup';
import AttendanceFormDialog from './AttendanceFormDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import AttendanceTable from './AttendanceTable';
import {AttendanceStatus} from '../../models/types';

const ExamAttendance = () => {
    const {examId} = useParams();
    const navigate = useNavigate();
    const {user} = useAuth();
    const isAdmin = user?.role === 'admin';
    const [attendance, setAttendance] = useState([]);
    const [exam, setExam] = useState(null);
    const [course, setCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [devices, setDevices] = useState([]);
    const [open, setOpen] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [deletingRow, setDeletingRow] = useState(null);
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [error, setError] = useState(null);
    const {addDocument, updateDocument, deleteDocument, loading} = useDatabase();

    useEffect(() => {
        // Fetch exam
        const examQuery = query(collection(db, COLLECTIONS.EXAMS));
        const unsubscribeExam = onSnapshot(examQuery, (snapshot) => {
            const examData = snapshot.docs.find(doc => doc.id === examId);
            if (examData) {
                setExam({id: examData.id, ...examData.data()});
            }
        });

        // Fetch attendance for this exam
        const attendanceQuery = query(collection(db, COLLECTIONS.ATTENDANCE));
        const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
            const records = snapshot.docs
                .map(doc => ({id: doc.id, ...doc.data()}))
                .filter(record => (record.currentExam || record.examId) === examId);
            setAttendance(records);
        });

        // Fetch students
        const studentQuery = query(collection(db, COLLECTIONS.STUDENTS));
        const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        // Fetch devices
        const deviceQuery = query(collection(db, COLLECTIONS.DEVICES));
        const unsubscribeDevices = onSnapshot(deviceQuery, (snapshot) => {
            setDevices(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        return () => {
            unsubscribeExam();
            unsubscribeAttendance();
            unsubscribeStudents();
            unsubscribeDevices();
        };
    }, [examId]);

    useEffect(() => {
        if (exam) {
            const courseQuery = query(collection(db, COLLECTIONS.COURSES));
            const unsubscribeCourse = onSnapshot(courseQuery, (snapshot) => {
                const courseData = snapshot.docs.find(doc => doc.id === exam.courseCode);
                if (courseData) {
                    setCourse({id: courseData.id, ...courseData.data()});
                }
            });
            return () => unsubscribeCourse();
        }
    }, [exam]);

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
            values.examId = examId;

            const student = students.find((s) => s.id === values.studentId);
            if (student && values.rfidTag !== student.rfidTag) {
                throw new Error("RFID tag does not match selected student.");
            }

            if (!exam) {
                throw new Error("Exam not found.");
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
            }

            if (values.checkOutTime) {
                const checkOutDate = new Date(values.checkOutTime);
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

    const handleDelete = (row) => {
        setDeletingRow(row);
        setOpenConfirm(true);
    };

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

    const getCheckOutDate = (row) => {
        if (row?.checkOutEpochTime) {
            return new Date(row?.checkOutEpochTime * 1000);
        } else if (row?.checkOutTime) {
            const checkOutDate = new Date(row?.checkOutTime);
            if (isNaN(checkOutDate.getTime())) {
                return null;
            }
            return checkOutDate;
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
            case 'In Progress':
                return 'success';
            case AttendanceStatus.LATE:
                return 'warning';
            case AttendanceStatus.ABSENT:
            case 'Invalid':
                return 'error';
            case 'Awaiting':
                return 'info';
            case 'Ended':
                return 'default';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            field: 'student',
            headerName: 'Student',
            flex: 2,
            valueGetter: (value, row) => {
                let student;
                if (row?.rfidTag) {
                    student = students.find(s => s.id === row?.studentId);
                } else {
                    student = students.find(s => s.rfidTag === row?.studentId);
                }
                return student ? student.name : row?.studentId || 'N/A';
            },
        },
        {
            field: 'rfid',
            headerName: 'RFID Tag',
            width: 120,
            valueGetter: (value, row) => row?.rfidTag || row?.studentId,
        },
        {
            field: 'checkIn',
            headerName: 'Check-In',
            type: 'dateTime',
            flex: 1.5,
            valueGetter: (value, row) => getCheckInDate(row),
            renderCell: (params) => {
                if (params.value) {
                    return params.value.toLocaleString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                    });
                }
                return 'Not checked in';
            },
        },
        {
            field: 'checkOut',
            headerName: 'Check-Out',
            type: 'dateTime',
            width: 150,
            valueGetter: (value, row) => getCheckOutDate(row),
            renderCell: (params) => {
                if (params.value) {
                    return params.value.toLocaleString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                    });
                }
                return 'Not checked out';
            },
        },
        {
            field: 'attendanceStatus',
            headerName: 'Status',
            flex: 1,
            renderCell: (params) => {
                const status = getAttendanceStatus(exam, params.row);
                const color = getStatusColor(status);
                return (
                    <Chip
                        label={status}
                        color={color}
                        size="small"
                        variant="outlined"
                    />
                );
            },
        },
        {
            field: 'deviceId',
            headerName: 'Device',
            width: 150,
            valueGetter: (value, row) => {
                const device = devices.find(d => d.id === value);
                return device ? device.deviceName : row?.deviceName || value || 'N/A';
            },
        },
        {field: 'emailSent', headerName: 'Email Sent', width: 100, type: 'boolean'},
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => {
                if (!isAdmin) return null;
                if (!params.row?.rfidTag) {
                    return <Typography color="textSecondary" variant="caption">RFID Recorded</Typography>;
                }
                return (
                    <Box sx={{display: 'flex', gap: 1}}>
                        <Button
                            size="small"
                            onClick={() => handleOpen(params.row)}
                            disabled={!isAdmin}
                        >
                            Edit
                        </Button>
                        <Button
                            size="small"
                            onClick={() => handleDelete(params.row)}
                            color="error"
                            disabled={!isAdmin}
                        >
                            Delete
                        </Button>
                    </Box>
                );
            },
        },
    ];

    if (!exam) {
        return (
            <Box sx={{p: 3}}>
                <Typography>Loading exam details...</Typography>
            </Box>
        );
    }

    const examStatus = getExamStatus(exam);
    const endTime = exam.endTime || (() => {
        const start = new Date(`2000-01-01T${exam.startTime}`);
        const end = new Date(start.getTime() + (exam.duration * 60 * 60 * 1000));
        return end.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false});
    })();

    const statusCounts = {
        present: 0,
        late: 0,
        absent: 0
    };

    attendance.forEach(record => {
        const status = getAttendanceStatus(exam, record);
        if (status === AttendanceStatus.PRESENT) statusCounts.present++;
        else if (status === AttendanceStatus.LATE) statusCounts.late++;
        else if (status === AttendanceStatus.ABSENT) statusCounts.absent++;
    });

    return (
        <Box sx={{p: 3}}>
            <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
                <IconButton onClick={() => navigate('/attendance')} sx={{mr: 2}}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4">Exam Attendance Details</Typography>
            </Box>

            <Card sx={{mb: 3}}>
                <CardContent>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h5" gutterBottom>{course?.courseName || 'N/A'}</Typography>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                {exam.examType} • Room {exam.room}
                            </Typography>
                            <Box sx={{mt: 2}}>
                                <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                                <Typography variant="body1">{exam.examDate}</Typography>
                                <Typography variant="body1">
                                    {exam.startTime} - {endTime} ({exam.duration}h)
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>Exam Status</Typography>
                            <Chip
                                label={examStatus}
                                color={getStatusColor(examStatus)}
                                size="medium"
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>Attendance Summary</Typography>
                            <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                                <Chip label={`Present: ${statusCounts.present}`} size="small" color="success" />
                                <Chip label={`Late: ${statusCounts.late}`} size="small" color="warning" />
                                <Chip label={`Absent: ${statusCounts.absent}`} size="small" color="error" />
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

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

            <AttendanceTable
                attendance={attendance}
                columns={columns}
                loading={loading}
                exams={[exam]}
                handleEdit={handleOpen}
                handleDelete={handleDelete}
                courses={course ? [course] : []}
                students={students}
                devices={devices}
                getCheckInDate={getCheckInDate}
                getCheckOutDate={getCheckOutDate}
                getAttendanceStatus={getAttendanceStatus}
                getExamStatus={getExamStatus}
                getStatusColor={getStatusColor}
                AttendanceStatus={AttendanceStatus}
            />

            {isAdmin && (
                <AttendanceFormDialog
                    open={open}
                    handleClose={handleClose}
                    editingAttendance={editingAttendance}
                    exams={[exam]}
                    courses={course ? [course] : []}
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

export default ExamAttendance;
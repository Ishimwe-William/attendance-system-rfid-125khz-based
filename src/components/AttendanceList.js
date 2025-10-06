import React, {useState, useEffect} from 'react';
import {collection, onSnapshot, query} from 'firebase/firestore';
import {db, COLLECTIONS} from '../config/firebase';
import {useDatabase} from '../hooks/useDatabase';
import {useAuth} from '../context/AuthContext';
import {Box, Typography, Button, Alert, Chip} from '@mui/material';
import * as Yup from 'yup';
import OngoingExamsSummary from './attendance/OngoingExamsSummary';
import AttendanceFormDialog from './attendance/AttendanceFormDialog';
import ConfirmDeleteDialog from './attendance/ConfirmDeleteDialog';
import AttendanceTable from './attendance/AttendanceTable';
import {AttendanceStatus} from '../models/types';

const AttendanceList = () => {
    const {user} = useAuth();
    const isAdmin = user?.role === 'admin';
    const [attendance, setAttendance] = useState([]);
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [devices, setDevices] = useState([]);
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

        const deviceQuery = query(collection(db, COLLECTIONS.DEVICES));
        const unsubscribeDevices = onSnapshot(deviceQuery, (snapshot) => {
            setDevices(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });

        return () => {
            unsubscribeAttendance();
            unsubscribeExams();
            unsubscribeCourse();
            unsubscribeStudents();
            unsubscribeDevices();
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

// Add this constant at the top of your file
    const RFID_TIMEZONE_OFFSET_HOURS = 2; // RFID device is 2 hours ahead
    const GRACE_PERIOD_MINUTES = 10; // Students can check in up to 5 minutes after exam start and still be "PRESENT"

    const getAttendanceStatus = (exam, attendanceRecord) => {
        if (!exam) return "Unknown";

        if (attendanceRecord.status) {
            return attendanceRecord.status;
        }

        // Prioritize epoch if available; fallback to parsing string
        let checkInEpoch = attendanceRecord.checkInEpochTime;
        if (!checkInEpoch && attendanceRecord.checkInTime) {
            const checkInDate = new Date(`${exam.examDate}T${attendanceRecord.checkInTime}`);
            if (isNaN(checkInDate.getTime())) return "Invalid";
            checkInEpoch = Math.floor(checkInDate.getTime() / 1000);
        }
        if (!checkInEpoch) {
            return AttendanceStatus.ABSENT;
        }

        // Correct RFID timezone offset if this is an RFID-recorded attendance
        if (attendanceRecord.checkInEpochTime) {
            checkInEpoch = checkInEpoch - (RFID_TIMEZONE_OFFSET_HOURS * 3600);
            console.log("Applied RFID timezone correction:", -RFID_TIMEZONE_OFFSET_HOURS, "hours");
        }

        // Create exam start/end dates in local timezone
        const examStartDate = new Date(`${exam.examDate}T${exam.startTime}`);
        const examStartEpoch = Math.floor(examStartDate.getTime() / 1000);
        const examEndEpoch = examStartEpoch + (exam.duration * 3600);

        // Define grace period (e.g., 5 minutes = 300 seconds)
        const gracePeriodSeconds = GRACE_PERIOD_MINUTES * 60;
        const graceEndEpoch = examStartEpoch + gracePeriodSeconds;

        // Comparisons using corrected epoch times
        if (checkInEpoch < examStartEpoch || checkInEpoch > examEndEpoch) {
            return "Invalid";
        }

        // Check-in within grace period is considered PRESENT
        if (checkInEpoch <= graceEndEpoch) {
            return AttendanceStatus.PRESENT;
        }

        // Check-in after grace period but before exam end is LATE
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
                return 'success';
            case AttendanceStatus.LATE:
                return 'warning';
            case AttendanceStatus.ABSENT:
            case 'Invalid':
                return 'error';
            case 'scheduled':
                return 'info';
            case 'completed':
                return 'default';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            field: 'examId',
            headerName: 'Exam ID',
            width: 100,
            flex: 1,
            valueGetter: (value, row) => {
                return row?.currentExam || row?.examId;
            },
        },
        {
            field: 'exam',
            headerName: 'Course',
            flex: 2,
            valueGetter: (value, row) => {
                const examId = row?.currentExam || row?.examId;
                const exam = exams.find(e => e.id === examId);
                if (!exam) return 'N/A';
                const course = courses.find(c => c.id === exam.courseCode);
                return course ? course.courseName : 'N/A';
            },
        },
        {
            field: 'examType',
            headerName: 'Exam Type',
            width: 100,
            flex: 1,
            valueGetter: (value, row) => {
                const examId = row?.currentExam || row?.examId;
                const exam = exams.find(e => e.id === examId);
                return exam?.examType || 'N/A';
            },
        },
        {
            field: 'examDate',
            headerName: 'Exam Date',
            width: 100,
            flex: 1,
            valueGetter: (value, row) => {
                const examId = row?.currentExam || row?.examId;
                const exam = exams.find(e => e.id === examId);
                return exam?.examDate || 'N/A';
            },
        },
        {
            field: 'examTime',
            headerName: 'Exam Time',
            width: 120,
            flex: 1.5,
            valueGetter: (value, row) => {
                const examId = row?.currentExam || row?.examId;
                const exam = exams.find(e => e.id === examId);
                if (!exam) return 'N/A';
                const endTime = exam.endTime || (() => {
                    const start = new Date(`2000-01-01T${exam.startTime}`);
                    const end = new Date(start.getTime() + (exam.duration * 60 * 60 * 1000));
                    return end.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false});
                })();
                return `${exam.startTime} - ${endTime}`;
            },
        },
        {
            field: 'duration',
            headerName: 'Duration (hrs)',
            width: 120,
            valueGetter: (value, row) => {
                const examId = row?.currentExam || row?.examId;
                const exam = exams.find(e => e.id === examId);
                return exam?.duration || 'N/A';
            },
        },
        {
            field: 'room',
            headerName: 'Room',
            width: 100,
            valueGetter: (value, row) => {
                const examId = row?.currentExam || row?.examId;
                const exam = exams.find(e => e.id === examId);
                return exam?.room || row?.examRoom || 'N/A';
            },
        },
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
            headerName: 'Attendance Status',
            flex: 1.5,
            renderCell: (params) => {
                const examId = params.row?.currentExam || params.row?.examId;
                const exam = exams.find(e => e.id === examId);
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
            field: 'examStatus',
            headerName: 'Exam Status',
            width: 120,
            renderCell: (params) => {
                const examId = params.row?.currentExam || params.row?.examId;
                const exam = exams.find(e => e.id === examId);
                const status = getExamStatus(exam);
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
            <AttendanceTable
                attendance={attendance}
                columns={columns}
                loading={loading}
                exams={exams}
                handleEdit={handleOpen}
                handleDelete={handleDelete}
                courses={courses}
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
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { DataGrid } from '@mui/x-data-grid';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Box,
    Typography, Switch
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { AttendanceStatus } from '../models/types';

const AttendanceList = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [attendance, setAttendance] = useState([]);
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [devices, setDevices] = useState([]);
    const [examSettings, setExamSettings] = useState(null);
    const [open, setOpen] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [error, setError] = useState(null);
    const { addDocument, updateDocument, deleteDocument, loading } = useDatabase();

    useEffect(() => {
        // Fetch attendance
        const attendanceQuery = query(collection(db, COLLECTIONS.ATTENDANCE));
        const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
            setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch exams
        const examQuery = query(collection(db, COLLECTIONS.EXAMS));
        const unsubscribeExams = onSnapshot(examQuery, (snapshot) => {
            setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch students
        const studentQuery = query(collection(db, COLLECTIONS.STUDENTS));
        const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch devices
        const deviceQuery = query(collection(db, COLLECTIONS.DEVICES));
        const unsubscribeDevices = onSnapshot(deviceQuery, (snapshot) => {
            setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch examSettings
        const examSettingsRef = doc(db, COLLECTIONS.SETTINGS, 'examSettings');
        const unsubscribeExamSettings = onSnapshot(examSettingsRef, (doc) => {
            if (doc.exists()) {
                setExamSettings(doc.data());
            }
        });

        return () => {
            unsubscribeAttendance();
            unsubscribeExams();
            unsubscribeStudents();
            unsubscribeDevices();
            unsubscribeExamSettings();
        };
    }, []);

    const handleOpen = (record = null) => {
        if (!isAdmin) return;
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
            // Validate rfidTag against selected student
            const student = students.find(s => s.id === values.studentId);
            if (student && values.rfidTag !== student.rfidTag) {
                throw new Error('RFID tag does not match selected student.');
            }

            // Validate late entry based on examSettings
            const exam = exams.find(e => e.id === values.examId);
            if (exam && values.checkInTime && examSettings?.allowLateEntry) {
                const examStart = new Date(`${exam.examDate}T${exam.startTime}:00Z`);
                const checkIn = new Date(values.checkInTime);
                const gracePeriodMs = examSettings.lateEntryGracePeriod * 60 * 1000;
                if (checkIn > new Date(examStart.getTime() + gracePeriodMs)) {
                    values.status = AttendanceStatus.LATE;
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

    const handleDelete = async (id) => {
        try {
            if (!isAdmin) throw new Error('Unauthorized');
            await deleteDocument(COLLECTIONS.ATTENDANCE, id);
        } catch (err) {
            setError(err.message);
        }
    };

    const validationSchema = Yup.object({
        examId: Yup.string().required('Required'),
        studentId: Yup.string().required('Required'),
        rfidTag: Yup.string().required('Required'),
        checkInTime: Yup.string().matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'Must be ISO format (YYYY-MM-DDTHH:MM:SSZ)').optional(),
        checkOutTime: Yup.string().matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'Must be ISO format (YYYY-MM-DDTHH:MM:SSZ)').optional(),
        status: Yup.string().oneOf([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]).required('Required'),
        deviceId: Yup.string().required('Required'),
        emailSent: Yup.boolean().required('Required'),
    });

    const columns = [
        {
            field: 'examId',
            headerName: 'Exam',
            width: 150,
            valueGetter: (params) => {
                const exam = exams.find(e => e.id === params.value);
                return exam ? exam.examName : params.value || 'N/A';
            },
        },
        {
            field: 'studentId',
            headerName: 'Student',
            width: 150,
            valueGetter: (params) => {
                const student = students.find(s => s.id === params.value);
                return student ? student.name : params.value || 'N/A';
            },
        },
        { field: 'rfidTag', headerName: 'RFID Tag', width: 120 },
        { field: 'checkInTime', headerName: 'Check-In', width: 150 },
        { field: 'checkOutTime', headerName: 'Check-Out', width: 150 },
        { field: 'status', headerName: 'Status', width: 100 },
        {
            field: 'deviceId',
            headerName: 'Device',
            width: 150,
            valueGetter: (params) => {
                const device = devices.find(d => d.id === params.value);
                return device ? device.deviceName : params.value || 'N/A';
            },
        },
        { field: 'emailSent', headerName: 'Email Sent', width: 100, type: 'boolean' },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <>
                    <Button onClick={() => handleOpen(params.row)} disabled={!isAdmin}>Edit</Button>
                    <Button onClick={() => handleDelete(params.id)} color="error" disabled={!isAdmin}>Delete</Button>
                </>
            ),
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Attendance</Typography>
            {isAdmin && (
                <Button
                    variant="contained"
                    onClick={() => handleOpen()}
                    sx={{ mb: 2 }}
                >
                    Add Attendance
                </Button>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={attendance}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            {isAdmin && (
                <Dialog open={open} onClose={handleClose}>
                    <DialogTitle>{editingAttendance ? 'Edit Attendance' : 'Add Attendance'}</DialogTitle>
                    <Formik
                        initialValues={
                            editingAttendance || {
                                examId: '',
                                studentId: '',
                                rfidTag: '',
                                checkInTime: '',
                                checkOutTime: '',
                                status: AttendanceStatus.PRESENT,
                                deviceId: '',
                                emailSent: false,
                            }
                        }
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ errors, touched, values, setFieldValue }) => (
                            <Form>
                                <DialogContent>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Exam</InputLabel>
                                        <Field
                                            as={Select}
                                            name="examId"
                                            value={values.examId}
                                            onChange={(e) => setFieldValue('examId', e.target.value)}
                                            error={touched.examId && !!errors.examId}
                                        >
                                            {exams.map(exam => (
                                                <MenuItem key={exam.id} value={exam.id}>
                                                    {exam.examName}
                                                </MenuItem>
                                            ))}
                                        </Field>
                                    </FormControl>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Student</InputLabel>
                                        <Field
                                            as={Select}
                                            name="studentId"
                                            value={values.studentId}
                                            onChange={(e) => {
                                                const studentId = e.target.value;
                                                const student = students.find(s => s.id === studentId);
                                                setFieldValue('studentId', studentId);
                                                setFieldValue('rfidTag', student ? student.rfidTag : '');
                                            }}
                                            error={touched.studentId && !!errors.studentId}
                                        >
                                            {students.map(student => (
                                                <MenuItem key={student.id} value={student.id}>
                                                    {student.name}
                                                </MenuItem>
                                            ))}
                                        </Field>
                                    </FormControl>
                                    <Field
                                        as={TextField}
                                        name="rfidTag"
                                        label="RFID Tag"
                                        fullWidth
                                        margin="normal"
                                        error={touched.rfidTag && !!errors.rfidTag}
                                        helperText={touched.rfidTag && errors.rfidTag}
                                    />
                                    <Field
                                        as={TextField}
                                        name="checkInTime"
                                        label="Check-In Time (YYYY-MM-DDTHH:MM:SSZ)"
                                        fullWidth
                                        margin="normal"
                                        error={touched.checkInTime && !!errors.checkInTime}
                                        helperText={touched.checkInTime && errors.checkInTime}
                                    />
                                    <Field
                                        as={TextField}
                                        name="checkOutTime"
                                        label="Check-Out Time (YYYY-MM-DDTHH:MM:SSZ)"
                                        fullWidth
                                        margin="normal"
                                        error={touched.checkOutTime && !!errors.checkOutTime}
                                        helperText={touched.checkOutTime && errors.checkOutTime}
                                    />
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Status</InputLabel>
                                        <Field
                                            as={Select}
                                            name="status"
                                            value={values.status}
                                            onChange={(e) => setFieldValue('status', e.target.value)}
                                            error={touched.status && !!errors.status}
                                        >
                                            <MenuItem value={AttendanceStatus.PRESENT}>Present</MenuItem>
                                            <MenuItem value={AttendanceStatus.ABSENT}>Absent</MenuItem>
                                            <MenuItem value={AttendanceStatus.LATE}>Late</MenuItem>
                                        </Field>
                                    </FormControl>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Device</InputLabel>
                                        <Field
                                            as={Select}
                                            name="deviceId"
                                            value={values.deviceId}
                                            onChange={(e) => setFieldValue('deviceId', e.target.value)}
                                            error={touched.deviceId && !!errors.deviceId}
                                        >
                                            {devices.map(device => (
                                                <MenuItem key={device.id} value={device.id}>
                                                    {device.deviceName}
                                                </MenuItem>
                                            ))}
                                        </Field>
                                    </FormControl>
                                    <Field
                                        as={Switch}
                                        name="emailSent"
                                        checked={values.emailSent}
                                        label="Email Sent"
                                    />
                                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                                    <Button type="submit" variant="contained" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save'}
                                    </Button>
                                </DialogActions>
                            </Form>
                        )}
                    </Formik>
                </Dialog>
            )}
        </Box>
    );
};

export default AttendanceList;
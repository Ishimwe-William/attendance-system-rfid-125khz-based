import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { useDatabase } from '../hooks/useDatabase';
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
    Typography
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { ExamStatus } from '../models/types';

const ExamsList = () => {
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [error, setError] = useState(null);
    const { addDocument, updateDocument, deleteDocument, loading } = useDatabase();

    useEffect(() => {
        // Fetch exams
        const examQuery = query(collection(db, COLLECTIONS.EXAMS));
        const unsubscribeExams = onSnapshot(examQuery, (snapshot) => {
            setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch courses for courseId dropdown
        const courseQuery = query(collection(db, COLLECTIONS.COURSES));
        const unsubscribeCourses = onSnapshot(courseQuery, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeExams();
            unsubscribeCourses();
        };
    }, []);

    const handleOpen = (exam = null) => {
        setEditingExam(exam);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingExam(null);
        setError(null);
    };

    const handleSubmit = async (values) => {
        try {
            // Calculate duration if startTime and endTime are provided
            let duration = values.duration;
            if (values.startTime && values.endTime) {
                const start = new Date(`1970-01-01T${values.startTime}:00`);
                const end = new Date(`1970-01-01T${values.endTime}:00`);
                duration = Math.round((end - start) / 60000); // Convert ms to minutes
            }

            const examData = {
                ...values,
                duration: duration || 0,
            };

            if (editingExam) {
                await updateDocument(COLLECTIONS.EXAMS, editingExam.id, examData);
            } else {
                await addDocument(COLLECTIONS.EXAMS, {
                    ...examData,
                    createdAt: new Date().toISOString(),
                });
            }
            handleClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDocument(COLLECTIONS.EXAMS, id);
        } catch (err) {
            setError(err.message);
        }
    };

    const validationSchema = Yup.object({
        examName: Yup.string().required('Required'),
        courseId: Yup.string().required('Required'),
        examDate: Yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').required('Required'),
        startTime: Yup.string().matches(/^\d{2}:\d{2}$/, 'Time must be HH:MM').required('Required'),
        endTime: Yup.string().matches(/^\d{2}:\d{2}$/, 'Time must be HH:MM').required('Required'),
        duration: Yup.number().min(0, 'Duration must be non-negative').optional(),
        location: Yup.string().required('Required'),
        status: Yup.string().oneOf([ExamStatus.ACTIVE, ExamStatus.COMPLETED, ExamStatus.CANCELLED]).required('Required'),
    });

    const columns = [
        { field: 'examName', headerName: 'Exam Name', width: 150 },
        {
            field: 'courseId',
            headerName: 'Course',
            width: 120,
            valueGetter: (params) => {
                const course = courses.find(c => c.id === params.value);
                return course ? course.courseCode : params.value || 'N/A';
            },
        },
        { field: 'examDate', headerName: 'Date', width: 120 },
        { field: 'startTime', headerName: 'Start Time', width: 100 },
        { field: 'endTime', headerName: 'End Time', width: 100 },
        { field: 'duration', headerName: 'Duration (min)', width: 100 },
        { field: 'location', headerName: 'Location', width: 120 },
        { field: 'status', headerName: 'Status', width: 100 },
        { field: 'createdAt', headerName: 'Created At', width: 180 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <>
                    <Button onClick={() => handleOpen(params.row)}>Edit</Button>
                    <Button onClick={() => handleDelete(params.id)} color="error">Delete</Button>
                </>
            ),
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Exams</Typography>
            <Button
                variant="contained"
                onClick={() => handleOpen()}
                sx={{ mb: 2 }}
            >
                Add Exam
            </Button>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={exams}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingExam ? 'Edit Exam' : 'Add Exam'}</DialogTitle>
                <Formik
                    initialValues={
                        editingExam || {
                            examName: '',
                            courseId: '',
                            examDate: '',
                            startTime: '',
                            endTime: '',
                            duration: '',
                            location: '',
                            status: ExamStatus.ACTIVE,
                        }
                    }
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ errors, touched, values, setFieldValue }) => (
                        <Form>
                            <DialogContent>
                                <Field
                                    as={TextField}
                                    name="examName"
                                    label="Exam Name"
                                    fullWidth
                                    margin="normal"
                                    error={touched.examName && !!errors.examName}
                                    helperText={touched.examName && errors.examName}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Course</InputLabel>
                                    <Field
                                        as={Select}
                                        name="courseId"
                                        value={values.courseId}
                                        onChange={(e) => setFieldValue('courseId', e.target.value)}
                                        error={touched.courseId && !!errors.courseId}
                                    >
                                        {courses.map(course => (
                                            <MenuItem key={course.id} value={course.id}>
                                                {course.courseCode}
                                            </MenuItem>
                                        ))}
                                    </Field>
                                </FormControl>
                                <Field
                                    as={TextField}
                                    name="examDate"
                                    label="Exam Date (YYYY-MM-DD)"
                                    fullWidth
                                    margin="normal"
                                    error={touched.examDate && !!errors.examDate}
                                    helperText={touched.examDate && errors.examDate}
                                />
                                <Field
                                    as={TextField}
                                    name="startTime"
                                    label="Start Time (HH:MM)"
                                    fullWidth
                                    margin="normal"
                                    error={touched.startTime && !!errors.startTime}
                                    helperText={touched.startTime && errors.startTime}
                                />
                                <Field
                                    as={TextField}
                                    name="endTime"
                                    label="End Time (HH:MM)"
                                    fullWidth
                                    margin="normal"
                                    error={touched.endTime && !!errors.endTime}
                                    helperText={touched.endTime && errors.endTime}
                                />
                                <Field
                                    as={TextField}
                                    name="duration"
                                    label="Duration (minutes)"
                                    type="number"
                                    fullWidth
                                    margin="normal"
                                    error={touched.duration && !!errors.duration}
                                    helperText={touched.duration && errors.duration}
                                />
                                <Field
                                    as={TextField}
                                    name="location"
                                    label="Location"
                                    fullWidth
                                    margin="normal"
                                    error={touched.location && !!errors.location}
                                    helperText={touched.location && errors.location}
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
                                        <MenuItem value={ExamStatus.ACTIVE}>Active</MenuItem>
                                        <MenuItem value={ExamStatus.COMPLETED}>Completed</MenuItem>
                                        <MenuItem value={ExamStatus.CANCELLED}>Cancelled</MenuItem>
                                    </Field>
                                </FormControl>
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
        </Box>
    );
};

export default ExamsList;
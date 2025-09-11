import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs, where, updateDoc, arrayRemove } from 'firebase/firestore';
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
    Typography,
    Chip
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const CoursesList = () => {
    const [courses, setCourses] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [students, setStudents] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [error, setError] = useState(null);
    const { addDocument, updateDocument, deleteDocument, loading } = useDatabase();

    useEffect(() => {
        // Fetch courses
        const courseQuery = query(collection(db, COLLECTIONS.COURSES));
        const unsubscribeCourses = onSnapshot(courseQuery, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch lecturers for lecturerId dropdown
        const lecturerQuery = query(collection(db, COLLECTIONS.LECTURERS));
        const unsubscribeLecturers = onSnapshot(lecturerQuery, (snapshot) => {
            setLecturers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch students for students dropdown
        const studentQuery = query(collection(db, COLLECTIONS.STUDENTS));
        const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeCourses();
            unsubscribeLecturers();
            unsubscribeStudents();
        };
    }, []);

    const handleOpen = (course = null) => {
        setEditingCourse(course);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingCourse(null);
        setError(null);
    };

    const handleSubmit = async (values) => {
        try {
            if (editingCourse) {
                await updateDocument(COLLECTIONS.COURSES, editingCourse.id, values);
            } else {
                await addDocument(COLLECTIONS.COURSES, {
                    ...values,
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
            // Check if course is referenced by exams
            const examQuery = query(collection(db, COLLECTIONS.EXAMS), where('courseId', '==', id));
            const examSnapshot = await getDocs(examQuery);
            if (!examSnapshot.empty) {
                setError('Cannot delete course: referenced by exams.');
                return;
            }

            // Update students.enrolledCourses
            const studentQuery = query(collection(db, COLLECTIONS.STUDENTS), where('enrolledCourses', 'array-contains', id));
            const studentSnapshot = await getDocs(studentQuery);
            for (const doc of studentSnapshot.docs) {
                await updateDoc(doc.ref, {
                    enrolledCourses: arrayRemove(id),
                });
            }

            await deleteDocument(COLLECTIONS.COURSES, id);
        } catch (err) {
            setError(err.message);
        }
    };

    const validationSchema = Yup.object({
        courseCode: Yup.string().required('Required'),
        courseName: Yup.string().required('Required'),
        lecturerId: Yup.string().required('Required'),
        students: Yup.array().of(Yup.string()).optional(),
    });

    const columns = [
        { field: 'courseCode', headerName: 'Course Code', width: 120 },
        { field: 'courseName', headerName: 'Course Name', width: 150 },
        {
            field: 'lecturerId',
            headerName: 'Lecturer',
            width: 150,
            valueGetter: (params) => {
                const lecturer = lecturers.find(l => l.id === params.value);
                return lecturer ? lecturer.name : params.value || 'N/A';
            },
        },
        {
            field: 'students',
            headerName: 'Students',
            width: 150,
            renderCell: (params) => (
                <Chip label={params.value.length || 0} color="primary" />
            ),
        },
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
            <Typography variant="h4" gutterBottom>Courses</Typography>
            <Button
                variant="contained"
                onClick={() => handleOpen()}
                sx={{ mb: 2 }}
            >
                Add Course
            </Button>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={courses}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingCourse ? 'Edit Course' : 'Add Course'}</DialogTitle>
                <Formik
                    initialValues={
                        editingCourse || {
                            courseCode: '',
                            courseName: '',
                            lecturerId: '',
                            students: [],
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
                                    name="courseCode"
                                    label="Course Code"
                                    fullWidth
                                    margin="normal"
                                    error={touched.courseCode && !!errors.courseCode}
                                    helperText={touched.courseCode && errors.courseCode}
                                />
                                <Field
                                    as={TextField}
                                    name="courseName"
                                    label="Course Name"
                                    fullWidth
                                    margin="normal"
                                    error={touched.courseName && !!errors.courseName}
                                    helperText={touched.courseName && errors.courseName}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Lecturer</InputLabel>
                                    <Field
                                        as={Select}
                                        name="lecturerId"
                                        value={values.lecturerId}
                                        onChange={(e) => setFieldValue('lecturerId', e.target.value)}
                                        error={touched.lecturerId && !!errors.lecturerId}
                                    >
                                        {lecturers.map(lecturer => (
                                            <MenuItem key={lecturer.id} value={lecturer.id}>
                                                {lecturer.name}
                                            </MenuItem>
                                        ))}
                                    </Field>
                                </FormControl>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Students</InputLabel>
                                    <Field
                                        as={Select}
                                        name="students"
                                        multiple
                                        value={values.students}
                                        onChange={(e) => setFieldValue('students', e.target.value)}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {selected.map((value) => (
                                                    <Chip key={value} label={students.find(s => s.id === value)?.name || value} />
                                                ))}
                                            </Box>
                                        )}
                                    >
                                        {students.map(student => (
                                            <MenuItem key={student.id} value={student.id}>
                                                {student.name}
                                            </MenuItem>
                                        ))}
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

export default CoursesList;
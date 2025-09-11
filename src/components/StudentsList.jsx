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

const StudentsList = () => {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [error, setError] = useState(null);
    const { addDocument, updateDocument, deleteDocument, loading } = useDatabase();

    useEffect(() => {
        // Fetch students
        const studentQuery = query(collection(db, COLLECTIONS.STUDENTS));
        const unsubscribeStudents = onSnapshot(studentQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch courses for enrolledCourses dropdown
        const courseQuery = query(collection(db, COLLECTIONS.COURSES));
        const unsubscribeCourses = onSnapshot(courseQuery, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeStudents();
            unsubscribeCourses();
        };
    }, []);

    const handleOpen = (student = null) => {
        setEditingStudent(student);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingStudent(null);
        setError(null);
    };

    const handleSubmit = async (values) => {
        try {
            if (editingStudent) {
                await updateDocument(COLLECTIONS.STUDENTS, editingStudent.id, values);
            } else {
                await addDocument(COLLECTIONS.STUDENTS, {
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
            // Check if student is referenced by attendance
            const attendanceQuery = query(collection(db, COLLECTIONS.ATTENDANCE), where('studentId', '==', id));
            const attendanceSnapshot = await getDocs(attendanceQuery);
            if (!attendanceSnapshot.empty) {
                setError('Cannot delete student: referenced by attendance records.');
                return;
            }

            // Update courses.students
            const courseQuery = query(collection(db, COLLECTIONS.COURSES), where('students', 'array-contains', id));
            const courseSnapshot = await getDocs(courseQuery);
            for (const doc of courseSnapshot.docs) {
                await updateDoc(doc.ref, {
                    students: arrayRemove(id),
                });
            }

            await deleteDocument(COLLECTIONS.STUDENTS, id);
        } catch (err) {
            setError(err.message);
        }
    };

    const validationSchema = Yup.object({
        name: Yup.string().required('Required'),
        email: Yup.string().email('Invalid email').required('Required'),
        rfidTag: Yup.string().required('Required'),
        enrolledCourses: Yup.array().of(Yup.string()).optional(),
    });

    const columns = [
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'rfidTag', headerName: 'RFID Tag', width: 120 },
        {
            field: 'enrolledCourses',
            headerName: 'Courses',
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
            <Typography variant="h4" gutterBottom>Students</Typography>
            <Button
                variant="contained"
                onClick={() => handleOpen()}
                sx={{ mb: 2 }}
            >
                Add Student
            </Button>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={students}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
                <Formik
                    initialValues={
                        editingStudent || {
                            name: '',
                            email: '',
                            rfidTag: '',
                            enrolledCourses: [],
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
                                    name="name"
                                    label="Name"
                                    fullWidth
                                    margin="normal"
                                    error={touched.name && !!errors.name}
                                    helperText={touched.name && errors.name}
                                />
                                <Field
                                    as={TextField}
                                    name="email"
                                    label="Email"
                                    fullWidth
                                    margin="normal"
                                    error={touched.email && !!errors.email}
                                    helperText={touched.email && errors.email}
                                />
                                <Field
                                    as={TextField}
                                    name="rfidTag"
                                    label="RFID Tag"
                                    fullWidth
                                    margin="normal"
                                    error={touched.rfidTag && !!errors.rfidTag}
                                    helperText={touched.rfidTag && errors.rfidTag}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Enrolled Courses</InputLabel>
                                    <Field
                                        as={Select}
                                        name="enrolledCourses"
                                        multiple
                                        value={values.enrolledCourses}
                                        onChange={(e) => setFieldValue('enrolledCourses', e.target.value)}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {selected.map((value) => (
                                                    <Chip key={value} label={courses.find(c => c.id === value)?.courseCode || value} />
                                                ))}
                                            </Box>
                                        )}
                                    >
                                        {courses.map(course => (
                                            <MenuItem key={course.id} value={course.id}>
                                                {course.courseCode}
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

export default StudentsList;
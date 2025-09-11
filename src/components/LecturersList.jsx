import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs, where, updateDoc } from 'firebase/firestore';
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

const LecturersList = () => {
    const [lecturers, setLecturers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingLecturer, setEditingLecturer] = useState(null);
    const [error, setError] = useState(null);
    const { addDocument, updateDocument, deleteDocument, loading } = useDatabase();

    useEffect(() => {
        // Fetch lecturers
        const lecturerQuery = query(collection(db, COLLECTIONS.LECTURERS));
        const unsubscribeLecturers = onSnapshot(lecturerQuery, (snapshot) => {
            setLecturers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch courses for assignedCourses dropdown
        const courseQuery = query(collection(db, COLLECTIONS.COURSES));
        const unsubscribeCourses = onSnapshot(courseQuery, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeLecturers();
            unsubscribeCourses();
        };
    }, []);

    const handleOpen = (lecturer = null) => {
        setEditingLecturer(lecturer);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingLecturer(null);
        setError(null);
    };

    const handleSubmit = async (values) => {
        try {
            if (editingLecturer) {
                await updateDocument(COLLECTIONS.LECTURERS, editingLecturer.id, values);
            } else {
                await addDocument(COLLECTIONS.LECTURERS, {
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
            // Check if lecturer is referenced by courses
            const courseQuery = query(collection(db, COLLECTIONS.COURSES), where('lecturerId', '==', id));
            const courseSnapshot = await getDocs(courseQuery);
            if (!courseSnapshot.empty) {
                setError('Cannot delete lecturer: assigned to courses.');
                return;
            }

            await deleteDocument(COLLECTIONS.LECTURERS, id);
        } catch (err) {
            setError(err.message);
        }
    };

    const validationSchema = Yup.object({
        name: Yup.string().required('Required'),
        email: Yup.string().email('Invalid email').required('Required'),
        department: Yup.string().required('Required'),
        assignedCourses: Yup.array().of(Yup.string()).optional(),
    });

    const columns = [
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'department', headerName: 'Department', width: 150 },
        {
            field: 'assignedCourses',
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
            <Typography variant="h4" gutterBottom>Lecturers</Typography>
            <Button
                variant="contained"
                onClick={() => handleOpen()}
                sx={{ mb: 2 }}
            >
                Add Lecturer
            </Button>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={lecturers}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingLecturer ? 'Edit Lecturer' : 'Add Lecturer'}</DialogTitle>
                <Formik
                    initialValues={
                        editingLecturer || {
                            name: '',
                            email: '',
                            department: '',
                            assignedCourses: [],
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
                                    name="department"
                                    label="Department"
                                    fullWidth
                                    margin="normal"
                                    error={touched.department && !!errors.department}
                                    helperText={touched.department && errors.department}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Assigned Courses</InputLabel>
                                    <Field
                                        as={Select}
                                        name="assignedCourses"
                                        multiple
                                        value={values.assignedCourses}
                                        onChange={(e) => setFieldValue('assignedCourses', e.target.value)}
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

export default LecturersList;
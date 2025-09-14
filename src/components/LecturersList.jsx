import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Typography,
    Alert,
    Snackbar,
    Chip
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search
} from '@mui/icons-material';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const LecturersList = () => {
    const [lecturers, setLecturers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLecturer, setEditingLecturer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: ''
    });
    const [formErrors, setFormErrors] = useState({});

    const fetchLecturers = async () => {
        try {
            setLoading(true);
            setError('');

            const lecturersRef = collection(db, 'lecturers');
            const q = query(lecturersRef, orderBy('name'));
            const querySnapshot = await getDocs(q);

            const lecturersData = [];
            querySnapshot.forEach((doc) => {
                lecturersData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            setLecturers(lecturersData);
        } catch (error) {
            console.error('Error fetching lecturers:', error);
            setError('Failed to load lecturers');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const coursesRef = collection(db, 'courses');
            const querySnapshot = await getDocs(coursesRef);

            const coursesData = [];
            querySnapshot.forEach((doc) => {
                coursesData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            setCourses(coursesData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    useEffect(() => {
        fetchLecturers();
        fetchCourses();
    }, []);

    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddLecturer = () => {
        setEditingLecturer(null);
        setFormData({ name: '', email: '' });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleEditLecturer = (lecturer) => {
        setEditingLecturer(lecturer);
        setFormData({
            name: lecturer.name,
            email: lecturer.email
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleSaveLecturer = async () => {
        if (!validateForm()) return;

        try {
            setError('');

            const lecturerData = {
                name: formData.name.trim(),
                email: formData.email.trim()
            };

            if (editingLecturer) {
                const lecturerRef = doc(db, 'lecturers', editingLecturer.id);
                await updateDoc(lecturerRef, lecturerData);
                setSuccess('Lecturer updated successfully');
            } else {
                await addDoc(collection(db, 'lecturers'), {
                    ...lecturerData,
                    createdAt: new Date()
                });
                setSuccess('Lecturer added successfully');
            }

            setDialogOpen(false);
            fetchLecturers();
        } catch (error) {
            console.error('Error saving lecturer:', error);
            setError('Failed to save lecturer');
        }
    };

    const handleDeleteLecturer = async (lecturer) => {
        if (!window.confirm(`Are you sure you want to delete ${lecturer.name}?`)) {
            return;
        }

        try {
            setError('');
            await deleteDoc(doc(db, 'lecturers', lecturer.id));
            setSuccess('Lecturer deleted successfully');
            fetchLecturers();
        } catch (error) {
            console.error('Error deleting lecturer:', error);
            setError('Failed to delete lecturer');
        }
    };

    const filteredLecturers = lecturers.filter(lecturer =>
        lecturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecturer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Lecturers Management
            </Typography>

            {/* Header Actions */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    placeholder="Search lecturers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{ flexGrow: 1, maxWidth: 400 }}
                />
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddLecturer}
                >
                    Add Lecturer
                </Button>
            </Box>

            {/* Lecturers Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Assigned Courses</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLecturers.length > 0 ? (
                            filteredLecturers.map((lecturer) => (
                                <TableRow key={lecturer.id}>
                                    <TableCell>{lecturer.name}</TableCell>
                                    <TableCell>{lecturer.email}</TableCell>
                                    <TableCell>
                                        {courses.filter(course => course.assignedLecturers?.includes(lecturer.id)).map((course) => (
                                            <Chip
                                                key={course.id}
                                                label={course.courseCode}
                                                size="small"
                                                sx={{ mr: 1 }}
                                            />
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        {lecturer.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => handleEditLecturer(lecturer)}
                                            color="primary"
                                            title="Edit Lecturer"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDeleteLecturer(lecturer)}
                                            color="error"
                                            title="Delete Lecturer"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography color="text.secondary">
                                        {searchTerm ? 'No lecturers found matching your search' : 'No lecturers added yet'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Lecturer Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingLecturer ? 'Edit Lecturer' : 'Add New Lecturer'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        margin="normal"
                        required
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        margin="normal"
                        required
                        error={!!formErrors.email}
                        helperText={formErrors.email}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveLecturer} variant="contained">
                        {editingLecturer ? 'Update' : 'Add'} Lecturer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success/Error Snackbars */}
            <Snackbar
                open={!!success}
                autoHideDuration={4000}
                onClose={() => setSuccess('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSuccess('')} severity="success">
                    {success}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setError('')} severity="error">
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LecturersList;
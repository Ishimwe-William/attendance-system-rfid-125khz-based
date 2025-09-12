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
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    Checkbox,
    ListItemText,
    MenuItem,
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
    where
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CoursesList = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [formData, setFormData] = useState({
        courseCode: '',
        courseName: '',
        instructor: ''
    });
    const [formErrors, setFormErrors] = useState({});

    const [lecturerDialogOpen, setLecturerDialogOpen] = useState(false);
    const [assigningCourse, setAssigningCourse] = useState(null);
    const [lecturers, setLecturers] = useState([]);
    const [selectedLecturers, setSelectedLecturers] = useState([]);

    // Fetch courses from Firestore
    const fetchCourses = async () => {
        try {
            setLoading(true);
            setError('');

            const coursesRef = collection(db, 'courses');
            const q = query(coursesRef, orderBy('courseCode'));
            const querySnapshot = await getDocs(q);

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
            setError('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    // Fetch lecturers from Firestore
    const fetchLecturers = async () => {
        try {
            const lecturersRef = collection(db, 'lecturers');
            const querySnapshot = await getDocs(lecturersRef);

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
        }
    };

    useEffect(() => {
        fetchCourses();
        fetchLecturers();
    }, []);

    // Validate form data
    const validateForm = () => {
        const errors = {};

        if (!formData.courseCode.trim()) {
            errors.courseCode = 'Course code is required';
        } else if (!/^[A-Z]{2,4}\d{3,4}$/.test(formData.courseCode.trim())) {
            errors.courseCode = 'Invalid format (e.g., MATH101)';
        }

        if (!formData.courseName.trim()) {
            errors.courseName = 'Course name is required';
        } else if (formData.courseName.trim().length < 3) {
            errors.courseName = 'Course name must be at least 3 characters';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Check if course code already exists
    const checkDuplicateCourseCode = async () => {
        try {
            const coursesRef = collection(db, 'courses');
            const codeQuery = query(coursesRef, where('courseCode', '==', formData.courseCode.trim().toUpperCase()));
            const codeSnapshot = await getDocs(codeQuery);

            if (!codeSnapshot.empty && (!editingCourse || codeSnapshot.docs[0].id !== editingCourse.id)) {
                setFormErrors(prev => ({ ...prev, courseCode: 'Course code already exists' }));
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking duplicates:', error);
            setError('Failed to validate course code');
            return false;
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'courseCode' ? value.toUpperCase() : value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Open dialog for adding new course
    const handleAddCourse = () => {
        setEditingCourse(null);
        setFormData({ courseCode: '', courseName: '', instructor: '' });
        setFormErrors({});
        setDialogOpen(true);
    };

    // Open dialog for editing course
    const handleEditCourse = (course) => {
        setEditingCourse(course);
        setFormData({
            courseCode: course.courseCode,
            courseName: course.courseName,
            instructor: course.instructor
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    // Assign Lecturers Dialog
    const handleAssignLecturers = (course) => {
        setAssigningCourse(course);
        setSelectedLecturers(course.assignedLecturers || []);
        setLecturerDialogOpen(true);
    };

    // Close dialog
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingCourse(null);
        setFormData({ courseCode: '', courseName: '', instructor: '' });
        setFormErrors({});
    };

    const handleCloseLecturerDialog = () => {
        setLecturerDialogOpen(false);
        setAssigningCourse(null);
        setSelectedLecturers([]);
    };

    // Save course (create or update)
    const handleSaveCourse = async () => {
        if (!validateForm()) return;
        if (!(await checkDuplicateCourseCode())) return;

        try {
            setError('');

            const courseData = {
                courseCode: formData.courseCode.trim().toUpperCase(),
                courseName: formData.courseName.trim(),
            };

            if (editingCourse) {
                const courseRef = doc(db, 'courses', editingCourse.id);
                await updateDoc(courseRef, {
                    ...courseData,
                    updatedAt: new Date()
                });
                setSuccess('Course updated successfully');
            } else {
                await addDoc(collection(db, 'courses'), {
                    ...courseData,
                    createdAt: new Date()
                });
                setSuccess('Course added successfully');
            }

            handleCloseDialog();
            fetchCourses();
        } catch (error) {
            console.error('Error saving course:', error);
            setError('Failed to save course');
        }
    };

    // Save lecturer assignment
    const handleSaveLecturerAssignment = async () => {
        try {
            const courseRef = doc(db, 'courses', assigningCourse.id);
            await updateDoc(courseRef, {
                assignedLecturers: selectedLecturers,
                updatedAt: new Date()
            });
            setSuccess('Lecturers assigned successfully');
            handleCloseLecturerDialog();
            fetchCourses();
        } catch (error) {
            console.error('Error assigning lecturers:', error);
            setError('Failed to assign lecturers');
        }
    };

    const handleLecturerSelectionChange = (e) => {
        setSelectedLecturers(e.target.value);
    };

    // Delete course
    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`Are you sure you want to delete ${course.courseCode}?`)) {
            return;
        }

        try {
            setError('');
            await deleteDoc(doc(db, 'courses', course.id));
            setSuccess('Course deleted successfully');
            fetchCourses();
        } catch (error) {
            console.error('Error deleting course:', error);
            setError('Failed to delete course');
        }
    };

    // Filter courses based on search term
    const filteredCourses = courses.filter(course =>
        course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.assignedLecturers?.some(lecturerId => {
            const lecturer = lecturers.find(l => l.id === lecturerId);
            return lecturer?.name.toLowerCase().includes(searchTerm.toLowerCase());
        })
    );

    const handleCloseSnackbar = () => {
        setError('');
        setSuccess('');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Courses Management
            </Typography>

            {/* Header Actions */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    placeholder="Search courses..."
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
                    onClick={handleAddCourse}
                >
                    Add Course
                </Button>
            </Box>

            {/* Courses Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Course Code</TableCell>
                            <TableCell>Course Name</TableCell>
                            <TableCell>Assigned Lecturers</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell>
                                        <Typography variant="body2" component="code" sx={{ fontWeight: 'bold' }}>
                                            {course.courseCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{course.courseName}</TableCell>
                                    <TableCell>
                                        {course.assignedLecturers?.map((lecturerId) => {
                                            const lecturer = lecturers.find(l => l.id === lecturerId);
                                            return (
                                                <Chip
                                                    key={lecturerId}
                                                    label={lecturer?.name || lecturerId}
                                                    size="small"
                                                    sx={{ mr: 1 }}
                                                />
                                            );
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        {course.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => handleEditCourse(course)}
                                            color="primary"
                                            title="Edit Course"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleAssignLecturers(course)}
                                            color="primary"
                                            title="Assign Lecturers"
                                        >
                                            <Add />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDeleteCourse(course)}
                                            color="error"
                                            title="Delete Course"
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
                                        {searchTerm ? 'No courses found matching your search' : 'No courses added yet'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Course Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingCourse ? 'Edit Course' : 'Add New Course'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Course Code"
                        name="courseCode"
                        value={formData.courseCode}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                        error={!!formErrors.courseCode}
                        helperText={formErrors.courseCode || 'e.g., MATH101, PHYS201'}
                        placeholder="MATH101"
                    />
                    <TextField
                        fullWidth
                        label="Course Name"
                        name="courseName"
                        value={formData.courseName}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                        error={!!formErrors.courseName}
                        helperText={formErrors.courseName}
                        placeholder="Calculus I"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveCourse} variant="contained">
                        {editingCourse ? 'Update' : 'Add'} Course
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Assign Lecturers Dialog */}
            <Dialog open={lecturerDialogOpen} onClose={handleCloseLecturerDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Assign Lecturers - {assigningCourse?.courseCode}
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Select Lecturers</InputLabel>
                        <Select
                            multiple
                            value={selectedLecturers}
                            onChange={handleLecturerSelectionChange}
                            input={<OutlinedInput label="Select Lecturers" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((lecturerId) => {
                                        const lecturer = lecturers.find(l => l.id === lecturerId);
                                        return (
                                            <Chip
                                                key={lecturerId}
                                                label={lecturer?.name || lecturerId}
                                                size="small"
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                        >
                            {lecturers.map((lecturer) => (
                                <MenuItem key={lecturer.id} value={lecturer.id}>
                                    <Checkbox checked={selectedLecturers.indexOf(lecturer.id) > -1} />
                                    <ListItemText
                                        primary={lecturer.name}
                                        secondary={lecturer.email}
                                    />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {lecturers.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            No lecturers available. Please add lecturers first.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLecturerDialog}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveLecturerAssignment}
                        variant="contained"
                        disabled={lecturers.length === 0}
                    >
                        Save Assignment
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success/Error Snackbars */}
            <Snackbar
                open={!!success}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity="success">
                    {success}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity="error">
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CoursesList;
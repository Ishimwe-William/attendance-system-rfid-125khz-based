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
    Chip,
    Stack,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    Checkbox,
    ListItemText,
    MenuItem
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

const StudentsList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        rfidTag: ''
    });
    const [formErrors, setFormErrors] = useState({});

    // Course enrollment states
    const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
    const [enrollingStudent, setEnrollingStudent] = useState(null);
    const [courses, setCourses] = useState([]); // Fetch courses from Firestore
    const [selectedCourses, setSelectedCourses] = useState([]);

    // Fetch students from Firestore
    const fetchStudents = async () => {
        try {
            setLoading(true);
            setError('');

            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const studentsData = [];
            querySnapshot.forEach((doc) => {
                studentsData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            setStudents(studentsData);
        } catch (error) {
            console.error('Error fetching students:', error);
            setError('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    // Fetch courses from Firestore
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
        fetchStudents();
        fetchCourses();
    }, []);

    // Form validation
    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        if (!formData.rfidTag.trim()) {
            errors.rfidTag = 'RFID Tag is required';
        } else if (formData.rfidTag.trim().length < 8) {
            errors.rfidTag = 'RFID Tag must be at least 8 characters';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Check if email or RFID tag already exists
    const checkDuplicates = async () => {
        try {
            const studentsRef = collection(db, 'students');

            // Check email
            const emailQuery = query(studentsRef, where('email', '==', formData.email.trim()));
            const emailSnapshot = await getDocs(emailQuery);

            // Check RFID tag
            const rfidQuery = query(studentsRef, where('rfidTag', '==', formData.rfidTag.trim()));
            const rfidSnapshot = await getDocs(rfidQuery);

            const errors = {};

            if (!emailSnapshot.empty && (!editingStudent || emailSnapshot.docs[0].id !== editingStudent.id)) {
                errors.email = 'Email already exists';
            }

            if (!rfidSnapshot.empty && (!editingStudent || rfidSnapshot.docs[0].id !== editingStudent.id)) {
                errors.rfidTag = 'RFID Tag already exists';
            }

            setFormErrors(errors);
            return Object.keys(errors).length === 0;
        } catch (error) {
            console.error('Error checking duplicates:', error);
            setError('Failed to validate data');
            return false;
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear specific field error
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Open dialog for adding new student
    const handleAddStudent = () => {
        setEditingStudent(null);
        setFormData({
            name: '',
            email: '',
            rfidTag: ''
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    // Open dialog for editing student
    const handleEditStudent = (student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            email: student.email,
            rfidTag: student.rfidTag
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    // Open dialog for enrolling courses
    const handleEnrollCourses = (student) => {
        setEnrollingStudent(student);
        setSelectedCourses(student.enrolledCourses || []);
        setEnrollmentDialogOpen(true);
    };

    // Close dialog
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingStudent(null);
        setFormData({
            name: '',
            email: '',
            rfidTag: ''
        });
        setFormErrors({});
    };

    const handleCloseEnrollmentDialog = () => {
        setEnrollmentDialogOpen(false);
        setEnrollingStudent(null);
        setSelectedCourses([]);
    };

    // Save student (create or update)
    const handleSaveStudent = async () => {
        if (!validateForm()) return;

        if (!(await checkDuplicates())) return;

        try {
            setError('');

            const studentData = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                rfidTag: formData.rfidTag.trim(),
                enrolledCourses: editingStudent?.enrolledCourses || []
            };

            if (editingStudent) {
                // Update existing student
                const studentRef = doc(db, 'students', editingStudent.id);
                await updateDoc(studentRef, {
                    ...studentData,
                    updatedAt: new Date()
                });
                setSuccess('Student updated successfully');
            } else {
                // Create new student
                await addDoc(collection(db, 'students'), {
                    ...studentData,
                    createdAt: new Date()
                });
                setSuccess('Student added successfully');
            }

            handleCloseDialog();
            fetchStudents();
        } catch (error) {
            console.error('Error saving student:', error);
            setError('Failed to save student');
        }
    };

    // Save course enrollment
    const handleSaveEnrollment = async () => {
        try {
            const studentRef = doc(db, 'students', enrollingStudent.id);
            await updateDoc(studentRef, {
                enrolledCourses: selectedCourses,
                updatedAt: new Date()
            });
            setSuccess('Courses enrolled successfully');
            handleCloseEnrollmentDialog();
            fetchStudents();
        } catch (error) {
            console.error('Error enrolling courses:', error);
            setError('Failed to enroll courses');
        }
    };

    const handleCourseSelectionChange = (e) => {
        setSelectedCourses(e.target.value);
    };

    // Delete student
    const handleDeleteStudent = async (student) => {
        if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) {
            return;
        }

        try {
            setError('');
            await deleteDoc(doc(db, 'students', student.id));
            setSuccess('Student deleted successfully');
            fetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
            setError('Failed to delete student');
        }
    };

    // Filter students based on search term
    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rfidTag.toLowerCase().includes(searchTerm.toLowerCase())
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
                Students Management
            </Typography>

            {/* Header Actions */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    placeholder="Search students..."
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
                    onClick={handleAddStudent}
                >
                    Add Student
                </Button>
            </Box>

            {/* Students Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>RFID Tag</TableCell>
                            <TableCell>Enrolled Courses</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>
                                        <code>{student.rfidTag}</code>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {student.enrolledCourses?.length > 0 ? (
                                                student.enrolledCourses.map((course, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={course}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ))
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No courses
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        {student.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => handleEditStudent(student)}
                                            color="primary"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleEnrollCourses(student)}
                                            color="primary"
                                            title="Enroll"
                                        >
                                            <Add />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDeleteStudent(student)}
                                            color="error"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary">
                                        {searchTerm ? 'No students found matching your search' : 'No students added yet'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Student Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingStudent ? 'Edit Student' : 'Add New Student'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                        error={!!formErrors.email}
                        helperText={formErrors.email}
                    />
                    <TextField
                        fullWidth
                        label="RFID Tag"
                        name="rfidTag"
                        value={formData.rfidTag}
                        onChange={handleInputChange}
                        margin="normal"
                        required
                        error={!!formErrors.rfidTag}
                        helperText={formErrors.rfidTag || 'Unique identifier for student card'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveStudent} variant="contained">
                        {editingStudent ? 'Update' : 'Add'} Student
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Course Enrollment Dialog */}
            <Dialog open={enrollmentDialogOpen} onClose={handleCloseEnrollmentDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Enroll Courses - {enrollingStudent?.name}
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Select Courses</InputLabel>
                        <Select
                            multiple
                            value={selectedCourses}
                            onChange={handleCourseSelectionChange}
                            input={<OutlinedInput label="Select Courses" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((courseId) => {
                                        const course = courses.find(c => c.courseCode === courseId);
                                        return (
                                            <Chip
                                                key={courseId}
                                                label={course ? `${course.courseCode} - ${course.courseName}` : courseId}
                                                size="small"
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                        >
                            {courses.map((course) => (
                                <MenuItem key={course.courseCode} value={course.courseCode}>
                                    <Checkbox checked={selectedCourses.indexOf(course.courseCode) > -1} />
                                    <ListItemText
                                        primary={`${course.courseCode} - ${course.courseName}`}
                                        secondary={course.instructor}
                                    />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {courses.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            No courses available. Please add courses first.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEnrollmentDialog}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveEnrollment}
                        variant="contained"
                        disabled={courses.length === 0}
                    >
                        Save Enrollment
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

export default StudentsList;
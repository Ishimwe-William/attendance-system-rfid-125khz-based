import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DataGrid } from '@mui/x-data-grid';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Alert,
    Snackbar,
} from '@mui/material';

const ExamsList = () => {
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [isEdit, setIsEdit] = useState(false);
    const [errors, setErrors] = useState({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [newExam, setNewExam] = useState({
        courseCode: '',
        examType: '',
        examDate: '',
        startTime: '',
        endTime: '',
        duration: '',
        room: '',
        status: 'active',
    });

    useEffect(() => {
        const examsQuery = query(collection(db, 'exams'));
        const unsubscribe = onSnapshot(examsQuery, (snapshot) => {
            const examsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || null,
                    updatedAt: data.updatedAt?.toDate?.() || null,
                };
            });
            setExams(examsData);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const coursesQuery = query(collection(db, 'courses'));
        const unsubscribe = onSnapshot(coursesQuery, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Helper function to add hours to time string
    const addHoursToTime = (timeString, hours) => {
        const [hourStr, minuteStr] = timeString.split(':');
        const totalMinutes = parseInt(hourStr) * 60 + parseInt(minuteStr) + (hours * 60);
        const newHour = Math.floor(totalMinutes / 60) % 24;
        const newMinute = totalMinutes % 60;
        return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    };

    // Auto-calculate end time when start time or duration changes
    useEffect(() => {
        if (newExam.startTime && newExam.duration) {
            const calculatedEndTime = addHoursToTime(newExam.startTime, parseFloat(newExam.duration));
            setNewExam(prev => ({ ...prev, endTime: calculatedEndTime }));
        }
    }, [newExam.startTime, newExam.duration]);

    const validateExam = (exam) => {
        const newErrors = {};

        if (!exam.courseCode) newErrors.courseCode = 'Course is required';
        if (!exam.examType) newErrors.examType = 'Exam type is required';
        if (!exam.examDate) newErrors.examDate = 'Exam date is required';
        if (!exam.startTime) newErrors.startTime = 'Start time is required';
        if (!exam.endTime) newErrors.endTime = 'End time is required';
        if (!exam.duration || exam.duration <= 0) newErrors.duration = 'Duration must be greater than 0';
        if (!exam.room.trim()) newErrors.room = 'Room is required';
        if (!exam.status) newErrors.status = 'Status is required';

        // Validate exam date is not in the past
        const examDate = new Date(exam.examDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (examDate < today) {
            newErrors.examDate = 'Exam date cannot be in the past';
        }

        // Validate start time and duration consistency
        if (exam.startTime && exam.duration) {
            const calculatedEndTime = addHoursToTime(exam.startTime, parseFloat(exam.duration));
            if (exam.endTime !== calculatedEndTime) {
                newErrors.endTime = `End time should be ${calculatedEndTime} based on start time and duration`;
            }
        }

        // Validate duration is reasonable (0.5 to 8 hours)
        const duration = parseFloat(exam.duration);
        if (duration < 0.5 || duration > 8) {
            newErrors.duration = 'Duration must be between 0.5 and 8 hours';
        }

        // Validate exam doesn't span midnight unreasonably
        if (exam.startTime && exam.endTime) {
            const start = new Date(`1970-01-01T${exam.startTime}`);
            const end = new Date(`1970-01-01T${exam.endTime}`);
            if (end < start) {
                newErrors.endTime = 'Exam cannot span past midnight';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleOpen = (exam) => {
        setSelectedExam(exam);
        setIsEdit(true);
        setNewExam({
            courseCode: exam.courseCode || '',
            examType: exam.examType || '',
            examDate: exam.examDate || '',
            startTime: exam.startTime || '',
            endTime: exam.endTime || '',
            duration: exam.duration || '',
            room: exam.room || '',
            status: exam.status || 'active',
        });
        setOpen(true);
        setErrors({});
    };

    const handleClose = () => {
        setOpen(false);
        setIsEdit(false);
        setSelectedExam(null);
        setNewExam({
            courseCode: '',
            examType: '',
            examDate: '',
            startTime: '',
            endTime: '',
            duration: '',
            room: '',
            status: 'active',
        });
        setErrors({});
    };

    const handleCreate = async () => {
        if (!validateExam(newExam)) {
            showSnackbar('Please fix validation errors', 'error');
            return;
        }

        try {
            const docRef = doc(collection(db, 'exams'));
            const newExamData = {
                ...newExam,
                duration: parseFloat(newExam.duration),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            await setDoc(docRef, newExamData);
            handleClose();
            showSnackbar('Exam created successfully');
        } catch (error) {
            console.error('Error creating exam:', error);
            showSnackbar('Error creating exam', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateExam(newExam)) {
            showSnackbar('Please fix validation errors', 'error');
            return;
        }

        try {
            const docRef = doc(db, 'exams', selectedExam.id);
            const updatedExamData = {
                ...newExam,
                duration: parseFloat(newExam.duration),
                updatedAt: serverTimestamp(),
            };
            await updateDoc(docRef, updatedExamData);
            handleClose();
            showSnackbar('Exam updated successfully');
        } catch (error) {
            console.error('Error updating exam:', error);
            showSnackbar('Error updating exam', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return;

        try {
            const docRef = doc(db, 'exams', id);
            await deleteDoc(docRef);
            showSnackbar('Exam deleted successfully');
        } catch (error) {
            console.error('Error deleting exam:', error);
            showSnackbar('Error deleting exam', 'error');
        }
    };

    const getCourseNameById = (courseId) => {
        const course = courses.find(c => c.id === courseId);
        return course ? `${course.courseName} - ${course.courseCode}` : 'Unknown Course';
    };

    const columns = [
        {
            field: 'courseCode',
            headerName: 'Course',
            flex: 1,
            minWidth: 200,
            valueGetter: (params) => getCourseNameById(params)
        },
        {
            field: 'examType',
            headerName: 'Type',
            width: 120,
        },
        {
            field: 'examDate',
            headerName: 'Date',
            width: 110,
            valueGetter: (params) => {
                return params ? new Date(params).toLocaleDateString() : '';
            }
        },
        { field: 'startTime', headerName: 'Start', width: 80 },
        { field: 'endTime', headerName: 'End', width: 80 },
        {
            field: 'duration',
            headerName: 'Duration',
            width: 90,
            type: 'number',
            valueFormatter: (params) => `${params}h`
        },
        { field: 'room', headerName: 'Room', width: 90 },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <span style={{
                    color: params.value === 'active' ? '#2e7d32' :
                        params.value === 'completed' ? '#1976d2' :
                            params.value === 'cancelled' ? '#d32f2f' : '#f57c00',
                    fontWeight: 500,
                    fontSize: '0.875rem'
                }}>
                    {params.value}
                </span>
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 140,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpen(params.row)}
                        sx={{ minWidth: 'auto', px: 1 }}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(params.row.id)}
                        sx={{ minWidth: 'auto', px: 1 }}
                    >
                        Del
                    </Button>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Exams Management</Typography>
                <Button
                    variant="contained"
                    onClick={() => setOpen(true)}
                >
                    Create New Exam
                </Button>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <DataGrid
                    rows={exams}
                    columns={columns}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 25 }
                        }
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                    loading={false}
                    density="compact"
                    sx={{
                        '& .MuiDataGrid-cell': {
                            fontSize: '0.875rem'
                        },
                        '& .MuiDataGrid-columnHeader': {
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }
                    }}
                />
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{isEdit ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal" error={!!errors.courseCode}>
                        <InputLabel>Course *</InputLabel>
                        <Select
                            value={newExam.courseCode}
                            onChange={(e) => setNewExam({ ...newExam, courseCode: e.target.value })}
                            label="Course *"
                        >
                            {courses.map((course) => (
                                <MenuItem key={course.id} value={course.id}>
                                    {course.courseName} ({course.courseCode})
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.courseCode && <Typography variant="caption" color="error">{errors.courseCode}</Typography>}
                    </FormControl>

                    <FormControl fullWidth margin="normal" error={!!errors.examType}>
                        <InputLabel>Exam Type *</InputLabel>
                        <Select
                            value={newExam.examType}
                            onChange={(e) => setNewExam({ ...newExam, examType: e.target.value })}
                            label="Exam Type *"
                        >
                            <MenuItem value="Midterm Exam">Midterm Exam</MenuItem>
                            <MenuItem value="Final Exam">Final Exam</MenuItem>
                            <MenuItem value="Quiz">Quiz</MenuItem>
                            <MenuItem value="Assignment">Assignment</MenuItem>
                        </Select>
                        {errors.examType && <Typography variant="caption" color="error">{errors.examType}</Typography>}
                    </FormControl>

                    <TextField
                        label="Exam Date *"
                        value={newExam.examDate}
                        onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                        fullWidth
                        margin="normal"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.examDate}
                        helperText={errors.examDate}
                        inputProps={{
                            min: new Date().toISOString().split('T')[0]
                        }}
                    />

                    <TextField
                        label="Start Time *"
                        value={newExam.startTime}
                        onChange={(e) => setNewExam({ ...newExam, startTime: e.target.value })}
                        fullWidth
                        margin="normal"
                        type="time"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.startTime}
                        helperText={errors.startTime}
                    />

                    <TextField
                        label="Duration (hours) *"
                        value={newExam.duration}
                        onChange={(e) => setNewExam({ ...newExam, duration: e.target.value })}
                        fullWidth
                        margin="normal"
                        type="number"
                        inputProps={{ min: 0.5, max: 8, step: 0.5 }}
                        error={!!errors.duration}
                        helperText={errors.duration || 'End time will be calculated automatically'}
                    />

                    <TextField
                        label="End Time *"
                        value={newExam.endTime}
                        onChange={(e) => setNewExam({ ...newExam, endTime: e.target.value })}
                        fullWidth
                        margin="normal"
                        type="time"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.endTime}
                        helperText={errors.endTime || 'Auto-calculated based on start time + duration'}
                        InputProps={{
                            style: { backgroundColor: '#f5f5f5' }
                        }}
                        disabled
                    />

                    <TextField
                        label="Room *"
                        value={newExam.room}
                        onChange={(e) => setNewExam({ ...newExam, room: e.target.value })}
                        fullWidth
                        margin="normal"
                        error={!!errors.room}
                        helperText={errors.room}
                    />

                    <FormControl fullWidth margin="normal" error={!!errors.status}>
                        <InputLabel>Status *</InputLabel>
                        <Select
                            value={newExam.status}
                            onChange={(e) => setNewExam({ ...newExam, status: e.target.value })}
                            label="Status *"
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                            <MenuItem value="postponed">Postponed</MenuItem>
                        </Select>
                        {errors.status && <Typography variant="caption" color="error">{errors.status}</Typography>}
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={isEdit ? handleUpdate : handleCreate}
                    >
                        {isEdit ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ExamsList;
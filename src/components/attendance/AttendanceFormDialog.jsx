import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Switch, Box, Typography, Alert } from '@mui/material';
import { Formik, Form, Field } from 'formik';

const AttendanceFormDialog = ({ open, handleClose, editingAttendance, exams, courses, students, handleSubmit, validationSchema, error, loading, AttendanceStatus }) => {
    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>{editingAttendance ? 'Edit Manual Attendance' : 'Add Manual Attendance'}</DialogTitle>
            <Formik
                initialValues={
                    editingAttendance || {
                        examId: '',
                        studentId: '',
                        rfidTag: '',
                        checkInTime: '',
                        checkOutTime: '',
                        status: AttendanceStatus.PRESENT,
                        deviceId: 'Manual',
                        deviceName: '-- Manual --',
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
                                    {exams.map(exam => {
                                        const course = courses.find(c => c.id === exam.courseCode);
                                        return (
                                            <MenuItem key={exam.id} value={exam.id}>
                                                {course?.courseName || 'Unknown'} - {exam.examType} ({exam.examDate})
                                            </MenuItem>
                                        );
                                    })}
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
                                            {student.name} ({student.rfidTag})
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
                                disabled
                            />
                            <Field
                                as={TextField}
                                name="checkInTime"
                                label="Check-In Time"
                                fullWidth
                                margin="normal"
                                type="datetime-local"
                                InputLabelProps={{ shrink: true }}
                                error={touched.checkInTime && !!errors.checkInTime}
                                helperText={touched.checkInTime && errors.checkInTime}
                            />
                            <Field
                                as={TextField}
                                name="checkOutTime"
                                label="Check-Out Time"
                                fullWidth
                                margin="normal"
                                type="datetime-local"
                                InputLabelProps={{ shrink: true }}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                <Field
                                    as={Switch}
                                    name="emailSent"
                                    checked={values.emailSent}
                                    onChange={(e) => setFieldValue('emailSent', e.target.checked)}
                                />
                                <Typography variant="body2" sx={{ ml: 1 }}>Email notification sent</Typography>
                            </Box>
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
    );
};

export default AttendanceFormDialog;
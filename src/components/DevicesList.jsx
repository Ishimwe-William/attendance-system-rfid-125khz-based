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
import { DeviceStatus } from '../models/types';

const DevicesList = () => {
    const [devices, setDevices] = useState([]);
    const [exams, setExams] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [error, setError] = useState(null);
    const { addDocument, updateDocument, deleteDocument, loading } = useDatabase();

    useEffect(() => {
        // Fetch devices
        const deviceQuery = query(collection(db, COLLECTIONS.DEVICES));
        const unsubscribeDevices = onSnapshot(deviceQuery, (snapshot) => {
            setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch exams for currentExam dropdown
        const examQuery = query(collection(db, COLLECTIONS.EXAMS));
        const unsubscribeExams = onSnapshot(examQuery, (snapshot) => {
            setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeDevices();
            unsubscribeExams();
        };
    }, []);

    const handleOpen = (device = null) => {
        setEditingDevice(device);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingDevice(null);
        setError(null);
    };

    const handleSubmit = async (values) => {
        try {
            if (editingDevice) {
                await updateDocument(COLLECTIONS.DEVICES, editingDevice.id, values);
            } else {
                await addDocument(COLLECTIONS.DEVICES, {
                    ...values,
                    lastSeen: new Date().toISOString()
                });
            }
            handleClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDocument(COLLECTIONS.DEVICES, id);
        } catch (err) {
            setError(err.message);
        }
    };

    const validationSchema = Yup.object({
        deviceName: Yup.string().required('Required'),
        location: Yup.string().required('Required'),
        currentExam: Yup.string().optional(),
        status: Yup.string().oneOf([DeviceStatus.ACTIVE, DeviceStatus.INACTIVE, DeviceStatus.MAINTENANCE]).required('Required'),
    });

    const columns = [
        { field: 'deviceName', headerName: 'Device Name', width: 150 },
        { field: 'location', headerName: 'Location', width: 150 },
        {
            field: 'currentExam',
            headerName: 'Current Exam',
            width: 150,
            valueGetter: (params) => {
                const exam = exams.find(e => e.id === params.value);
                return exam ? exam.examName : params.value || 'None';
            }
        },
        { field: 'status', headerName: 'Status', width: 120 },
        { field: 'lastSeen', headerName: 'Last Seen', width: 180 },
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
            <Typography variant="h4" gutterBottom>Devices</Typography>
            <Button
                variant="contained"
                onClick={() => handleOpen()}
                sx={{ mb: 2 }}
            >
                Add Device
            </Button>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={devices}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingDevice ? 'Edit Device' : 'Add Device'}</DialogTitle>
                <Formik
                    initialValues={
                        editingDevice || {
                            deviceName: '',
                            location: '',
                            currentExam: '',
                            status: DeviceStatus.ACTIVE,
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
                                    name="deviceName"
                                    label="Device Name"
                                    fullWidth
                                    margin="normal"
                                    error={touched.deviceName && !!errors.deviceName}
                                    helperText={touched.deviceName && errors.deviceName}
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
                                    <InputLabel>Current Exam</InputLabel>
                                    <Field
                                        as={Select}
                                        name="currentExam"
                                        value={values.currentExam}
                                        onChange={(e) => setFieldValue('currentExam', e.target.value)}
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {exams.map(exam => (
                                            <MenuItem key={exam.id} value={exam.id}>
                                                {exam.examName}
                                            </MenuItem>
                                        ))}
                                    </Field>
                                </FormControl>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Status</InputLabel>
                                    <Field
                                        as={Select}
                                        name="status"
                                        value={values.status}
                                        onChange={(e) => setFieldValue('status', e.target.value)}
                                        error={touched.status && !!errors.status}
                                    >
                                        <MenuItem value={DeviceStatus.ACTIVE}>Active</MenuItem>
                                        <MenuItem value={DeviceStatus.INACTIVE}>Inactive</MenuItem>
                                        <MenuItem value={DeviceStatus.MAINTENANCE}>Maintenance</MenuItem>
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

export default DevicesList;
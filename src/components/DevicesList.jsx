import React, {useState, useEffect} from 'react';
import {
    collection,
    onSnapshot,
    query,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import {db} from '../config/firebase';
import {DataGrid} from '@mui/x-data-grid';
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
    Chip,
} from '@mui/material';

const DevicesList = () => {
    const [devices, setDevices] = useState([]);
    const [exams, setExams] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isEdit, setIsEdit] = useState(false);
    const [errors, setErrors] = useState({});
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success'});
    const [newDevice, setNewDevice] = useState({
        deviceName: '',
        currentExam: '',
        examRoom: '',
        status: 'active',
    });

    useEffect(() => {
        const devicesQuery = query(collection(db, 'devices'));
        const unsubscribe = onSnapshot(devicesQuery, (snapshot) => {
            const devicesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastSeen: doc.data().lastSeen ? new Date(doc.data().lastSeen) : null,
            }));
            setDevices(devicesData);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const examsQuery = query(collection(db, 'exams'));
        const unsubscribe = onSnapshot(examsQuery, (snapshot) => {
            setExams(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });
        return () => unsubscribe();
    }, []);

    // Auto-populate exam room when exam is selected
    useEffect(() => {
        if (newDevice.currentExam && exams.length > 0) {
            const selectedExam = exams.find(exam => exam.id === newDevice.currentExam);
            if (selectedExam) {
                setNewDevice(prev => ({...prev, examRoom: selectedExam.room || ''}));
            }
        }
    }, [newDevice.currentExam, exams]);

    const validateDevice = (device) => {
        const newErrors = {};

        if (!device.deviceName.trim()) newErrors.deviceName = 'Device name is required';
        if (!device.status) newErrors.status = 'Status is required';

        // Device name should be unique
        const existingDevice = devices.find(d =>
            d.deviceName === device.deviceName &&
            (!selectedDevice || d.id !== selectedDevice.id)
        );
        if (existingDevice) {
            newErrors.deviceName = 'Device name already exists';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({open: true, message, severity});
    };

    const handleOpen = (device) => {
        setSelectedDevice(device);
        setIsEdit(true);
        setNewDevice({
            deviceName: device.deviceName || '',
            currentExam: device.currentExam || '',
            examRoom: device.examRoom || '',
            status: device.status || 'active',
        });
        setOpen(true);
        setErrors({});
    };

    const handleClose = () => {
        setOpen(false);
        setIsEdit(false);
        setSelectedDevice(null);
        setNewDevice({
            deviceName: '',
            currentExam: '',
            examRoom: '',
            status: 'active',
        });
        setErrors({});
    };

    const handleCreate = async () => {
        if (!validateDevice(newDevice)) {
            showSnackbar('Please fix validation errors', 'error');
            return;
        }

        try {
            const deviceRef = doc(db, 'devices', newDevice.deviceName);
            const deviceDoc = await getDoc(deviceRef);

            if (deviceDoc.exists()) {
                setErrors({deviceName: 'Device name already exists'});
                showSnackbar('Device name already exists', 'error');
                return;
            }

            const newDeviceData = {
                ...newDevice,
                id: newDevice.deviceName,
                lastSeen: new Date().toISOString(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            await setDoc(deviceRef, newDeviceData);
            handleClose();
            showSnackbar('Device created successfully');
        } catch (error) {
            console.error('Error creating device:', error);
            showSnackbar('Error creating device', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateDevice(newDevice)) {
            showSnackbar('Please fix validation errors', 'error');
            return;
        }

        try {
            const deviceRef = doc(db, 'devices', selectedDevice.id);
            const updatedDeviceData = {
                ...newDevice,
                updatedAt: serverTimestamp(),
            };

            // If device name has changed, update the document ID
            if (newDevice.deviceName !== selectedDevice.id) {
                const newDeviceRef = doc(db, 'devices', newDevice.deviceName);
                const deviceDoc = await getDoc(newDeviceRef);

                if (deviceDoc.exists()) {
                    setErrors({deviceName: 'Device name already exists'});
                    showSnackbar('Device name already exists', 'error');
                    return;
                }

                await deleteDoc(deviceRef);
                await setDoc(newDeviceRef, updatedDeviceData);
            } else {
                await updateDoc(deviceRef, updatedDeviceData);
            }

            handleClose();
            showSnackbar('Device updated successfully');
        } catch (error) {
            console.error('Error updating device:', error);
            showSnackbar('Error updating device', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this device?')) return;

        try {
            const docRef = doc(db, 'devices', id);
            await deleteDoc(docRef);
            showSnackbar('Device deleted successfully');
        } catch (error) {
            console.error('Error deleting device:', error);
            showSnackbar('Error deleting device', 'error');
        }
    };

    const getExamInfo = (examId) => {
        const exam = exams.find(e => e.id === examId);
        return exam ? `${exam.examType} - ${exam.examDate}` : 'No exam assigned';
    };

    const getStatusColor = (status, lastSeen) => {
        if (status === 'inactive') return '#d32f2f';
        if (status === 'maintenance') return '#f57c00';

        // Check if device is online (last seen within 5 minutes)
        if (lastSeen) {
            const timeDiff = Date.now() - lastSeen.getTime();
            const isOnline = timeDiff < 5 * 60 * 1000; // 5 minutes
            return isOnline ? '#2e7d32' : '#ed6c02';
        }
        return '#757575';
    };

    const getStatusText = (status, lastSeen) => {
        if (status === 'inactive') return 'Inactive';
        if (status === 'maintenance') return 'Maintenance';

        if (lastSeen) {
            const timeDiff = Date.now() - lastSeen.getTime();
            const isOnline = timeDiff < 5 * 60 * 1000;
            return isOnline ? 'Online' : 'Offline';
        }
        return 'Unknown';
    };

    const columns = [
        {
            field: 'deviceName',
            headerName: 'Device Name',
            flex: 1,
            minWidth: 150,
        },
        {
            field: 'currentExam',
            headerName: 'Current Exam',
            flex: 1,
            minWidth: 200,
            valueGetter: (params) => getExamInfo(params)
        },
        {
            field: 'examRoom',
            headerName: 'Room',
            width: 100,
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={getStatusText(params.value, params.row.lastSeen)}
                    size="small"
                    sx={{
                        backgroundColor: getStatusColor(params.value, params.row.lastSeen),
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                    }}
                />
            )
        },
        {
            field: 'lastSeen',
            headerName: 'Last Seen',
            width: 160,
            valueGetter: (params) => {
                if (!params) return 'Never';
                const timeDiff = Date.now() - params.getTime();
                const minutes = Math.floor(timeDiff / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (minutes < 1) return 'Just now';
                if (minutes < 60) return `${minutes}m ago`;
                if (hours < 24) return `${hours}h ago`;
                return `${days}d ago`;
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 140,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{display: 'flex', gap: 1}}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpen(params.row)}
                        sx={{minWidth: 'auto', px: 1}}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(params.row.id)}
                        sx={{minWidth: 'auto', px: 1}}
                    >
                        Del
                    </Button>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{p: 3, height: '100vh', display: 'flex', flexDirection: 'column'}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h4">Devices Management</Typography>
                <Button
                    variant="contained"
                    onClick={() => setOpen(true)}
                >
                    Add New Device
                </Button>
            </Box>

            <Box sx={{flexGrow: 1, minHeight: 0}}>
                <DataGrid
                    rows={devices}
                    columns={columns}
                    initialState={{
                        pagination: {
                            paginationModel: {pageSize: 25}
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
                <DialogTitle>{isEdit ? 'Edit Device' : 'Add New Device'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Device Name *"
                        value={newDevice.deviceName}
                        onChange={(e) => setNewDevice({...newDevice, deviceName: e.target.value})}
                        fullWidth
                        margin="normal"
                        error={!!errors.deviceName}
                        helperText={errors.deviceName}
                        placeholder="e.g., ESP001, Device_Room_A1"
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Current Exam</InputLabel>
                        <Select
                            value={newDevice.currentExam}
                            onChange={(e) => setNewDevice({...newDevice, currentExam: e.target.value})}
                            label="Current Exam"
                        >
                            <MenuItem value="">
                                <em>No exam assigned</em>
                            </MenuItem>
                            {exams.filter(exam => exam.status === 'active').map((exam) => (
                                <MenuItem key={exam.id} value={exam.id}>
                                    {exam.examType} - {exam.examDate} ({exam.room})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Exam Room"
                        value={newDevice.examRoom}
                        onChange={(e) => setNewDevice({...newDevice, examRoom: e.target.value})}
                        fullWidth
                        margin="normal"
                        helperText="Auto-populated when exam is selected"
                        InputProps={{
                            style: newDevice.currentExam ? {backgroundColor: '#f5f5f5'} : {}
                        }}
                        disabled={!!newDevice.currentExam}
                    />

                    <FormControl fullWidth margin="normal" error={!!errors.status}>
                        <InputLabel>Status *</InputLabel>
                        <Select
                            value={newDevice.status}
                            onChange={(e) => setNewDevice({...newDevice, status: e.target.value})}
                            label="Status *"
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="maintenance">Maintenance</MenuItem>
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
                onClose={() => setSnackbar({...snackbar, open: false})}
            >
                <Alert
                    onClose={() => setSnackbar({...snackbar, open: false})}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DevicesList;
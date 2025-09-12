import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import {
    Box,
    Typography,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { Role } from '../models/types';
import { DataGrid } from "@mui/x-data-grid";

const UsersList = () => {
    const [users, setUsers] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState(null);
    const { updateDocument, loading } = useDatabase();
    const { user: currentUser } = useAuth();

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleOpen = (user) => {
        setEditingUser(user);
        setOpen(true);
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingUser(null);
        setError(null);
    };

    const handleUpdateRole = async (newRole) => {
        try {
            // Prevent changing own role
            if (editingUser.id === currentUser.uid) {
                throw new Error('Cannot change your own role');
            }

            // Check if this would remove the last admin
            if (newRole !== Role?.ADMIN) {
                const adminCount = users.filter(u => u?.role === Role.ADMIN && u.id !== editingUser.id).length;
                if (adminCount === 0) {
                    throw new Error('Cannot remove the last admin');
                }
            }

            await updateDocument('users', editingUser.id, { role: newRole });
            handleClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const columns = [
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        {
            field: 'role',
            headerName: 'Role',
            width: 120,
            valueGetter: (value) => {
                return value === Role.ADMIN ? 'Admin' : 'Lecturer';
            }
        },
        {
            field: 'createdAt',
            headerName: 'Created At',
            width: 180,
            valueGetter: (params) => {
                return params?.toDate?.()?.toLocaleDateString() || 'N/A';
            },
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <Button
                    onClick={() => handleOpen(params.row)}
                    disabled={params.row.id === currentUser.uid}
                >
                    Change Role
                </Button>
            ),
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Users Management</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                />
            </div>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Change User Role</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={editingUser?.role || ''}
                            onChange={(e) => handleUpdateRole(e.target.value)}
                        >
                            <MenuItem value={Role.ADMIN}>Admin</MenuItem>
                            <MenuItem value={Role.LECTURER}>Lecturer</MenuItem>
                        </Select>
                    </FormControl>
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={() => handleUpdateRole(editingUser?.role)}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersList;
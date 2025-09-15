import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const ConfirmDeleteDialog = ({ openConfirm, setOpenConfirm, confirmDelete }) => {
    return (
        <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
                <Typography>Are you sure you want to delete this attendance record?</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenConfirm(false)}>Cancel</Button>
                <Button onClick={confirmDelete} color="error">Delete</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDeleteDialog;
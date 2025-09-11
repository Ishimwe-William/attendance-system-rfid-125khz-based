import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, adminOnly = false }) => {
    const { user, loading, error, hasRole } = useAuth();
    const location = useLocation();

    // Show loading state
    if (loading) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="50vh"
                gap={2}
            >
                <CircularProgress />
                <Typography variant="body1">Loading...</Typography>
            </Box>
        );
    }

    // Show error state
    if (error) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">
                    {error}
                </Alert>
            </Box>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check email verification (optional - uncomment if needed)
    // if (!user.emailVerified) {
    //   return (
    //     <Box sx={{ p: 2 }}>
    //       <Alert severity="warning">
    //         Please verify your email address to access this page.
    //       </Alert>
    //     </Box>
    //   );
    // }

    // Check admin access if required
    if (adminOnly && !hasRole('admin')) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">
                    Access denied. Administrator privileges required.
                </Alert>
            </Box>
        );
    }

    // Render the protected component
    return children;
};

export default PrivateRoute;
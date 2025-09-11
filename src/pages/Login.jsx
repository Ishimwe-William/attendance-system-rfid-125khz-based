import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { TextField, Button, Alert, Box, Typography, Link } from '@mui/material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    const auth = getAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, clearError } = useAuth();

    const from = location.state?.from?.pathname || '/';

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // Clear errors when component mounts
    useEffect(() => {
        clearError();
        setError('');
    }, [clearError]);

    const validateForm = () => {
        if (!email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!password.trim()) {
            setError('Password is required');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }
        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            // Navigation will be handled by the useEffect hook
        } catch (error) {
            console.error('Login error:', error);

            // Provide user-friendly error messages
            switch (error.code) {
                case 'auth/user-not-found':
                    setError('No account found with this email address');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password');
                    break;
                case 'auth/invalid-email':
                    setError('Invalid email address');
                    break;
                case 'auth/user-disabled':
                    setError('This account has been disabled');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many failed login attempts. Please try again later');
                    break;
                case 'auth/network-request-failed':
                    setError('Network error. Please check your connection');
                    break;
                default:
                    setError('Failed to login. Please try again');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email.trim()) {
            setError('Please enter your email address first');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email.trim());
            setResetEmailSent(true);
            setError('');
        } catch (error) {
            console.error('Password reset error:', error);
            switch (error.code) {
                case 'auth/user-not-found':
                    setError('No account found with this email address');
                    break;
                default:
                    setError('Failed to send reset email. Please try again');
            }
        }
    };

    return (
        <Box component="form" onSubmit={handleLogin} sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Login
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {resetEmailSent && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Password reset email sent! Check your inbox.
                </Alert>
            )}

            <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                disabled={loading}
            />

            <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="current-password"
                disabled={loading}
            />

            <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 2, mb: 2 }}
            >
                {loading ? 'Logging in...' : 'Login'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
                <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={handlePasswordReset}
                    disabled={loading}
                    sx={{ mb: 1, display: 'block' }}
                >
                    Forgot password?
                </Link>

                <Typography variant="body2">
                    Don't have an account?{' '}
                    <Link component={RouterLink} to="/signup">
                        Sign up
                    </Link>
                </Typography>
            </Box>
        </Box>
    );
};

export default Login;
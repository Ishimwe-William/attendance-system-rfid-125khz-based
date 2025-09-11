import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    TextField,
    Button,
    Alert,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Link
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'lecture'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const auth = getAuth();
    const navigate = useNavigate();
    const { isAuthenticated, clearError } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Clear errors when component mounts
    useEffect(() => {
        clearError();
        setError('');
    }, [clearError]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const { name, email, password, confirmPassword } = formData;

        if (!name.trim()) {
            setError('Name is required');
            return false;
        }

        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters');
            return false;
        }

        if (!email.trim()) {
            setError('Email is required');
            return false;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }

        if (!password) {
            setError('Password is required');
            return false;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const { name, email, password, role } = formData;

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );
            const user = userCredential.user;

            // Update user profile
            await updateProfile(user, {
                displayName: name.trim()
            });

            // Save user data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: name.trim(),
                email: email.trim(),
                role,
                createdAt: new Date(),
                emailVerified: user.emailVerified
            });

            // Navigation will be handled by the AuthContext
        } catch (error) {
            console.error('Signup error:', error);

            // Provide user-friendly error messages
            switch (error.code) {
                case 'auth/email-already-in-use':
                    setError('An account with this email already exists');
                    break;
                case 'auth/invalid-email':
                    setError('Invalid email address');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Email/password accounts are not enabled');
                    break;
                case 'auth/weak-password':
                    setError('Password is too weak. Please choose a stronger password');
                    break;
                case 'auth/network-request-failed':
                    setError('Network error. Please check your connection');
                    break;
                default:
                    setError('Failed to create account. Please try again');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSignup} sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Sign Up
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                margin="normal"
                required
                autoComplete="name"
                disabled={loading}
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
                autoComplete="email"
                disabled={loading}
            />

            <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                margin="normal"
                required
                autoComplete="new-password"
                disabled={loading}
                helperText="Must be at least 6 characters"
            />

            <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                margin="normal"
                required
                autoComplete="new-password"
                disabled={loading}
            />

            <FormControl fullWidth margin="normal" required>
                <InputLabel>Role</InputLabel>
                <Select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    label="Role"
                    disabled={loading}
                >
                    <MenuItem value="lecture">Lecturer</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                </Select>
            </FormControl>

            <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 2, mb: 2 }}
            >
                {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                    Already have an account?{' '}
                    <Link component={RouterLink} to="/login">
                        Login
                    </Link>
                </Typography>
            </Box>
        </Box>
    );
};

export default Signup;
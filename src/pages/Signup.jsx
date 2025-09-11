import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Role } from '../models/types';

const Signup = () => {
    const [localError, setLocalError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const validationSchema = Yup.object({
        name: Yup.string().required('Required'),
        email: Yup.string().email('Invalid email').required('Required'),
        password: Yup.string()
            .min(6, 'Password must be at least 6 characters')
            .required('Required'),
        role: Yup.string().oneOf([Role.ADMIN, Role.LECTURER], 'Invalid role').required('Required'),
    });

    const initialValues = {
        name: '',
        email: '',
        password: '',
        role: Role.LECTURER,
    };

    const handleSubmit = async (values) => {
        setLocalError(null);
        setLoading(true);
        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const newUser = userCredential.user;

            // Store additional user data in Firestore
            await setDoc(doc(db, 'users', newUser.uid), {
                name: values.name,
                email: values.email,
                role: values.role,
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
            });

            alert('User created successfully!');
            navigate('/'); // Redirect to dashboard
        } catch (err) {
            let errorMessage = 'An error occurred. Please try again.';
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use.';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format.';
            }
            setLocalError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
                    <Typography component="h1" variant="h5" align="center">
                        Sign Up
                    </Typography>
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ errors, touched, values, setFieldValue }) => (
                            <Form>
                                <Field
                                    as={TextField}
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="name"
                                    label="Name"
                                    name="name"
                                    autoComplete="name"
                                    autoFocus
                                    error={touched.name && !!errors.name}
                                    helperText={touched.name && errors.name}
                                />
                                <Field
                                    as={TextField}
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                    error={touched.email && !!errors.email}
                                    helperText={touched.email && errors.email}
                                />
                                <Field
                                    as={TextField}
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type="password"
                                    id="password"
                                    autoComplete="new-password"
                                    error={touched.password && !!errors.password}
                                    helperText={touched.password && errors.password}
                                />
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Role</InputLabel>
                                    <Field
                                        as={Select}
                                        name="role"
                                        value={values.role}
                                        onChange={(e) => setFieldValue('role', e.target.value)}
                                        error={touched.role && !!errors.role}
                                    >
                                        <MenuItem value={Role.ADMIN}>Admin</MenuItem>
                                        <MenuItem value={Role.LECTURER}>Lecturer</MenuItem>
                                    </Field>
                                </FormControl>
                                {localError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {localError}
                                    </Alert>
                                )}
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                    disabled={loading}
                                >
                                    {loading ? <CircularProgress size={24} /> : 'Sign Up'}
                                </Button>
                                <Button
                                    fullWidth
                                    color="primary"
                                    onClick={() => navigate('/login')}
                                    sx={{ textTransform: 'none' }}
                                    disabled={loading}
                                >
                                    Back to Login
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </Paper>
            </Box>
        </Container>
    );
};

export default Signup;
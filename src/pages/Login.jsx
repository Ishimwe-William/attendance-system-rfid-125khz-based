import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, resetPassword, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      if (resetMode) {
        await resetPassword(email);
        alert('Password reset email sent. Please check your inbox.');
        setResetMode(false);
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      let errorMessage = 'An error occurred. Please try again.';
      if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email.';
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
              {resetMode ? 'Reset Password' : 'Login'}
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!localError && localError.includes('email')}
                  helperText={localError && localError.includes('email') ? localError : ''}
              />
              {!resetMode && (
                  <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!localError && localError.includes('password')}
                      helperText={localError && localError.includes('password') ? localError : ''}
                  />
              )}
              {(error || localError) && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {localError || error}
                  </Alert>
              )}
              <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : resetMode ? 'Send Reset Link' : 'Login'}
              </Button>
              <Button
                  fullWidth
                  color="primary"
                  onClick={() => setResetMode(!resetMode)}
                  sx={{ textTransform: 'none' }}
                  disabled={loading}
              >
                {resetMode ? 'Back to Login' : 'Forgot Password?'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
  );
};
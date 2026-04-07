import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { passwordResetService } from '../services/passwordReset';
import { useAuth } from '../contexts/AuthContext';

const ChangePasswordOnFirstLogin = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const mustChangePassword = user?.mustChangePassword ?? user?.must_change_password;

    useEffect(() => {
        if (user && !mustChangePassword) {
            navigate('/', { replace: true });
        }
    }, [user, mustChangePassword, navigate]);

    const validatePassword = () => {
        if (!newPassword || !confirmPassword) {
            setError('Both password fields are required');
            return false;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError(null);

        if (!validatePassword()) {
            return;
        }

        try {
            setLoading(true);
            const response = await passwordResetService.changePasswordOnFirstLogin(
                newPassword,
                confirmPassword
            );

            if (response.success) {
                updateUser({
                    ...user,
                    mustChangePassword: false,
                    must_change_password: false
                });
                setSuccess(true);
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 2000);
            } else {
                setError(response.message || 'Failed to change password');
            }
        } catch (err) {
            setError(err.message || 'Failed to change password');
            console.error('Change password error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                py: 4
            }}
        >
            <Container maxWidth="sm">
                <Card sx={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                    <CardContent sx={{ p: 4 }}>
                        {/* Header */}
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Box
                                sx={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 2
                                }}
                            >
                                <LockIcon sx={{ color: 'white', fontSize: 30 }} />
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                Create New Password
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Your administrator has reset your password. Please create a new password to continue.
                            </Typography>
                        </Box>

                        {/* Success Message */}
                        {success && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                Password changed successfully! Redirecting...
                            </Alert>
                        )}

                        {/* Error Message */}
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        {/* Form */}
                        <Box component="form" onSubmit={handleChangePassword} noValidate sx={{ mt: 2 }}>
                            <TextField
                                fullWidth
                                label="New Password"
                                type="password"
                                variant="outlined"
                                margin="normal"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (minimum 8 characters)"
                                disabled={loading || success}
                                autoFocus
                            />

                            <TextField
                                fullWidth
                                label="Confirm Password"
                                type="password"
                                variant="outlined"
                                margin="normal"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                disabled={loading || success}
                            />

                            {/* Password Requirements */}
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                    Password Requirements:
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem' }}>
                                    <li>Minimum 8 characters</li>
                                    <li>Must match confirmation</li>
                                </ul>
                            </Box>

                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                sx={{
                                    mt: 3,
                                    py: 1.5,
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f95 100%)'
                                    }
                                }}
                                disabled={loading || success}
                            >
                                {loading ? (
                                    <>
                                        <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                                        Changing Password...
                                    </>
                                ) : (
                                    'Create New Password'
                                )}
                            </Button>
                        </Box>

                        {/* Info Box */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #90caf9' }}>
                            <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
                                💡 Tip: Use a strong password with a mix of letters, numbers, and special characters for better security.
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
};

export default ChangePasswordOnFirstLogin;

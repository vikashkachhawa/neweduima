import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { getErrorMessage } from '../utils/errorHandling';
import { motion } from 'framer-motion';
import { TextField, Button, Paper, Alert, CircularProgress, Box, Typography, Divider } from '@mui/material';
import { Login as LoginIcon, School } from '@mui/icons-material';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Check for suspension/deletion error from redirect
        const errorMsg = searchParams.get('error');
        if (errorMsg) {
            setError(decodeURIComponent(errorMsg));
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(email, password);

            if (data.user.mustChangePassword) {
                navigate('/change-password');
                return;
            }

            if (data.user.role === 'super_admin') {
                navigate('/dashboard');
            } else if (data.user.role === 'school_admin') {
                navigate('/dashboard');
            } else if (data.user.role === 'faculty') {
                navigate('/faculty/dashboard');
            } else if (data.user.role === 'student') {
                navigate('/student/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(getErrorMessage(err, 'Login failed'));
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
                p: 2,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Animated Background Blobs */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: '5%',
                    left: '-5%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 30, 0],
                    y: [0, 20, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: '5%',
                    right: '-5%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, -30, 0],
                    y: [0, -20, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                <ThemeToggle />
            </Box>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: '440px', zIndex: 1 }}
            >
                <Paper
                    elevation={12}
                    sx={{
                        p: 5,
                        backdropFilter: 'blur(20px)',
                    }}
                    component={motion.div}
                    whileHover={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
                >
                    {/* Logo Section */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                    >
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Box
                                component={motion.div}
                                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.05 }}
                                transition={{ duration: 0.5 }}
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    boxShadow: '0 10px 25px rgba(14, 165, 233, 0.3)',
                                }}
                            >
                                <School sx={{ fontSize: 40, color: 'white' }} />
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                                EduIMA
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                School Management System
                            </Typography>
                        </Box>
                    </motion.div>

                    <Divider sx={{ mb: 3 }} />

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.3 }}
                            >
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    variant="outlined"
                                    autoComplete="email"
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.3 }}
                            >
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    variant="outlined"
                                    autoComplete="current-password"
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.3 }}
                            >
                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                                    component={motion.button}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    sx={{ py: 1.5, fontSize: '1rem', fontWeight: 600 }}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </motion.div>
                        </Box>
                    </form>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                    >
                        <Divider sx={{ my: 3 }} />
                        <Box
                            sx={{
                                p: 2.5,
                                bgcolor: 'action.hover',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                                📝 Demo Credentials
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        Super Admin
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'text.secondary' }}>
                                        Email: superadmin@eduima.com
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'text.secondary' }}>
                                        Password: SuperAdmin@123
                                    </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        School Admin
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'text.secondary' }}>
                                        Email: admin@demopublicschool.com
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'text.secondary' }}>
                                        Password: Admin@123
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </motion.div>
                </Paper>
            </motion.div>
        </Box>
    );
};

export default Login;

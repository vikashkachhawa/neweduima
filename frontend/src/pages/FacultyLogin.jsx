import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { getErrorMessage } from '../utils/errorHandling';
import { motion } from 'framer-motion';
import { TextField, Button, Paper, Alert, CircularProgress, Box, Typography } from '@mui/material';
import { Login as LoginIcon, MenuBook } from '@mui/icons-material';

const FacultyLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
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

            if (data.user.role !== 'faculty') {
                setError('Access denied. This portal is for faculty members only.');
                setLoading(false);
                return;
            }

            if (data.user.mustChangePassword) {
                navigate('/change-password');
                return;
            }

            navigate('/faculty/dashboard');
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
            {/* Animated Background */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: '5%',
                    left: '-5%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
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
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
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
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
                                }}
                            >
                                <MenuBook sx={{ fontSize: 36, color: 'white' }} />
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                Faculty Portal
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sign in to access your dashboard
                            </Typography>
                        </Box>
                    </motion.div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        </motion.div>
                    )}

                    <Box component="form" onSubmit={handleSubmit}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                sx={{ mb: 3 }}
                                disabled={loading}
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <TextField
                                fullWidth
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                sx={{ mb: 4 }}
                                disabled={loading}
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                                sx={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)',
                                    py: 1.5,
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    boxShadow: '0 8px 16px rgba(139, 92, 246, 0.3)',
                                    '&:hover': {
                                        boxShadow: '0 12px 24px rgba(139, 92, 246, 0.4)',
                                    }
                                }}
                            >
                                {loading ? 'Signing In...' : 'Sign In'}
                            </Button>
                        </motion.div>
                    </Box>
                </Paper>
            </motion.div>
        </Box>
    );
};

export default FacultyLogin;

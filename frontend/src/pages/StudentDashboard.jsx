import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import { Box, Typography, Card, CardContent, CircularProgress, Paper, Avatar, Chip, LinearProgress, Button } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import {
    School,
    Assignment,
    Grade,
    Schedule,
    TrendingUp,
    Class,
    CheckCircle,
    MenuBook
} from '@mui/icons-material';

const StudentDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            setStats({
                enrolledCourses: 6,
                completedAssignments: 24,
                pendingAssignments: 5,
                overallGrade: 'A-',
                attendance: 92,
                upcomingClasses: 3
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon, color, delay }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
        >
            <Card
                component={motion.div}
                whileHover={{ y: -8, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
                sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
                    border: `1px solid ${color}30`,
                    transition: 'all 0.3s ease'
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 8px 16px ${color}40`
                            }}
                        >
                            {React.cloneElement(icon, { sx: { fontSize: 28, color: 'white' } })}
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 700, color }}>
                            {value}
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {title}
                    </Typography>
                </CardContent>
            </Card>
        </motion.div>
    );

    if (loading) {
        return (
            <Layout>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                    <CircularProgress size={60} />
                </Box>
            </Layout>
        );
    }

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Paper
                        sx={{
                            p: 4,
                            mb: 4,
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar
                                    sx={{
                                        width: 72,
                                        height: 72,
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        border: '3px solid white'
                                    }}
                                >
                                    <School sx={{ fontSize: 36 }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                        Welcome back, {user?.firstName}!
                                    </Typography>
                                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                        {user?.email} • Student
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`School: ${user?.schoolName || 'N/A'}`}
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                                />
                                <Chip
                                    label="Active"
                                    sx={{ bgcolor: 'rgba(16, 185, 129, 0.3)', color: 'white', fontWeight: 600 }}
                                />
                            </Box>
                        </Box>
                    </Paper>
                </motion.div>

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                        Overview
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Enrolled Courses"
                                value={stats?.enrolledCourses || 0}
                                icon={<Class />}
                                color="#0ea5e9"
                                delay={0.1}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Completed Assignments"
                                value={stats?.completedAssignments || 0}
                                icon={<CheckCircle />}
                                color="#10b981"
                                delay={0.2}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Pending Assignments"
                                value={stats?.pendingAssignments || 0}
                                icon={<Assignment />}
                                color="#f59e0b"
                                delay={0.3}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Upcoming Classes"
                                value={stats?.upcomingClasses || 0}
                                icon={<Schedule />}
                                color="#8b5cf6"
                                delay={0.4}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Grade sx={{ color: 'white' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                                            {stats?.overallGrade}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Overall Grade
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </motion.div>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <CheckCircle sx={{ color: 'white' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0ea5e9' }}>
                                            {stats?.attendance}%
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Attendance Rate
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </motion.div>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                        Quick Actions
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={4} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<MenuBook />}
                                sx={{ py: 2 }}
                            >
                                My Courses
                            </Button>
                        </Grid>
                        <Grid item xs={6} sm={4} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Assignment />}
                                sx={{ py: 2 }}
                            >
                                Assignments
                            </Button>
                        </Grid>
                        <Grid item xs={6} sm={4} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Grade />}
                                sx={{ py: 2 }}
                            >
                                My Grades
                            </Button>
                        </Grid>
                        <Grid item xs={6} sm={4} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Schedule />}
                                sx={{ py: 2 }}
                            >
                                Schedule
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Layout>
    );
};

export default StudentDashboard;

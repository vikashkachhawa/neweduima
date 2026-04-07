import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { schoolService, superAdminService } from '../services';
import { Card, CardContent, Typography, CircularProgress, Box } from '@mui/material';
import { School, CheckCircle, People, PersonAdd } from '@mui/icons-material';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            if (user?.role === 'super_admin') {
                const schoolsData = await superAdminService.getAllSchools();
                const usersData = await superAdminService.getAllUsers();
                setStats({
                    totalSchools: schoolsData.schools.length,
                    activeSchools: schoolsData.schools.filter(s => s.is_active).length,
                    totalUsers: usersData.users.length,
                    activeUsers: usersData.users.filter(u => u.is_active).length
                });
            } else {
                const data = await schoolService.getDashboardStats();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderSuperAdminStats = () => (
        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                lg: 'repeat(4, 1fr)' 
            }, 
            gap: 3 
        }}>
            <StatCard
                title="Total Schools"
                value={stats?.totalSchools || 0}
                icon={<School />}
                color="#0ea5e9"
                delay={0.1}
            />
            <StatCard
                title="Active Schools"
                value={stats?.activeSchools || 0}
                icon={<CheckCircle />}
                color="#10b981"
                delay={0.2}
            />
            <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                icon={<People />}
                color="#8b5cf6"
                delay={0.3}
            />
            <StatCard
                title="Active Users"
                value={stats?.activeUsers || 0}
                icon={<CheckCircle />}
                color="#059669"
                delay={0.4}
            />
        </Box>
    );

    const renderSchoolStats = () => (
        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                lg: 'repeat(4, 1fr)' 
            }, 
            gap: 3 
        }}>
            <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                icon={<People />}
                color="#0ea5e9"
                delay={0.1}
            />
            <StatCard
                title="Faculty"
                value={stats?.faculty || 0}
                icon={<PersonAdd />}
                color="#10b981"
                delay={0.2}
            />
            <StatCard
                title="Students"
                value={stats?.students || 0}
                icon={<People />}
                color="#8b5cf6"
                delay={0.3}
            />
            <StatCard
                title="Active Users"
                value={stats?.activeUsers || 0}
                icon={<CheckCircle />}
                color="#059669"
                delay={0.4}
            />
        </Box>
    );

    if (loading) {
        return (
            <Layout>
                <Box className="flex items-center justify-center h-64">
                    <CircularProgress size={60} />
                </Box>
            </Layout>
        );
    }

    return (
        <Layout>
            <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Dashboard
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Welcome back, {user?.firstName}!
                        </Typography>
                    </Box>
                </motion.div>

                <Box sx={{ mb: 4 }}>
                    {user?.role === 'super_admin' ? renderSuperAdminStats() : renderSchoolStats()}
                </Box>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <Card elevation={2}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                Recent Activity
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                No recent activity to display.
                            </Typography>
                        </CardContent>
                    </Card>
                </motion.div>
            </Box>
        </Layout>
    );
};

const StatCard = ({ title, value, icon, color, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.4, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{ height: '100%' }}
        >
            <Card 
                elevation={2}
                sx={{
                    height: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {title}
                            </Typography>
                            <Typography 
                                variant="h3" 
                                sx={{ fontWeight: 700 }}
                            >
                                {value}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                width: 64,
                                height: 64,
                                borderRadius: '16px',
                                backgroundColor: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                            }}
                        >
                            {React.cloneElement(icon, { sx: { fontSize: 32 } })}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default Dashboard;

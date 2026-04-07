import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { analyticsService } from '../services';
import { Box, Typography, Card, CardContent, CircularProgress, TextField, Button, Tabs, Tab, Alert, Chip, LinearProgress } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { motion } from 'framer-motion';
import { 
    TrendingUp, People, School, Storage, Error as ErrorIcon,
    Speed, Assessment, AttachMoney, Refresh
} from '@mui/icons-material';

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [loginTrends, setLoginTrends] = useState([]);
    const [storageAlerts, setStorageAlerts] = useState([]);
    const [errorSummary, setErrorSummary] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [dateFilter, setDateFilter] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, [dateFilter]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all analytics data
            const [overviewData, trendsData, alertsData, errorsData] = await Promise.all([
                analyticsService.getOverview(dateFilter || null),
                analyticsService.getLoginTrends(7, null, null),
                analyticsService.getStorageAlerts(),
                analyticsService.getErrorSummary()
            ]);

            setOverview(overviewData.data);
            setLoginTrends(trendsData.trends || []);
            setStorageAlerts(alertsData.alerts || []);
            setErrorSummary(errorsData.summary);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.error || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const handleResolveAlert = async (alertId) => {
        try {
            await analyticsService.resolveStorageAlert(alertId);
            fetchAnalytics(); // Refresh data
        } catch (err) {
            console.error('Error resolving alert:', err);
        }
    };

    if (loading) {
        return (
            <Layout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <CircularProgress />
                </Box>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                    <Button variant="contained" onClick={fetchAnalytics} startIcon={<Refresh />}>
                        Retry
                    </Button>
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
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                Analytics & Monitoring
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Platform-wide insights and performance metrics
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                label="Date Filter"
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                            <Button 
                                variant="outlined" 
                                startIcon={<Refresh />}
                                onClick={fetchAnalytics}
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Box>
                </motion.div>

                {/* Overview Metrics */}
                {overview && (
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Card elevation={2}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Active Schools
                                            </Typography>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: '#10b981',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                            }}>
                                                <School sx={{ fontSize: 20 }} />
                                            </Box>
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                            {overview.active_schools || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {dateFilter || 'Today'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card elevation={2}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Logins
                                            </Typography>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: '#8b5cf6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                            }}>
                                                <TrendingUp sx={{ fontSize: 20 }} />
                                            </Box>
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                            {overview.total_logins || 0}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: overview.login_success_rate >= 95 ? 'success.main' : 'warning.main' }}>
                                            {overview.login_success_rate?.toFixed(1)}% success rate
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card elevation={2}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Active Users
                                            </Typography>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: '#0ea5e9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                            }}>
                                                <People sx={{ fontSize: 20 }} />
                                            </Box>
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                            {overview.active_users || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Logged in today
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card elevation={2}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Avg Response Time
                                            </Typography>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: '#f59e0b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                            }}>
                                                <Speed sx={{ fontSize: 20 }} />
                                            </Box>
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                            {overview.avg_response_time || 0}ms
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: overview.avg_response_time < 500 ? 'success.main' : 'warning.main' }}>
                                            {overview.avg_response_time < 500 ? 'Good' : 'Needs attention'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    </Grid>
                )}

                {/* Tabs for Different Analytics Views */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
                        <Tab label="Overview" />
                        <Tab label="Storage Alerts" />
                        <Tab label="Errors" />
                        <Tab label="Trends" />
                    </Tabs>
                </Box>

                {/* Tab Content */}
                {selectedTab === 0 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card elevation={2}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        Login Trends (Last 7 Days)
                                    </Typography>
                                    {loginTrends.length > 0 ? (
                                        <Box>
                                            {loginTrends.map((trend, idx) => (
                                                <Box key={idx} sx={{ mb: 2 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography variant="body2">
                                                            {new Date(trend.metric_date).toLocaleDateString()}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {trend.total_logins} logins ({trend.total_active_users} users)
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress 
                                                        variant="determinate" 
                                                        value={(trend.total_logins / Math.max(...loginTrends.map(t => t.total_logins))) * 100} 
                                                        sx={{ height: 8, borderRadius: 1 }}
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No trend data available
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {selectedTab === 1 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card elevation={2}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Storage Alerts ({storageAlerts.length})
                                    </Typography>
                                    {storageAlerts.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {storageAlerts.map((alert) => (
                                                <Card key={alert.id} variant="outlined">
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                                            <Box>
                                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                    {alert.school_name}
                                                                </Typography>
                                                                <Chip 
                                                                    label={alert.alert_level} 
                                                                    size="small"
                                                                    color={
                                                                        alert.alert_level === 'emergency' ? 'error' :
                                                                        alert.alert_level === 'critical' ? 'warning' : 'info'
                                                                    }
                                                                    sx={{ mt: 1 }}
                                                                />
                                                            </Box>
                                                            <Button 
                                                                size="small" 
                                                                variant="outlined"
                                                                onClick={() => handleResolveAlert(alert.id)}
                                                            >
                                                                Resolve
                                                            </Button>
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                                            Storage: {alert.storage_used_gb}GB / {alert.storage_limit_gb}GB ({alert.percentage_used}%)
                                                        </Typography>
                                                        <LinearProgress 
                                                            variant="determinate" 
                                                            value={alert.percentage_used} 
                                                            color={
                                                                alert.percentage_used >= 99 ? 'error' :
                                                                alert.percentage_used >= 95 ? 'warning' : 'info'
                                                            }
                                                            sx={{ height: 8, borderRadius: 1, mt: 1 }}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Alert severity="success">No active storage alerts</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {selectedTab === 2 && errorSummary && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card elevation={2}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        <ErrorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Error Summary (Last 24 Hours)
                                    </Typography>
                                    <Box sx={{ mb: 3 }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">Total Errors</Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                                    {errorSummary.total_errors || 0}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                                    {errorSummary.error_rate?.toFixed(2)}%
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                    {errorSummary.errors_by_type?.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {errorSummary.errors_by_type.map((error, idx) => (
                                                <Card key={idx} variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                            {error.error_type}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                                            Endpoint: {error.endpoint}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                                            <Chip label={`${error.count} occurrences`} size="small" />
                                                            <Chip label={`${error.schools_affected} schools affected`} size="small" color="warning" />
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Alert severity="success">No errors in the last 24 hours</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {selectedTab === 3 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card elevation={2}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Detailed Trends
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Detailed charts and trend analysis will be available here.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </Layout>
    );
};

export default Analytics;

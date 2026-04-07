import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField } from '@mui/material';
import { motion } from 'framer-motion';

import Grid from '@mui/material/GridLegacy';
import {
    CheckCircle as PresentIcon,
    Cancel as AbsentIcon,
    HelpOutline as NotMarkedIcon,
    TrendingUp as TrendingIcon,
    People as PeopleIcon,
    Warning as WarningIcon,
    Download as DownloadIcon
} from '@mui/icons-material';

const FacultyAttendance = () => {
    const [selectedClass, setSelectedClass] = useState('Mathematics 101');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [openDialog, setOpenDialog] = useState(false);
    
    const classes = ['Mathematics 101', 'Advanced Physics', 'Chemistry Lab'];
    
    const [students] = useState([
        { id: 1, name: 'John Doe', rollNo: '001', status: 'present', attendance: 95 },
        { id: 2, name: 'Jane Smith', rollNo: '002', status: 'present', attendance: 88 },
        { id: 3, name: 'Mike Johnson', rollNo: '003', status: 'absent', attendance: 92 },
        { id: 4, name: 'Sarah Williams', rollNo: '004', status: 'present', attendance: 85 },
        { id: 5, name: 'Tom Brown', rollNo: '005', status: 'not-marked', attendance: 98 }
    ]);

    const stats = {
        totalStudents: students.length,
        present: students.filter(s => s.status === 'present').length,
        absent: students.filter(s => s.status === 'absent').length,
        notMarked: students.filter(s => s.status === 'not-marked').length,
        averageAttendance: Math.round(students.reduce((acc, s) => acc + s.attendance, 0) / students.length)
    };

    const StatCard = ({ title, value, icon, color, delay }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
        >
            <Card
                component={motion.div}
                whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 4px 12px ${color}40`
                            }}
                        >
                            {React.cloneElement(icon, { sx: { fontSize: 28, color: 'white' } })}
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color }}>
                                {value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {title}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );

    const getStatusChip = (status) => {
        const config = {
            present: { label: 'Present', color: '#10b981', icon: <PresentIcon /> },
            absent: { label: 'Absent', color: '#ef4444', icon: <AbsentIcon /> },
            'not-marked': { label: 'Not Marked', color: '#f59e0b', icon: <NotMarkedIcon /> }
        };
        const { label, color, icon } = config[status];
        return (
            <Chip
                label={label}
                icon={icon}
                size="small"
                sx={{
                    bgcolor: `${color}20`,
                    color,
                    fontWeight: 600,
                    '& .MuiChip-icon': { color }
                }}
            />
        );
    };

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Attendance
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        sx={{ fontWeight: 600 }}
                    >
                        Export Report
                    </Button>
                </Box>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Students"
                            value={stats.totalStudents}
                            icon={<PeopleIcon />}
                            color="#8b5cf6"
                            delay={0.1}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Present"
                            value={stats.present}
                            icon={<PresentIcon />}
                            color="#10b981"
                            delay={0.2}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Absent"
                            value={stats.absent}
                            icon={<AbsentIcon />}
                            color="#ef4444"
                            delay={0.3}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Avg Attendance"
                            value={`${stats.averageAttendance}%`}
                            icon={<TrendingIcon />}
                            color="#0ea5e9"
                            delay={0.4}
                        />
                    </Grid>
                </Grid>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Class</InputLabel>
                                <Select
                                    value={selectedClass}
                                    label="Class"
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    {classes.map(cls => (
                                        <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel shrink>Date</InputLabel>
                                <Select
                                    value={selectedDate}
                                    label="Date"
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                >
                                    <MenuItem value={new Date().toISOString().split('T')[0]}>Today</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                sx={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)',
                                    fontWeight: 600
                                }}
                                onClick={() => setOpenDialog(true)}
                            >
                                Mark Attendance
                            </Button>
                        </Box>
                    </Paper>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Roll No</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Overall Attendance</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {students.map((student, index) => (
                                    <motion.tr
                                        key={student.id}
                                        component={TableRow}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                    >
                                        <TableCell sx={{ fontWeight: 600 }}>{student.rollNo}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{getStatusChip(student.status)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {student.attendance}%
                                                </Typography>
                                                {student.attendance < 75 && (
                                                    <WarningIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="success">
                                                <PresentIcon />
                                            </IconButton>
                                            <IconButton size="small" color="error">
                                                <AbsentIcon />
                                            </IconButton>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </motion.div>

                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 700 }}>Mark Attendance</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Marking attendance for {selectedClass} on {new Date(selectedDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2">
                            Quick actions will be available here to mark all students present/absent or select individual students.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button variant="contained" onClick={() => setOpenDialog(false)}>Save</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};

export default FacultyAttendance;

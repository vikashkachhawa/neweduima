import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';

import Grid from '@mui/material/GridLegacy';
import {
    Add as AddIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

const FacultyAssignments = () => {
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [assignments] = useState([
        {
            id: 1,
            title: 'Calculus Problem Set',
            class: 'Mathematics 101',
            dueDate: '2025-01-05',
            submitted: 28,
            total: 32,
            status: 'active'
        },
        {
            id: 2,
            title: 'Physics Lab Report',
            class: 'Advanced Physics',
            dueDate: '2025-01-08',
            submitted: 15,
            total: 28,
            status: 'active'
        },
        {
            id: 3,
            title: 'Chemical Reactions Essay',
            class: 'Chemistry Lab',
            dueDate: '2025-01-02',
            submitted: 25,
            total: 25,
            status: 'completed'
        }
    ]);

    const activeAssignments = assignments.filter(a => a.status === 'active');
    const completedAssignments = assignments.filter(a => a.status === 'completed');

    const getStatusColor = (submitted, total) => {
        const percentage = (submitted / total) * 100;
        if (percentage === 100) return '#10b981';
        if (percentage >= 75) return '#0ea5e9';
        if (percentage >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const AssignmentCard = ({ assignment, index }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Paper
                component={motion.div}
                whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                sx={{ p: 3 }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <AssignmentIcon sx={{ color: 'white' }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {assignment.title}
                            </Typography>
                            <Chip label={assignment.class} size="small" />
                        </Box>
                    </Box>
                    {assignment.status === 'completed' && (
                        <CheckIcon sx={{ color: '#10b981', fontSize: 32 }} />
                    )}
                </Box>

                <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Submissions
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {assignment.submitted}/{assignment.total}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={(assignment.submitted / assignment.total) * 100}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: getStatusColor(assignment.submitted, assignment.total)
                            }
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                    <Button variant="outlined" fullWidth size="small">
                        View Submissions
                    </Button>
                    <Button variant="contained" fullWidth size="small">
                        Grade
                    </Button>
                </Box>
            </Paper>
        </motion.div>
    );

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Assignments
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)',
                            fontWeight: 600
                        }}
                    >
                        Create Assignment
                    </Button>
                </Box>

                <Paper sx={{ mb: 3 }}>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                        <Tab label={`Active (${activeAssignments.length})`} />
                        <Tab label={`Completed (${completedAssignments.length})`} />
                    </Tabs>
                </Paper>

                <Grid container spacing={3}>
                    {(tabValue === 0 ? activeAssignments : completedAssignments).map((assignment, index) => (
                        <Grid item xs={12} md={6} lg={4} key={assignment.id}>
                            <AssignmentCard assignment={assignment} index={index} />
                        </Grid>
                    ))}
                </Grid>

                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ fontWeight: 700 }}>Create New Assignment</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField fullWidth label="Assignment Title" />
                            <TextField fullWidth label="Class" />
                            <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }} />
                            <TextField fullWidth label="Description" multiline rows={4} />
                            <TextField fullWidth label="Total Points" type="number" />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button variant="contained" onClick={() => setOpenDialog(false)}>Create</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};

export default FacultyAssignments;

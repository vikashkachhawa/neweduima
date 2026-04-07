import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Menu, MenuItem, IconButton } from '@mui/material';
import { motion } from 'framer-motion';

import Grid from '@mui/material/GridLegacy';
import {
    Add as AddIcon,
    MoreVert as MoreIcon,
    People as PeopleIcon,
    Schedule as ScheduleIcon,
    Class as ClassIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

const FacultyClasses = () => {
    const [classes, setClasses] = useState([
        {
            id: 1,
            name: 'Mathematics 101',
            subject: 'Mathematics',
            grade: 'Grade 10',
            students: 32,
            schedule: 'Mon, Wed, Fri - 9:00 AM',
            color: '#8b5cf6'
        },
        {
            id: 2,
            name: 'Advanced Physics',
            subject: 'Physics',
            grade: 'Grade 12',
            students: 28,
            schedule: 'Tue, Thu - 10:30 AM',
            color: '#0ea5e9'
        },
        {
            id: 3,
            name: 'Chemistry Lab',
            subject: 'Chemistry',
            grade: 'Grade 11',
            students: 25,
            schedule: 'Wed, Fri - 2:00 PM',
            color: '#10b981'
        }
    ]);
    const [openDialog, setOpenDialog] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        grade: '',
        schedule: ''
    });

    const handleMenuClick = (event, classItem) => {
        setAnchorEl(event.currentTarget);
        setSelectedClass(classItem);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedClass(null);
    };

    const handleAddClass = () => {
        setFormData({ name: '', subject: '', grade: '', schedule: '' });
        setOpenDialog(true);
    };

    const handleSubmit = () => {
        const newClass = {
            id: Date.now(),
            ...formData,
            students: 0,
            color: ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)]
        };
        setClasses([...classes, newClass]);
        setOpenDialog(false);
    };

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        My Classes
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddClass}
                        sx={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #10b981 100%)',
                            fontWeight: 600
                        }}
                    >
                        Add Class
                    </Button>
                </Box>

                <Grid container spacing={3}>
                    {classes.map((classItem, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={classItem.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    component={motion.div}
                                    whileHover={{ y: -8, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
                                    sx={{
                                        height: '100%',
                                        position: 'relative',
                                        overflow: 'visible',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 6,
                                            background: `linear-gradient(135deg, ${classItem.color} 0%, ${classItem.color}cc 100%)`
                                        }
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: classItem.color,
                                                        width: 56,
                                                        height: 56
                                                    }}
                                                >
                                                    <ClassIcon />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                        {classItem.name}
                                                    </Typography>
                                                    <Chip
                                                        label={classItem.subject}
                                                        size="small"
                                                        sx={{ bgcolor: `${classItem.color}20`, color: classItem.color, fontWeight: 600 }}
                                                    />
                                                </Box>
                                            </Box>
                                            <IconButton size="small" onClick={(e) => handleMenuClick(e, classItem)}>
                                                <MoreIcon />
                                            </IconButton>
                                        </Box>

                                        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PeopleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {classItem.students} Students
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <ScheduleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {classItem.schedule}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={classItem.grade}
                                                size="small"
                                                sx={{ width: 'fit-content' }}
                                            />
                                        </Box>

                                        <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                size="small"
                                                sx={{ borderColor: classItem.color, color: classItem.color }}
                                            >
                                                View Details
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>

                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={handleMenuClose}>
                        <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Edit
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                        <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Delete
                    </MenuItem>
                </Menu>

                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 700 }}>Add New Class</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                fullWidth
                                label="Class Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Subject"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Grade"
                                value={formData.grade}
                                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Schedule"
                                value={formData.schedule}
                                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button variant="contained" onClick={handleSubmit}>Add Class</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};

export default FacultyClasses;

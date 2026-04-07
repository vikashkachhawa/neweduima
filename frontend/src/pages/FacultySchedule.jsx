import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import { motion } from 'framer-motion';

import Grid from '@mui/material/GridLegacy';
import {
    Schedule as ScheduleIcon,
    Class as ClassIcon,
    Room as RoomIcon,
    AccessTime as TimeIcon
} from '@mui/icons-material';

const FacultySchedule = () => {
    const [schedule] = useState({
        Monday: [
            { time: '9:00 AM - 10:30 AM', class: 'Mathematics 101', room: 'Room 201', students: 32, color: '#8b5cf6' },
            { time: '2:00 PM - 3:30 PM', class: 'Advanced Physics', room: 'Lab 1', students: 28, color: '#0ea5e9' }
        ],
        Tuesday: [
            { time: '10:30 AM - 12:00 PM', class: 'Advanced Physics', room: 'Lab 1', students: 28, color: '#0ea5e9' },
            { time: '1:00 PM - 2:30 PM', class: 'Chemistry Lab', room: 'Lab 2', students: 25, color: '#10b981' }
        ],
        Wednesday: [
            { time: '9:00 AM - 10:30 AM', class: 'Mathematics 101', room: 'Room 201', students: 32, color: '#8b5cf6' },
            { time: '2:00 PM - 3:30 PM', class: 'Chemistry Lab', room: 'Lab 2', students: 25, color: '#10b981' }
        ],
        Thursday: [
            { time: '10:30 AM - 12:00 PM', class: 'Advanced Physics', room: 'Lab 1', students: 28, color: '#0ea5e9' }
        ],
        Friday: [
            { time: '9:00 AM - 10:30 AM', class: 'Mathematics 101', room: 'Room 201', students: 32, color: '#8b5cf6' },
            { time: '2:00 PM - 3:30 PM', class: 'Chemistry Lab', room: 'Lab 2', students: 25, color: '#10b981' }
        ]
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const today = days[new Date().getDay() - 1] || 'Monday';

    const ClassCard = ({ item, index }) => (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card
                component={motion.div}
                whileHover={{ x: 8, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                sx={{
                    mb: 2,
                    position: 'relative',
                    overflow: 'visible',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        background: item.color
                    }
                }}
            >
                <CardContent sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                            sx={{
                                bgcolor: item.color,
                                width: 48,
                                height: 48
                            }}
                        >
                            <ClassIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {item.class}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {item.time}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            icon={<RoomIcon />}
                            label={item.room}
                            size="small"
                            sx={{ bgcolor: `${item.color}15`, color: item.color }}
                        />
                        <Chip
                            label={`${item.students} Students`}
                            size="small"
                        />
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
                    Teaching Schedule
                </Typography>

                <Grid container spacing={3}>
                    {days.map((day, dayIndex) => (
                        <Grid item xs={12} lg={6} key={day}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: dayIndex * 0.1 }}
                            >
                                <Paper
                                    sx={{
                                        p: 3,
                                        height: '100%',
                                        background: day === today ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)' : 'background.paper',
                                        border: day === today ? '2px solid #8b5cf6' : 'none'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Avatar
                                            sx={{
                                                bgcolor: day === today ? '#8b5cf6' : 'action.hover',
                                                color: day === today ? 'white' : 'text.primary',
                                                width: 56,
                                                height: 56
                                            }}
                                        >
                                            <ScheduleIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                                {day}
                                            </Typography>
                                            {day === today && (
                                                <Chip label="Today" size="small" color="primary" />
                                            )}
                                        </Box>
                                    </Box>

                                    {schedule[day] && schedule[day].length > 0 ? (
                                        schedule[day].map((item, index) => (
                                            <ClassCard key={index} item={item} index={index} />
                                        ))
                                    ) : (
                                        <Box
                                            sx={{
                                                p: 4,
                                                textAlign: 'center',
                                                bgcolor: 'action.hover',
                                                borderRadius: 2
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                No classes scheduled
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Layout>
    );
};

export default FacultySchedule;

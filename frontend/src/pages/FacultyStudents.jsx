import React, { useState } from 'react';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    Menu,
    MenuItem,
    Button
} from '@mui/material';
import {
    Search as SearchIcon,
    MoreVert as MoreIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Download as DownloadIcon
} from '@mui/icons-material';

const FacultyStudents = () => {
    const [students] = useState([
        { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', class: 'Mathematics 101', grade: 'A', attendance: 95 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '123-456-7891', class: 'Advanced Physics', grade: 'B+', attendance: 88 },
        { id: 3, name: 'Mike Johnson', email: 'mike@example.com', phone: '123-456-7892', class: 'Chemistry Lab', grade: 'A-', attendance: 92 },
        { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', phone: '123-456-7893', class: 'Mathematics 101', grade: 'B', attendance: 85 },
        { id: 5, name: 'Tom Brown', email: 'tom@example.com', phone: '123-456-7894', class: 'Advanced Physics', grade: 'A', attendance: 98 }
    ]);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getGradeColor = (grade) => {
        if (grade.startsWith('A')) return '#10b981';
        if (grade.startsWith('B')) return '#0ea5e9';
        return '#f59e0b';
    };

    const getAttendanceColor = (attendance) => {
        if (attendance >= 90) return '#10b981';
        if (attendance >= 75) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Students
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        sx={{ fontWeight: 600 }}
                    >
                        Export
                    </Button>
                </Box>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search students by name, email, or class..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Paper>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Attendance</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredStudents.map((student, index) => (
                                    <motion.tr
                                        key={student.id}
                                        component={TableRow}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#8b5cf6' }}>
                                                    {student.name.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 600 }}>{student.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2">{student.email}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2">{student.phone}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={student.class} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={student.grade}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getGradeColor(student.grade)}20`,
                                                    color: getGradeColor(student.grade),
                                                    fontWeight: 700
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${student.attendance}%`}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getAttendanceColor(student.attendance)}20`,
                                                    color: getAttendanceColor(student.attendance),
                                                    fontWeight: 700
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small">
                                                <MoreIcon />
                                            </IconButton>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </motion.div>
            </Box>
        </Layout>
    );
};

export default FacultyStudents;

import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    TextField,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Lock as LockIcon,
    ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { passwordResetService } from '../services/passwordReset';
import Layout from '../components/Layout';

const FacultyPasswordManagement = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetResult, setResetResult] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Verify faculty access
    if (user && user.role !== 'faculty') {
        return (
            <Layout>
                <Container>
                    <Alert severity="error" sx={{ mt: 2 }}>
                        Access Denied: Only Faculty can manage student passwords
                    </Alert>
                </Container>
            </Layout>
        );
    }

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await passwordResetService.getFacultyStudents();
            setStudents(response.students || []);
        } catch (err) {
            setError(err.message || 'Failed to load students');
            console.error('Load students error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedStudent) return;

        try {
            setLoading(true);
            const response = await passwordResetService.facultyResetPassword(selectedStudent.id);
            setResetResult(response);
            setShowResetDialog(true);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
            console.error('Reset password error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPassword = () => {
        if (resetResult?.user?.temporaryPassword) {
            navigator.clipboard.writeText(resetResult.user.temporaryPassword);
            alert('Temporary password copied to clipboard');
        }
    };

    const handleCloseDialog = () => {
        setShowResetDialog(false);
        setResetResult(null);
        setSelectedStudent(null);
        loadStudents();
    };

    const filteredStudents = students.filter(s =>
        s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <h2 style={{ margin: 0 }}>Student Password Management</h2>
                            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                                Reset passwords for students in your classes
                            </p>
                        </Box>
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={loadStudents}
                            variant="outlined"
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                    </Box>

                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        placeholder="Search by name or email..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {loading && <CircularProgress />}

                    {!loading && students.length === 0 && (
                        <Alert severity="info">
                            You don't have any students assigned to your classes yet.
                        </Alert>
                    )}

                    {!loading && students.length > 0 && (
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredStudents.map((s) => (
                                        <TableRow key={s.id} hover>
                                            <TableCell>{`${s.first_name} ${s.last_name}`}</TableCell>
                                            <TableCell>{s.email}</TableCell>
                                            <TableCell>
                                                {s.is_temporary_password && (
                                                    <Chip
                                                        label="Temporary Password"
                                                        size="small"
                                                        color="warning"
                                                        variant="filled"
                                                    />
                                                )}
                                                {s.must_change_password && (
                                                    <Chip
                                                        label="Must Change"
                                                        size="small"
                                                        color="error"
                                                        variant="filled"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                                {!s.is_temporary_password && !s.must_change_password && (
                                                    <Chip
                                                        label="Active"
                                                        size="small"
                                                        color="success"
                                                        variant="filled"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Reset Password">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="primary"
                                                        startIcon={<LockIcon />}
                                                        onClick={() => setSelectedStudent(s)}
                                                    >
                                                        Reset
                                                    </Button>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {!loading && filteredStudents.length === 0 && students.length > 0 && (
                        <Alert severity="info">No students match your search</Alert>
                    )}
                </Paper>
            </Container>

            {/* Confirm Reset Dialog */}
            <Dialog open={!!selectedStudent && !resetResult} onClose={() => setSelectedStudent(null)}>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to reset the password for {selectedStudent?.first_name} {selectedStudent?.last_name}?
                    </Alert>
                    <p>They will receive a temporary password and must change it on first login.</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedStudent(null)}>Cancel</Button>
                    <Button onClick={handleResetPassword} variant="contained" color="primary">
                        Reset Password
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reset Result Dialog */}
            <Dialog open={showResetDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Password Reset Successful</DialogTitle>
                <DialogContent>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Password has been reset successfully!
                    </Alert>
                    <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                        <Box sx={{ mb: 1 }}>
                            <strong>Student:</strong> {resetResult?.user?.name}
                        </Box>
                        <Box sx={{ mb: 1 }}>
                            <strong>Email:</strong> {resetResult?.user?.email}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box>
                                <strong>Temporary Password:</strong>
                                <Box
                                    sx={{
                                        p: 1,
                                        bgcolor: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: 1,
                                        fontFamily: 'monospace',
                                        mt: 0.5
                                    }}
                                >
                                    {resetResult?.user?.temporaryPassword}
                                </Box>
                            </Box>
                            <Tooltip title="Copy to clipboard">
                                <Button
                                    size="small"
                                    onClick={handleCopyPassword}
                                    sx={{ mt: 3 }}
                                >
                                    <CopyIcon fontSize="small" />
                                </Button>
                            </Tooltip>
                        </Box>
                    </Paper>
                    <Alert severity="info">
                        Share this temporary password with the student. They must change it on first login.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} variant="contained" color="primary">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};

export default FacultyPasswordManagement;

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
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Lock as LockIcon,
    ContentCopy as CopyIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { passwordResetService } from '../services/passwordReset';
import Layout from '../components/Layout';

const SuperAdminPasswordManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetResult, setResetResult] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Verify super admin access
    if (user && user.role !== 'super_admin') {
        return (
            <Layout>
                <Container>
                    <Alert severity="error" sx={{ mt: 2 }}>
                        Access Denied: Only Super Admins can manage user passwords
                    </Alert>
                </Container>
            </Layout>
        );
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await passwordResetService.getAllUsers();
            setUsers(response.users || []);
        } catch (err) {
            setError(err.message || 'Failed to load users');
            console.error('Load users error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser) return;

        try {
            setLoading(true);
            const response = await passwordResetService.superAdminResetPassword(selectedUser.id);
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
        setSelectedUser(null);
        loadUsers();
    };

    const filteredUsers = users.filter(u =>
        u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <h2 style={{ margin: 0 }}>User Password Management</h2>
                            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                                Reset passwords for any user in the system
                            </p>
                        </Box>
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={loadUsers}
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

                    {!loading && (
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>School</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredUsers.map((u) => (
                                        <TableRow key={u.id} hover>
                                            <TableCell>{`${u.first_name} ${u.last_name}`}</TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.role?.replace(/_/g, ' ').toUpperCase()}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>{u.school_name || 'N/A'}</TableCell>
                                            <TableCell>
                                                {u.is_temporary_password && (
                                                    <Chip
                                                        label="Temporary Password"
                                                        size="small"
                                                        color="warning"
                                                        variant="filled"
                                                    />
                                                )}
                                                {u.must_change_password && (
                                                    <Chip
                                                        label="Must Change"
                                                        size="small"
                                                        color="error"
                                                        variant="filled"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                                {!u.is_temporary_password && !u.must_change_password && (
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
                                                        onClick={() => setSelectedUser(u)}
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

                    {!loading && filteredUsers.length === 0 && (
                        <Alert severity="info">No users found</Alert>
                    )}
                </Paper>
            </Container>

            {/* Confirm Reset Dialog */}
            <Dialog open={!!selectedUser && !resetResult} onClose={() => setSelectedUser(null)}>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to reset the password for {selectedUser?.first_name} {selectedUser?.last_name}?
                    </Alert>
                    <p>They will receive a temporary password and must change it on first login.</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedUser(null)}>Cancel</Button>
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
                            <strong>User:</strong> {resetResult?.user?.name}
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
                                <IconButton
                                    size="small"
                                    onClick={handleCopyPassword}
                                    sx={{ mt: 3 }}
                                >
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Paper>
                    <Alert severity="info">
                        Share this temporary password with the user. They must change it on first login.
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

export default SuperAdminPasswordManagement;

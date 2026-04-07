import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { superAdminService, schoolService } from "../services";
import { useAuth } from "../contexts/AuthContext";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    Button,
    Divider
} from "@mui/material";
import {
    Cancel,
    CheckCircle,
    LockReset,
    Person,
    School as SchoolIcon,
    Search,
    ContentCopy
} from "@mui/icons-material";
import ConfirmDialog from "../components/ConfirmDialog";
import InfoDialog from "../components/InfoDialog";

const ResetPasswordDialog = ({ open, user, tempPassword, onClose, onCopy }) => (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Temporary Password</DialogTitle>
        <DialogContent>
            <Typography sx={{ mb: 1 }} color="text.secondary">
                Share this temporary password with <strong>{user}</strong>. They will be forced to change it on next login.
            </Typography>
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontFamily: "monospace", fontWeight: 700 }}>{tempPassword}</Typography>
                <IconButton aria-label="Copy password" onClick={onCopy} size="small">
                    <ContentCopy fontSize="small" />
                </IconButton>
            </Paper>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={onClose} variant="contained" fullWidth>
                Close
            </Button>
        </DialogActions>
    </Dialog>
);

const Users = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [schoolFilter, setSchoolFilter] = useState("all");
    const [resetModal, setResetModal] = useState({ open: false, user: "", tempPassword: "" });
    const [confirmReset, setConfirmReset] = useState({ open: false, userId: null, userName: "" });
    const [confirmToggle, setConfirmToggle] = useState({ open: false, userId: null, currentStatus: false, userName: "" });
    const [infoDialog, setInfoDialog] = useState({ open: false, title: "", message: "" });

    // Determine which service to use based on user role
    const isSchoolAdmin = user?.role === 'school_admin';
    const service = isSchoolAdmin ? schoolService : superAdminService;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = isSchoolAdmin ? await schoolService.getSchoolUsers() : await superAdminService.getAllUsers();
            setUsers(data.users || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            const dummyUsers = [
                { id: 1, firstName: "John", lastName: "Smith", email: "john.smith@springfield.edu", role: "school_admin", is_active: true, school_name: "Springfield High School" },
                { id: 2, firstName: "Sarah", lastName: "Johnson", email: "sarah.j@lincoln.edu", role: "faculty", is_active: true, school_name: "Lincoln Academy" },
                { id: 3, firstName: "Michael", lastName: "Brown", email: "m.brown@westview.edu", role: "faculty", is_active: true, school_name: "Westview International" },
                { id: 4, firstName: "Emily", lastName: "Davis", email: "emily.d@springfield.edu", role: "student", is_active: false, school_name: "Springfield High School" },
                { id: 5, firstName: "David", lastName: "Wilson", email: "david.w@riverside.edu", role: "school_admin", is_active: true, school_name: "Riverside School" },
                { id: 6, firstName: "Jessica", lastName: "Martinez", email: "j.martinez@mountainview.edu", role: "faculty", is_active: true, school_name: "Mountain View Academy" },
                { id: 7, firstName: "Robert", lastName: "Taylor", email: "r.taylor@oakwood.edu", role: "faculty", is_active: true, school_name: "Oakwood High" },
                { id: 8, firstName: "Lisa", lastName: "Anderson", email: "l.anderson@sunsetvalley.edu", role: "student", is_active: true, school_name: "Sunset Valley School" },
                { id: 9, firstName: "James", lastName: "Thomas", email: "james.t@harborpoint.edu", role: "school_admin", is_active: false, school_name: "Harbor Point Academy" },
                { id: 10, firstName: "Maria", lastName: "Garcia", email: "m.garcia@springfield.edu", role: "faculty", is_active: true, school_name: "Springfield High School" }
            ];
            setUsers(dummyUsers.map((u) => ({ ...u, first_name: u.firstName, last_name: u.lastName })));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = (userId, userName) => {
        setConfirmReset({ open: true, userId, userName });
    };

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(resetModal.tempPassword);
        } catch (err) {
            console.error("Clipboard copy failed", err);
        }
    };

    const handleToggleStatus = (userId, currentStatus, userName) => {
        setConfirmToggle({ open: true, userId, currentStatus, userName });
    };

    const getRoleBadge = (role) => {
        const map = {
            super_admin: { label: "Super Admin", color: "error" },
            school_admin: { label: "School Admin", color: "primary" },
            faculty: { label: "Faculty", color: "success" },
            student: { label: "Student", color: "secondary" }
        };
        const item = map[role] || { label: role, color: "default" };
        return <Chip label={item.label} size="small" color={item.color} variant="outlined" />;
    };

    const filteredUsers = users.filter((user) => {
        const term = search.trim().toLowerCase();
        const matchesSearch = term ? `${user.first_name} ${user.last_name} ${user.email} ${user.school_name || ""}`.toLowerCase().includes(term) : true;
        const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
        const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? user.is_active : !user.is_active;
        const matchesSchool = schoolFilter === "all" ? true : user.school_name === schoolFilter;
        return matchesSearch && matchesRole && matchesStatus && matchesSchool;
    });

    const schoolOptions = Array.from(new Set(users.map((u) => u.school_name).filter(Boolean)));

    if (loading) {
        return (
            <Layout>
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 320 }}>
                    <CircularProgress size={48} />
                </Box>
            </Layout>
        );
    }

    const totalActive = users.filter((u) => u.is_active).length;

    return (
        <Layout>
            <Box sx={{ maxWidth: 1400, mx: "auto" }}>
                <Stack spacing={3}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {isSchoolAdmin ? 'School Users' : 'All Users'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {isSchoolAdmin ? 'Manage users in your school' : 'Manage users across all schools'}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Chip icon={<CheckCircle />} label={`${totalActive} Active`} color="success" variant="outlined" />
                            <Chip icon={<Cancel />} label={`${users.length - totalActive} Inactive`} color="error" variant="outlined" />
                            <Chip icon={<Person />} label={`${users.length} Total`} color="primary" variant="outlined" />
                        </Stack>
                    </Box>

                    <Card elevation={2}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name, email, or school"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                    <FormControl sx={{ minWidth: 150 }}>
                                        <InputLabel id="role-filter-label">Role</InputLabel>
                                        <Select
                                            labelId="role-filter-label"
                                            value={roleFilter}
                                            label="Role"
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                        >
                                            <MenuItem value="all">All Roles</MenuItem>
                                            {!isSchoolAdmin && <MenuItem value="super_admin">Super Admin</MenuItem>}
                                            {!isSchoolAdmin && <MenuItem value="school_admin">School Admin</MenuItem>}
                                            <MenuItem value="faculty">Faculty</MenuItem>
                                            <MenuItem value="student">Student</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl sx={{ minWidth: 150 }}>
                                        <InputLabel id="status-filter-label">Status</InputLabel>
                                        <Select
                                            labelId="status-filter-label"
                                            value={statusFilter}
                                            label="Status"
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <MenuItem value="all">All</MenuItem>
                                            <MenuItem value="active">Active</MenuItem>
                                            <MenuItem value="inactive">Inactive</MenuItem>
                                        </Select>
                                    </FormControl>
                                    {!isSchoolAdmin && (
                                    <FormControl sx={{ minWidth: 180 }}>
                                        <InputLabel id="school-filter-label">School</InputLabel>
                                        <Select
                                            labelId="school-filter-label"
                                            value={schoolFilter}
                                            label="School"
                                            onChange={(e) => setSchoolFilter(e.target.value)}
                                        >
                                            <MenuItem value="all">All Schools</MenuItem>
                                            {schoolOptions.map((name) => (
                                                <MenuItem key={name} value={name}>
                                                    {name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    )}
                                </Stack>

                                <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Email</TableCell>
                                                <TableCell>Role</TableCell>
                                                <TableCell>School</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredUsers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center">
                                                        <Typography variant="body2" color="text.secondary">
                                                            No users found
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {filteredUsers.map((user) => {
                                                const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` || "U";
                                                return (
                                                    <TableRow key={user.id} hover>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar>{initials}</Avatar>
                                                                <Box>
                                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                        {user.first_name} {user.last_name}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        ID: {user.id}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {user.email}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <SchoolIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {user.school_name || "N/A"}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={user.is_active ? "Active" : "Inactive"}
                                                                color={user.is_active ? "success" : "error"}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                <Tooltip title="Reset password">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="primary"
                                                                        onClick={() => handleResetPassword(user.id, `${user.first_name} ${user.last_name}`)}
                                                                    >
                                                                        <LockReset fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title={user.is_active ? "Deactivate" : "Activate"}>
                                                                    <IconButton
                                                                        size="small"
                                                                        color={user.is_active ? "error" : "success"}
                                                                        onClick={() => handleToggleStatus(user.id, user.is_active, `${user.first_name} ${user.last_name}`)}
                                                                    >
                                                                        {user.is_active ? <Cancel fontSize="small" /> : <CheckCircle fontSize="small" />}
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>
            <ResetPasswordDialog
                open={resetModal.open}
                user={resetModal.user}
                tempPassword={resetModal.tempPassword}
                onClose={() => setResetModal({ open: false, user: "", tempPassword: "" })}
                onCopy={handleCopyPassword}
            />
            <ConfirmDialog
                open={confirmReset.open}
                title="Reset Password"
                description={`Reset password for ${confirmReset.userName}?`}
                confirmLabel="Reset"
                confirmColor="warning"
                onClose={() => setConfirmReset({ open: false, userId: null, userName: "" })}
                onConfirm={async () => {
                    try {
                        const data = await service.resetUserPassword(confirmReset.userId);
                        setConfirmReset({ open: false, userId: null, userName: "" });
                        setResetModal({ open: true, user: confirmReset.userName, tempPassword: data.tempPassword });
                    } catch (error) {
                        setConfirmReset({ open: false, userId: null, userName: "" });
                        setInfoDialog({ open: true, title: 'Reset Failed', message: error.response?.data?.message || 'Error resetting password' });
                    }
                }}
            />
            <ConfirmDialog
                open={confirmToggle.open}
                title={confirmToggle.currentStatus ? 'Deactivate User' : 'Activate User'}
                description={`${confirmToggle.currentStatus ? 'Deactivate' : 'Activate'} ${confirmToggle.userName}?`}
                confirmLabel={confirmToggle.currentStatus ? 'Deactivate' : 'Activate'}
                confirmColor={confirmToggle.currentStatus ? 'error' : 'success'}
                onClose={() => setConfirmToggle({ open: false, userId: null, currentStatus: false, userName: '' })}
                onConfirm={async () => {
                    try {
                        await service.toggleUserStatus(confirmToggle.userId, !confirmToggle.currentStatus);
                        setConfirmToggle({ open: false, userId: null, currentStatus: false, userName: '' });
                        fetchUsers();
                    } catch (error) {
                        setConfirmToggle({ open: false, userId: null, currentStatus: false, userName: '' });
                        setInfoDialog({ open: true, title: 'Update Failed', message: error.response?.data?.message || 'Error updating user status' });
                    }
                }}
            />
            <InfoDialog
                open={infoDialog.open}
                title={infoDialog.title}
                message={infoDialog.message}
                onClose={() => setInfoDialog({ open: false, title: '', message: '' })}
            />
        </Layout>
    );
};

export default Users;

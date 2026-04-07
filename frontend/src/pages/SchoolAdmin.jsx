import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { schoolService } from '../services';
import { 
  Alert, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  Chip, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  FormControl, 
  InputAdornment, 
  InputLabel, 
  MenuItem, 
  Select, 
  Stack, 
  Tab, 
  Tabs, 
  TextField, 
  Typography, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import { Add, People, Person, PersonAdd, Search, Edit as EditIcon, Delete as DeleteIcon, Mail, Lock, Visibility } from '@mui/icons-material';

const RoleChip = ({ role }) => {
  const roleConfig = {
    faculty: { color: '#3b82f6', bg: '#dbeafe', icon: Person },
    student: { color: '#8b5cf6', bg: '#ede9fe', icon: PersonAdd },
  };
  const config = roleConfig[role] || { color: '#6b7280', bg: '#f3f4f6' };
  return (
    <Chip 
      label={role?.charAt(0).toUpperCase() + role?.slice(1)} 
      size="small"
      sx={{
        backgroundColor: config.bg,
        color: config.color,
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase'
      }}
    />
  );
};

const StatusChip = ({ isActive }) => (
  <Chip 
    label={isActive ? 'Active' : 'Inactive'} 
    size="small"
    sx={{
      backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
      color: isActive ? '#16a34a' : '#dc2626',
      fontWeight: 600,
      fontSize: '0.75rem'
    }}
  />
);

const SchoolAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const schoolDomain = useMemo(() => {
    if (user?.email && user.email.includes('@')) return user.email.split('@')[1];
    return '';
  }, [user?.email]);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState(0); // 0: All, 1: Faculty, 2: Students
  const [q, setQ] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'faculty' });


  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await schoolService.getSchoolUsers();
        setUsers(data.users || []);
      } catch (e) {
        console.error('Failed to load school users', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleAddUser = async () => {
    setError('');
    setMessage('');

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError('All fields are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setCreating(true);
    try {
      const response = await schoolService.createUser(formData);
      setMessage(response.message || 'User created successfully.');
      setFormData({ first_name: '', last_name: '', email: '', password: '', role: 'faculty' });
      setOpenDialog(false);
      // Reload users
      const data = await schoolService.getSchoolUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Create user error:', err);
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.message || 
                      err.message || 
                      'Failed to create user.';
      setError(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const byRole = users.filter(u => {
      if (tab === 1) return u.role === 'faculty';
      if (tab === 2) return u.role === 'student';
      return true;
    });
    const qq = q.trim().toLowerCase();
    if (!qq) return byRole;
    return byRole.filter(u => (
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(qq) ||
      (u.email || '').toLowerCase().includes(qq)
    ));
  }, [users, tab, q]);

  return (
    <Layout>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1.5, borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' }}>
            <People sx={{ color: 'white', fontSize: '2rem' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827' }}>School Users</Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>Manage faculty members and students</Typography>
          </Box>
        </Box>
      </Box>

      {/* Action Bar */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <TextField
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search users..."
          size="small"
          sx={{ flex: { xs: 1, sm: 'auto' }, minWidth: '250px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#9ca3af' }} />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ flex: 1 }} />
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => { setOpenDialog(true); setError(''); setFormData({ first_name: '', last_name: '', email: '', password: '', role: 'faculty' }); }}
          sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.2,
            px: 3
          }}
        >
          Add User
        </Button>
      </Box>

      {/* Alerts */}
      {(error || message) && (
        <Box sx={{ mb: 3 }}>
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError('')}
              sx={{ borderRadius: '8px', mb: 2 }}
            >
              {error}
            </Alert>
          )}
          {message && (
            <Alert 
              severity="success" 
              onClose={() => setMessage('')}
              sx={{ borderRadius: '8px' }}
            >
              {message}
            </Alert>
          )}
        </Box>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: '#e5e7eb' }}>
        <Tabs 
          value={tab} 
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: '#3b82f6', height: 3 },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#6b7280',
              '&.Mui-selected': { color: '#3b82f6' }
            }
          }}
        >
          <Tab icon={<People sx={{ mr: 1 }} />} iconPosition="start" label="All Users" />
          <Tab icon={<Person sx={{ mr: 1 }} />} iconPosition="start" label="Faculty" />
          <Tab icon={<PersonAdd sx={{ mr: 1 }} />} iconPosition="start" label="Students" />
        </Tabs>
      </Paper>

      {/* Users List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px', border: '1px solid', borderColor: '#e5e7eb' }}>
          <Box sx={{ mb: 2, opacity: 0.5 }}>
            <People sx={{ fontSize: '3rem', color: '#9ca3af' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>No users found</Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            {q ? 'Try adjusting your search criteria' : 'Get started by adding your first user'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid', borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <TableCell sx={{ fontWeight: 700, color: '#374151', py: 2 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => (
                <TableRow 
                  key={u.id} 
                  sx={{
                    '&:hover': { backgroundColor: '#f9fafb' },
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  <TableCell sx={{ py: 2.5, fontWeight: 600, color: '#111827' }}>
                    {u.first_name} {u.last_name}
                  </TableCell>
                  <TableCell sx={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Mail sx={{ fontSize: '0.9rem', color: '#9ca3af' }} />
                      {u.email}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <RoleChip role={u.role} />
                  </TableCell>
                  <TableCell>
                    <StatusChip isActive={u.is_active} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/school-admin/users/${u.id}`)}
                        sx={{ color: '#3b82f6', '&:hover': { backgroundColor: '#dbeafe' } }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => { setOpenDialog(false); setError(''); }} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', pt: 3 }}>
          Add New User
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="First Name"
              placeholder="Enter first name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Last Name"
              placeholder="Enter last name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Email"
              type="text"
              placeholder="username"
              value={formData.email.includes('@') ? formData.email.split('@')[0] : formData.email}
              onChange={(e) => {
                const prefix = e.target.value.replace('@', '');
                setFormData({ ...formData, email: schoolDomain ? prefix + '@' + schoolDomain : prefix });
              }}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail sx={{ color: '#9ca3af', fontSize: '1.2rem' }} />
                  </InputAdornment>
                ),
                endAdornment: schoolDomain ? (
                  <InputAdornment position="end">
                    <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      @{schoolDomain}
                    </Typography>
                  </InputAdornment>
                ) : null,
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              placeholder="Enter secure password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#9ca3af', fontSize: '1.2rem' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="faculty">Faculty</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => { setOpenDialog(false); setError(''); }}
            sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddUser} 
            disabled={creating}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px'
            }}
          >
            {creating ? <CircularProgress size={20} sx={{ mr: 1 }} /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default SchoolAdmin;

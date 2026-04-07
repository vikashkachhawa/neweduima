import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { schoolService } from '../services';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  Block,
  CheckCircle,
  ContentCopy,
  Email,
  Person,
  VpnKey,
  CalendarToday,
  Circle,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material';

const Field = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2 }}>
    <Box sx={{ color: '#9ca3af', mt: 0.3 }}>{icon}</Box>
    <Box>
      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ color: '#111827', fontWeight: 500, mt: 0.2 }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const roleColors = {
  faculty:      { bg: '#dbeafe', color: '#1d4ed8' },
  student:      { bg: '#ede9fe', color: '#7c3aed' },
  school_admin: { bg: '#dcfce7', color: '#16a34a' },
};

const SchoolUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [pageError, setPageError] = useState('');

  // Reset password state
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [resetting, setResetting]       = useState(false);
  const [resetResult, setResetResult]   = useState(null);
  const [copied, setCopied]             = useState(false);
  const [resetError, setResetError]     = useState('');

  // Toggle status state
  const [toggleOpen, setToggleOpen]     = useState(false);
  const [toggling, setToggling]         = useState(false);
  const [toggleError, setToggleError]   = useState('');
  const [snackbar, setSnackbar]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await schoolService.getUserById(userId);
        setUser(data.user);
      } catch (e) {
        console.error('Failed to load user', e);
        setPageError('Failed to load user details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // ── Reset password ──────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    setResetting(true);
    setResetError('');
    try {
      const response = await schoolService.resetUserPassword(userId);
      setConfirmOpen(false);
      setResetResult({ tempPassword: response.tempPassword });
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const handleCopy = () => {
    if (resetResult?.tempPassword) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Toggle active status ────────────────────────────────────────────────────
  const handleToggleStatus = async () => {
    setToggling(true);
    setToggleError('');
    try {
      await schoolService.toggleUserStatus(userId, !user.is_active);
      setUser(prev => ({ ...prev, is_active: !prev.is_active }));
      setToggleOpen(false);
      setSnackbar(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      console.error('Toggle status error:', err);
      setToggleError(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setToggling(false);
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '';

  const roleColor = roleColors[user?.role] ?? { bg: '#f3f4f6', color: '#374151' };

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const roleLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '—';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Back button + heading */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Tooltip title="Back to School Admin">
          <IconButton onClick={() => navigate('/school-admin')} sx={{ color: '#374151' }}>
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
            User Details
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            View and manage user account
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : pageError ? (
        <Alert severity="error" sx={{ borderRadius: '8px' }}>{pageError}</Alert>
      ) : user ? (
        <Paper sx={{ borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', maxWidth: 620 }}>

          {/* ── Banner ── */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              px: 4,
              py: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Avatar
              sx={{
                width: 76,
                height: 76,
                fontSize: '1.8rem',
                fontWeight: 800,
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '3px solid rgba(255,255,255,0.4)',
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', mb: 0.5 }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={roleLabel}
                  size="small"
                  sx={{ backgroundColor: roleColor.bg, color: roleColor.color, fontWeight: 700, fontSize: '0.72rem' }}
                />
                <Chip
                  icon={<Circle sx={{ fontSize: '8px !important', color: user.is_active ? '#16a34a' : '#dc2626' }} />}
                  label={user.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2',
                    color: user.is_active ? '#16a34a' : '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* ── Detail fields ── */}
          <Box sx={{ px: 4, py: 1 }}>
            <Field icon={<Email fontSize="small" />}        label="Email Address" value={user.email} />
            <Divider />
            <Field icon={<Person fontSize="small" />}       label="Role"          value={roleLabel} />
            <Divider />
            <Field icon={<CalendarToday fontSize="small" />} label="Joined"       value={joinedDate} />
          </Box>

          {/* ── Actions ── */}
          <Box
            sx={{
              px: 4,
              py: 3,
              backgroundColor: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {/* Toggle active/inactive */}
            <Tooltip title={user.is_active ? 'Deactivate this account' : 'Activate this account'}>
              <Button
                variant="outlined"
                startIcon={user.is_active ? <Block /> : <ToggleOn />}
                onClick={() => { setToggleError(''); setToggleOpen(true); }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '8px',
                  px: 3,
                  borderColor: user.is_active ? '#dc2626' : '#16a34a',
                  color:       user.is_active ? '#dc2626' : '#16a34a',
                  '&:hover': {
                    backgroundColor: user.is_active ? '#fee2e2' : '#dcfce7',
                    borderColor:     user.is_active ? '#b91c1c' : '#15803d',
                  },
                }}
              >
                {user.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </Tooltip>

            {/* Reset password */}
            <Button
              variant="contained"
              startIcon={<VpnKey />}
              onClick={() => { setResetError(''); setConfirmOpen(true); }}
              sx={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                px: 3,
              }}
            >
              Reset Password
            </Button>
          </Box>
        </Paper>
      ) : null}

      {/* ── Confirm Reset Password Dialog ── */}
      <Dialog
        open={confirmOpen}
        onClose={() => { if (!resetting) setConfirmOpen(false); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pt: 3 }}>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#374151' }}>
            A new temporary password will be generated for{' '}
            <strong>{user?.first_name} {user?.last_name}</strong>.
            They will be required to change it on next login.
          </Typography>
          {resetError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>{resetError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={resetting}
            sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={resetting}
            sx={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
            }}
          >
            {resetting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Toggle Status Dialog ── */}
      <Dialog
        open={toggleOpen}
        onClose={() => { if (!toggling) setToggleOpen(false); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          {user?.is_active
            ? <Block sx={{ color: '#dc2626' }} />
            : <ToggleOn sx={{ color: '#16a34a' }} />
          }
          {user?.is_active ? 'Deactivate Account' : 'Activate Account'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#374151' }}>
            {user?.is_active
              ? <>This will prevent <strong>{user?.first_name} {user?.last_name}</strong> from logging in until reactivated.</>
              : <>This will allow <strong>{user?.first_name} {user?.last_name}</strong> to log in again.</>
            }
          </Typography>
          {toggleError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>{toggleError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setToggleOpen(false)}
            disabled={toggling}
            sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleToggleStatus}
            disabled={toggling}
            sx={{
              background: user?.is_active
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
            }}
          >
            {toggling
              ? <CircularProgress size={20} sx={{ color: 'white' }} />
              : (user?.is_active ? 'Deactivate' : 'Activate')
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Temp Password Result Dialog ── */}
      <Dialog
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: '#16a34a' }} />
          Password Reset
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#374151', mb: 2 }}>
            Share this temporary password with <strong>{user?.first_name} {user?.last_name}</strong>:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderRadius: '8px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
            }}
          >
            <Typography
              variant="body1"
              sx={{ flex: 1, fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#111827', letterSpacing: '0.05em' }}
            >
              {resetResult?.tempPassword}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? '#16a34a' : '#6b7280' }}>
                {copied ? <CheckCircle fontSize="small" /> : <ContentCopy fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1, display: 'block' }}>
            The user must change this password upon next login.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setResetResult(null)}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Success snackbar ── */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3500}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar('')} severity="success" sx={{ borderRadius: '8px', fontWeight: 600 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default SchoolUserDetail;

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Add,
  Event,
  Groups,
  Login,
  Lock,
  MeetingRoom,
  Videocam,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import eduMeetService from '../services/edumeet';

const STATUS_COLOR = {
  scheduled: 'info',
  live: 'success',
  ended: 'default',
};

const TYPE_LABEL = {
  one_to_one: 'One-to-One',
  one_to_many: 'One-to-Many',
  many_to_many: 'Many-to-Many',
};

const CreateRoomDialog = ({ open, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    conference_type: 'many_to_many',
    scheduled_at: '',
    duration_minutes: 45,
    primary_language: 'bilingual',
    low_bandwidth_mode: true,
    allow_private_chat: true,
    allow_screen_share: true,
    allow_file_sharing: true,
    attendance_tracking_enabled: true,
    recording_enabled: true,
    breakout_enabled: true,
    room_password: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        conference_type: 'many_to_many',
        scheduled_at: '',
        duration_minutes: 45,
        primary_language: 'bilingual',
        low_bandwidth_mode: true,
        allow_private_chat: true,
        allow_screen_share: true,
        allow_file_sharing: true,
        attendance_tracking_enabled: true,
        recording_enabled: true,
        breakout_enabled: true,
        room_password: '',
      });
    }
  }, [open]);

  const setField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    await onSubmit({
      ...form,
      scheduled_at: form.scheduled_at || null,
      duration_minutes: Number(form.duration_minutes) || 45,
    });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create EduMeet Session</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Create a virtual classroom with meeting type, schedule, language, and classroom controls in one place.
          </Alert>
          <TextField label="Session Title *" value={form.title} onChange={setField('title')} fullWidth size="small" />
          <TextField label="Description" value={form.description} onChange={setField('description')} fullWidth multiline rows={2} size="small" />
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField select label="Conference Type" value={form.conference_type} onChange={setField('conference_type')} fullWidth size="small">
                <MenuItem value="one_to_one">One-to-One</MenuItem>
                <MenuItem value="one_to_many">One-to-Many</MenuItem>
                <MenuItem value="many_to_many">Many-to-Many</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Schedule" type="datetime-local" value={form.scheduled_at} onChange={setField('scheduled_at')} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Duration (minutes)" type="number" value={form.duration_minutes} onChange={setField('duration_minutes')} fullWidth size="small" inputProps={{ min: 15, max: 480 }} />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField select label="Language Mode" value={form.primary_language} onChange={setField('primary_language')} fullWidth size="small">
                <MenuItem value="english">English</MenuItem>
                <MenuItem value="hindi">Hindi</MenuItem>
                <MenuItem value="bilingual">English + Hindi</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Room Password (optional)" value={form.room_password} onChange={setField('room_password')} fullWidth size="small" type="password" />
            </Grid>
          </Grid>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="textSecondary">Low bandwidth mode is automatically enabled for optimized performance</Typography>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !form.title.trim()}>
          {loading ? <CircularProgress size={18} /> : 'Create Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const JoinRoomDialog = ({ open, onClose, onSubmit, loading }) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setCode('');
      setPassword('');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Join EduMeet Session</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Room Code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} size="small" inputProps={{ style: { letterSpacing: 3, fontFamily: 'monospace' } }} />
          <TextField label="Room Password (if any)" value={password} onChange={(event) => setPassword(event.target.value)} size="small" type="password" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSubmit(code.trim(), password)} variant="contained" disabled={loading || !code.trim()} startIcon={<Login />}>
          {loading ? <CircularProgress size={18} /> : 'Join'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RoomCard = ({ room, onOpen }) => (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 3, cursor: 'pointer' }} onClick={() => onOpen(room.id)}>
    <CardContent>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
          <Typography variant="h6" fontWeight={700}>{room.title}</Typography>
          <Chip label={room.status} size="small" color={STATUS_COLOR[room.status] || 'default'} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {room.description || 'Virtual classroom session for teaching, collaboration, and live engagement.'}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={TYPE_LABEL[room.conference_type] || 'Session'} size="small" variant="outlined" />
          <Chip icon={<Groups sx={{ fontSize: 16 }} />} label={`${room.participant_count || 0} participants`} size="small" variant="outlined" />
          <Chip icon={<Videocam sx={{ fontSize: 16 }} />} label={room.low_bandwidth_mode ? 'Low bandwidth' : 'HD mode'} size="small" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <MeetingRoom sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{room.room_code}</Typography>
          {room.is_password_protected && (
            <Tooltip title="Password protected">
              <Lock sx={{ fontSize: 16, color: 'warning.main' }} />
            </Tooltip>
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Event sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {room.scheduled_at ? new Date(room.scheduled_at).toLocaleString() : 'Start anytime'}
          </Typography>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

const EduMeet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = ['faculty', 'school_admin', 'super_admin'].includes(user?.role);
  const [tab, setTab] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilter = ['', 'scheduled', 'live', 'ended'][tab];

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eduMeetService.listRooms(statusFilter);
      setRooms(data);
      setError('');
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Failed to load EduMeet rooms');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async (payload) => {
    try {
      setActionLoading(true);
      const data = await eduMeetService.createRoom(payload);
      setCreateOpen(false);
      setSuccess('EduMeet session created.');
      navigate(`/edumeet/rooms/${data.room.id}/prejoin`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (code, password) => {
    try {
      setActionLoading(true);
      const data = await eduMeetService.joinByCode(code, password);
      setJoinOpen(false);
      setSuccess('Joined EduMeet session.');
      navigate(`/edumeet/rooms/${data.room.id}/prejoin`);
    } catch (joinError) {
      setError(joinError?.response?.data?.message || 'Failed to join session');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>EduMeet</Typography>
            <Typography color="text.secondary">
              Live virtual classrooms for one-to-one mentoring, teacher broadcasts, and collaborative school sessions.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Login />} onClick={() => setJoinOpen(true)}>
              Join by Code
            </Button>
            {canCreate && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
                Create Session
              </Button>
            )}
          </Stack>
        </Stack>

        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        <Alert severity="info" sx={{ mb: 2 }}>
          EduMeet is designed for school-safe conferencing with attendance, chat, whiteboard, polls, teacher controls, and low-bandwidth mode.
        </Alert>

        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
          <Tab label="All" />
          <Tab label="Scheduled" />
          <Tab label="Live" />
          <Tab label="Ended" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {rooms.map((room) => (
              <Grid item xs={12} md={6} lg={4} key={room.id}>
                <RoomCard room={room} onOpen={(roomId) => navigate(`/edumeet/rooms/${roomId}/prejoin`)} />
              </Grid>
            ))}
            {rooms.length === 0 && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Videocam sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" fontWeight={700} gutterBottom>No EduMeet sessions yet</Typography>
                    <Typography color="text.secondary">
                      {canCreate ? 'Create a new virtual classroom session to get started.' : 'Join a session with a room code from your teacher or school admin.'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </Box>

      <CreateRoomDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} loading={actionLoading} />
      <JoinRoomDialog open={joinOpen} onClose={() => setJoinOpen(false)} onSubmit={handleJoin} loading={actionLoading} />
    </Layout>
  );
};

export default EduMeet;

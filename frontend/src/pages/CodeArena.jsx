import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import {
  Add,
  Code,
  ContentCopy,
  Delete,
  EmojiEvents,
  Groups,
  Login,
  PlayArrow,
  Stop,
  Timer,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import codeArenaService from '../services/codeArena';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  draft: 'default',
  active: 'success',
  ended: 'error',
};

const MODE_COLOR = {
  practice: 'info',
  exam: 'warning',
};

const RoomCard = ({ room, isFaculty, onStart, onEnd, onDelete, onOpen }) => {
  const copied = useCallback(() => {
    navigator.clipboard.writeText(room.invite_code).catch(() => {});
  }, [room.invite_code]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        borderRadius: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
        cursor: 'pointer',
      }}
      onClick={() => onOpen(room)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, mr: 1 }}>
          {room.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Chip label={room.status} size="small" color={STATUS_COLOR[room.status]} />
          <Chip label={room.mode} size="small" color={MODE_COLOR[room.mode]} variant="outlined" />
        </Box>
      </Box>

      {room.description && (
        <Typography variant="body2" color="text.secondary" noWrap>
          {room.description}
        </Typography>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Timer sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {room.duration_minutes} min
          </Typography>
        </Box>
        {room.problem_count !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Code sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {room.problem_count} problem{room.problem_count !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
        {room.student_count !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Groups sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {room.student_count} student{room.student_count !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </Stack>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Code:
        </Typography>
        <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary">
          {room.invite_code}
        </Typography>
        <Tooltip title="Copy invite code">
          <ContentCopy
            sx={{ fontSize: 14, color: 'text.secondary', cursor: 'pointer', ml: 0.5 }}
            onClick={(e) => { e.stopPropagation(); copied(); }}
          />
        </Tooltip>
      </Box>

      {isFaculty && (
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
          {room.status === 'draft' && (
            <Button size="small" variant="contained" color="success" startIcon={<PlayArrow />}
              onClick={() => onStart(room.id)}>
              Start
            </Button>
          )}
          {room.status === 'active' && (
            <Button size="small" variant="outlined" color="warning" startIcon={<Stop />}
              onClick={() => onEnd(room.id)}>
              End
            </Button>
          )}
          <Button size="small" variant="outlined" color="error" startIcon={<Delete />}
            onClick={() => onDelete(room.id)}
            disabled={room.status === 'active'}>
            Delete
          </Button>
        </Box>
      )}
    </Paper>
  );
};

// ─── Create Room Dialog ──────────────────────────────────────────────────────

const CreateRoomDialog = ({ open, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    mode: 'practice',
    max_attempts: 3,
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    await onSubmit(form);
    setForm({ title: '', description: '', duration_minutes: 60, mode: 'practice', max_attempts: 3 });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create CodeArena Room</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Room Title *" value={form.title} onChange={set('title')} fullWidth size="small"
            inputProps={{ maxLength: 200 }} />
          <TextField label="Description" value={form.description} onChange={set('description')} fullWidth
            size="small" multiline rows={2} />
          <Stack direction="row" spacing={2}>
            <TextField label="Duration (minutes)" type="number" value={form.duration_minutes}
              onChange={set('duration_minutes')} size="small"
              inputProps={{ min: 5, max: 480 }} sx={{ flex: 1 }} />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Mode</InputLabel>
              <Select value={form.mode} label="Mode" onChange={set('mode')}>
                <MenuItem value="practice">Practice</MenuItem>
                <MenuItem value="exam">Exam</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          {form.mode === 'exam' && (
            <TextField label="Max Attempts per Problem" type="number" value={form.max_attempts}
              onChange={set('max_attempts')} size="small" inputProps={{ min: 1, max: 20 }} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !form.title.trim()}>
          {loading ? <CircularProgress size={18} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Join by Code Dialog ────────────────────────────────────────────────────

const JoinCodeDialog = ({ open, onClose, onSubmit, loading }) => {
  const [code, setCode] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return;
    await onSubmit(code.trim().toUpperCase());
    setCode('');
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Join Room by Code</DialogTitle>
      <DialogContent>
        <TextField
          label="Invite Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          fullWidth size="small" sx={{ mt: 1 }}
          inputProps={{ maxLength: 12, style: { fontFamily: 'monospace', letterSpacing: 4, fontSize: 18 } }}
          placeholder="e.g. AB12CD34"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !code.trim()}>
          {loading ? <CircularProgress size={18} /> : 'Join'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CodeArena = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isFaculty = ['faculty', 'school_admin'].includes(user?.role);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilter = [undefined, 'draft', 'active', 'ended'][tab] ?? undefined;

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await codeArenaService.listRooms(statusFilter);
      setRooms(data);
      setError('');
    } catch {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async (form) => {
    try {
      setActionLoading(true);
      const data = await codeArenaService.createRoom(form);
      setCreateOpen(false);
      navigate(`/codearena/rooms/${data.room.id}`);
    } catch {
      setError('Failed to create room');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (code) => {
    try {
      setActionLoading(true);
      const data = await codeArenaService.joinByCode(code);
      setJoinOpen(false);
      navigate(`/codearena/rooms/${data.room.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid invite code');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async (roomId) => {
    try {
      await codeArenaService.startRoom(roomId);
      loadRooms();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start room');
    }
  };

  const handleEnd = async (roomId) => {
    try {
      await codeArenaService.endRoom(roomId);
      loadRooms();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to end room');
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      await codeArenaService.deleteRoom(roomId);
      loadRooms();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleOpen = (room) => {
    navigate(`/codearena/rooms/${room.id}`);
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EmojiEvents sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight={800}>CodeArena</Typography>
              <Typography variant="body2" color="text.secondary">
                {isFaculty ? 'Manage live coding rooms' : 'Join coding assessments'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isFaculty && (
              <Button variant="outlined" startIcon={<Login />} onClick={() => setJoinOpen(true)}>
                Join by Code
              </Button>
            )}
            {isFaculty && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
                New Room
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="All" />
          <Tab label="Draft" />
          <Tab label="Active" />
          <Tab label="Ended" />
        </Tabs>
        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : rooms.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Code sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {isFaculty ? 'No rooms yet. Create your first CodeArena room to get started.' : 'No rooms found. Ask your faculty for an invite code.'}
            </Typography>
            {isFaculty && (
              <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setCreateOpen(true)}>
                Create Room
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={2}>
            {rooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} key={room.id}>
                <RoomCard
                  room={room}
                  isFaculty={isFaculty}
                  onStart={handleStart}
                  onEnd={handleEnd}
                  onDelete={handleDelete}
                  onOpen={handleOpen}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <CreateRoomDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} loading={actionLoading} />
      <JoinCodeDialog open={joinOpen} onClose={() => setJoinOpen(false)} onSubmit={handleJoin} loading={actionLoading} />
    </Layout>
  );
};

export default CodeArena;

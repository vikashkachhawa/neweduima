import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, IconButton, InputAdornment, InputLabel, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, MenuItem, Paper, Select, Stack, Switch, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { useTheme } from '@mui/material/styles';
import {
  Add,
  ArrowBack,
  CheckCircle,
  Close,
  Code,
  ContentCopy,
  Dashboard,
  Delete,
  Edit,
  Error as ErrorIcon,
  Groups,
  HourglassEmpty,
  KeyboardArrowDown,
  KeyboardArrowUp,
  PersonAdd,
  PlayArrow,
  Refresh,
  Search,
  SelectAll,
  Stop,
  Timer,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import codeArenaService from '../services/codeArena';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIFF_COLOR = { basic: 'success', intermediate: 'warning', advanced: 'error' };
const STATUS_ICON = {
  invited: <HourglassEmpty sx={{ fontSize: 16, color: 'text.disabled' }} />,
  joined: <CheckCircle sx={{ fontSize: 16, color: 'info.main' }} />,
  active: <CheckCircle sx={{ fontSize: 16, color: 'success.light' }} />,
  coding: <Code sx={{ fontSize: 16, color: 'warning.main' }} />,
  submitted: <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />,
  left: <Close sx={{ fontSize: 16, color: 'error.main' }} />,
};

const padTime = (n) => String(n).padStart(2, '0');
const formatCountdown = (endsAt) => {
  if (!endsAt) return null;
  const diff = Math.max(0, new Date(endsAt) - new Date());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${h > 0 ? padTime(h) + ':' : ''}${padTime(m)}:${padTime(s)}`;
};

// ─── Add Problem Dialog ───────────────────────────────────────────────────────

const ProblemDialog = ({ open, onClose, onSubmit, loading, initial = null }) => {
  const [form, setForm] = useState(
    initial || {
      title: '',
      description: '',
      constraints: '',
      sample_input: '',
      sample_output: '',
      difficulty: 'basic',
    }
  );
  const [testCases, setTestCases] = useState(initial?.test_cases || [{ input_data: '', expected_output: '', is_hidden: false, time_limit_ms: 2000 }]);

  useEffect(() => {
    if (open) {
      setForm(initial || { title: '', description: '', constraints: '', sample_input: '', sample_output: '', difficulty: 'basic' });
      setTestCases(initial?.test_cases || [{ input_data: '', expected_output: '', is_hidden: false, time_limit_ms: 2000 }]);
    }
  }, [open, initial]);

  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));
  const setTC = (i, f) => (e) => {
    const updated = [...testCases];
    updated[i] = { ...updated[i], [f]: f === 'is_hidden' ? e.target.checked : e.target.value };
    setTestCases(updated);
  };

  const addTC = () => setTestCases((v) => [...v, { input_data: '', expected_output: '', is_hidden: false, time_limit_ms: 2000 }]);
  const removeTC = (i) => setTestCases((v) => v.filter((_, idx) => idx !== i));

  const applySampleAsFirstTest = () => {
    if (!form.sample_input.trim() && !form.sample_output.trim()) return;
    setTestCases((prev) => {
      const next = [...prev];
      if (!next.length) {
        return [{ input_data: form.sample_input, expected_output: form.sample_output, is_hidden: false, time_limit_ms: 2000 }];
      }
      next[0] = {
        ...next[0],
        input_data: form.sample_input,
        expected_output: form.sample_output,
        is_hidden: false,
      };
      return next;
    });
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    onSubmit({ ...form, test_cases: testCases.filter((tc) => tc.input_data !== '' || tc.expected_output !== '') });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Edit Coding Problem' : 'Create Coding Problem'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Teacher flow: 1) Write problem statement 2) Add sample input/output 3) Add evaluation test cases (one input line per input call).
          </Alert>

          <Typography variant="subtitle2" fontWeight={700}>Problem Statement</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Problem Title *" value={form.title} onChange={set('title')} fullWidth size="small" />
            <TextField
              select label="Difficulty Level" value={form.difficulty} onChange={set('difficulty')} size="small" sx={{ minWidth: 160 }}
              SelectProps={{ native: true }}
            >
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </TextField>
          </Stack>

          <TextField label="Question Description *" value={form.description} onChange={set('description')} fullWidth
            multiline rows={4} size="small" />
          <TextField label="Constraints (optional)" value={form.constraints} onChange={set('constraints')} fullWidth
            multiline rows={2} size="small" />

          <Typography variant="subtitle2" fontWeight={700}>Student Sample (Visible)</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Sample Input" value={form.sample_input} onChange={set('sample_input')} fullWidth
              multiline rows={2} size="small" inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }} />
            <TextField label="Sample Output" value={form.sample_output} onChange={set('sample_output')} fullWidth
              multiline rows={2} size="small" inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }} />
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" variant="outlined" onClick={applySampleAsFirstTest} disabled={!form.sample_input.trim() && !form.sample_output.trim()}>
              Use Sample as Test 1
            </Button>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>Evaluation Test Cases</Typography>
              <Button size="small" startIcon={<Add />} onClick={addTC}>Add Test Case</Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Tip: Each test case is one full run. If code uses multiple input() calls, include all values in that single test case on separate lines.
            </Typography>
            <Stack spacing={1}>
              {testCases.map((tc, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Test {i + 1}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControlLabel
                        control={<Switch checked={tc.is_hidden} onChange={setTC(i, 'is_hidden')} size="small" />}
                        label={<Typography variant="caption">Hidden (evaluation only)</Typography>}
                        sx={{ mr: 0 }}
                      />
                      <IconButton size="small" onClick={() => removeTC(i)} disabled={testCases.length === 1}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <TextField label="Input (one line per value)" value={tc.input_data} onChange={setTC(i, 'input_data')} fullWidth
                      multiline rows={2} size="small" inputProps={{ style: { fontFamily: 'monospace', fontSize: 11 } }} />
                    <TextField label="Expected Output" value={tc.expected_output} onChange={setTC(i, 'expected_output')} fullWidth
                      multiline rows={2} size="small" inputProps={{ style: { fontFamily: 'monospace', fontSize: 11 } }} />
                    <TextField label="Time Limit (ms)" type="number" value={tc.time_limit_ms} onChange={setTC(i, 'time_limit_ms')}
                      size="small" sx={{ width: 130 }} inputProps={{ min: 500, max: 10000 }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !form.title.trim() || !form.description.trim()}>
          {loading ? <CircularProgress size={18} /> : (initial ? 'Save' : 'Add Problem')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Invite Students Dialog ───────────────────────────────────────────────────

const InviteDialog = ({ open, onClose, onSubmit, loading, roomId }) => {
  const [students, setStudents] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');

  // Load students whenever dialog opens
  useEffect(() => {
    if (!open || !roomId) return;
    setSelected(new Set());
    setSearch('');
    setFetchError('');

    const load = async () => {
      setFetchLoading(true);
      try {
        const data = await codeArenaService.getAvailableStudents(roomId);
        setStudents(data);
      } catch {
        setFetchError('Failed to load students');
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, [open, roomId]);

  // Filter by search
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const uninvited = filtered.filter((s) => !s.already_invited);
  const selectableIds = uninvited.map((s) => s.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...selectableIds]));
    }
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    onSubmit([...selected]);
  };

  const handleClose = () => {
    if (!loading) {
      setSelected(new Set());
      setSearch('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { height: '80vh', display: 'flex', flexDirection: 'column' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Invite Students</Typography>
          <IconButton size="small" onClick={handleClose} disabled={loading}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <TextField
          fullWidth size="small"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Select-all row */}
      {!fetchLoading && !fetchError && uninvited.length > 0 && (
        <Box sx={{ px: 2, pb: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleAll}
                size="small"
              />
            }
            label={
              <Typography variant="body2" fontWeight={600}>
                {allSelected ? 'Deselect all' : `Select all (${uninvited.length})`}
                {selected.size > 0 && (
                  <Chip label={`${selected.size} selected`} size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>
            }
          />
        </Box>
      )}

      <Divider />

      <DialogContent sx={{ p: 0, flex: 1, overflowY: 'auto' }}>
        {fetchLoading && <LinearProgress />}
        {fetchError && <Alert severity="error" sx={{ m: 2 }}>{fetchError}</Alert>}

        {!fetchLoading && !fetchError && filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {search ? 'No students match your search.' : 'No students found in this school.'}
            </Typography>
          </Box>
        )}

        {!fetchLoading && !fetchError && (
          <List dense disablePadding>
            {filtered.map((student) => {
              const isInvited = student.already_invited;
              const isSelected = selected.has(student.id);
              return (
                <ListItem
                  key={student.id}
                  disablePadding
                  secondaryAction={
                    isInvited ? (
                      <Chip label="Already invited" size="small" color="success" variant="outlined" />
                    ) : null
                  }
                >
                  <ListItemButton
                    onClick={() => !isInvited && toggle(student.id)}
                    disabled={isInvited}
                    selected={isSelected}
                    sx={{ pr: isInvited ? 15 : 2 }}
                  >
                    <Checkbox
                      checked={isSelected || isInvited}
                      disabled={isInvited}
                      size="small"
                      sx={{ mr: 1 }}
                      tabIndex={-1}
                    />
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {student.first_name} {student.last_name}
                        </Typography>
                      }
                      secondary={student.email}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {selected.size > 0 ? `${selected.size} student${selected.size !== 1 ? 's' : ''} selected` : 'No students selected'}
        </Typography>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selected.size === 0}
          startIcon={loading ? <CircularProgress size={16} /> : <PersonAdd />}
        >
          Invite {selected.size > 0 ? `(${selected.size})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Live Dashboard Tab ───────────────────────────────────────────────────────

const LiveDashboard = ({ roomId, room }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await codeArenaService.getRoomDashboard(roomId);
      setDashboard(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
    if (room?.status === 'active') {
      intervalRef.current = setInterval(load, 10_000);
    }
    return () => clearInterval(intervalRef.current);
  }, [load, room?.status]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;
  if (!dashboard) return <Alert severity="error">Failed to load dashboard</Alert>;

  const { participants = [], problems = [] } = dashboard;

  return (
    <Box>
      {/* Problem stats */}
      <Typography variant="subtitle2" gutterBottom>Problems</Typography>
      <Grid container spacing={1} sx={{ mb: 3 }}>
        {problems.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Chip label={p.difficulty} size="small" color={DIFF_COLOR[p.difficulty]} />
                <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1 }}>{p.title}</Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Solved</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{p.solved_by}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Attempted</Typography>
                  <Typography variant="h6" fontWeight={700}>{p.attempted_by}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Participant table */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">Participants ({participants.length})</Typography>
        {room?.status === 'active' && (
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={load}><Refresh fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Box>
      <Stack spacing={0.75}>
        {participants.map((p) => (
          <Paper key={p.user_id} variant="outlined" sx={{ p: 1, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
              {p.first_name?.[0]}{p.last_name?.[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{p.first_name} {p.last_name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{p.email}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {STATUS_ICON[p.status] || null}
              <Typography variant="caption" sx={{ textTransform: 'capitalize', minWidth: 56 }}>{p.status}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right', minWidth: 80 }}>
              <Typography variant="caption" color="success.main" fontWeight={700}>{p.solved}✓</Typography>
              <Typography variant="caption" color="text.secondary"> / {p.attempted} tried</Typography>
            </Box>
          </Paper>
        ))}
        {participants.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No students have joined yet.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

// ─── Main Faculty Manage Page ────────────────────────────────────────────────

const CodeArenaFaculty = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [room, setRoom] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [tab, setTab] = useState(0);
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [countdown, setCountdown] = useState('');

  const loadRoom = useCallback(async () => {
    try {
      const data = await codeArenaService.getRoom(roomId);
      setRoom(data.room);
      setProblems(data.room?.problems || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!room?.ends_at) return;
    const tick = () => setCountdown(formatCountdown(room.ends_at));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [room?.ends_at]);

  const handleStart = async () => {
    try {
      setActionLoading(true);
      await codeArenaService.startRoom(roomId);
      setSuccess('Room started!');
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start room');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!window.confirm('End this room? Students will no longer be able to submit.')) return;
    try {
      setActionLoading(true);
      await codeArenaService.endRoom(roomId);
      setSuccess('Room ended.');
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to end room');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddProblem = async (data) => {
    try {
      setActionLoading(true);
      await codeArenaService.addProblem(roomId, data);
      setProblemDialogOpen(false);
      setSuccess('Problem added.');
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add problem');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProblem = async (data) => {
    try {
      setActionLoading(true);
      await codeArenaService.updateProblem(roomId, editingProblem.id, data);
      setEditingProblem(null);
      setProblemDialogOpen(false);
      setSuccess('Problem updated.');
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update problem');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Delete this problem?')) return;
    try {
      await codeArenaService.deleteProblem(roomId, problemId);
      setSuccess('Problem deleted.');
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete problem');
    }
  };

  const handleInvite = async (userIds) => {
    try {
      setActionLoading(true);
      const data = await codeArenaService.inviteParticipants(roomId, userIds);
      setInviteOpen(false);
      setSuccess(`${data.added} student(s) invited.`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to invite');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Room not found'}</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/codearena')} sx={{ mt: 2 }}>Back</Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/codearena')} size="small" sx={{ mt: 0.5 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={800}>{room.title}</Typography>
              <Chip label={room.status} size="small" color={room.status === 'active' ? 'success' : room.status === 'ended' ? 'error' : 'default'} />
              <Chip label={room.mode} size="small" color={room.mode === 'exam' ? 'warning' : 'info'} variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Invite Code:
              </Typography>
              <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main" letterSpacing={2}>
                {room.invite_code}
              </Typography>
              <Tooltip title="Copy">
                <ContentCopy
                  sx={{ fontSize: 14, color: 'text.secondary', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(room.invite_code).catch(() => {})}
                />
              </Tooltip>
              {room.status === 'active' && countdown && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                  <Chip icon={<Timer sx={{ fontSize: 14 }} />} label={countdown} size="small" color="warning" />
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {room.status === 'draft' && (
              <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={handleStart}
                disabled={actionLoading || problems.length === 0}>
                Start Room
              </Button>
            )}
            {room.status === 'active' && (
              <Button variant="outlined" color="error" startIcon={<Stop />} onClick={handleEnd} disabled={actionLoading}>
                End Room
              </Button>
            )}
            <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => setInviteOpen(true)}
              disabled={room.status === 'ended'}>
              Invite
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
        {problems.length === 0 && room.status === 'draft' && (
          <Alert severity="info" sx={{ mb: 2 }}>Add at least one problem before starting the room.</Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Problems (${problems.length})`} />
          <Tab label="Dashboard" />
        </Tabs>
        <Divider sx={{ mb: 2 }} />

        {/* Problems tab */}
        {tab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Quick setup: Create problem, then add at least one evaluation test case, then invite students, then start room.
            </Alert>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => { setEditingProblem(null); setProblemDialogOpen(true); }}
                disabled={room.status === 'ended'}
              >
                Create Problem
              </Button>
            </Box>
            <Stack spacing={1.5}>
              {problems.map((p, i) => (
                <Paper key={p.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minWidth: 24, fontWeight: 700 }}>
                      {i + 1}.
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{p.title}</Typography>
                        <Chip label={p.difficulty} size="small" color={DIFF_COLOR[p.difficulty]} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} noWrap>
                        {p.description?.substring(0, 160)}{p.description?.length > 160 ? '…' : ''}
                      </Typography>
                      {p.test_cases && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                          <Chip label={`${p.test_cases.filter((tc) => !tc.is_hidden).length} visible`} size="small" variant="outlined" />
                          <Chip label={`${p.test_cases.filter((tc) => tc.is_hidden).length} hidden`} size="small" variant="outlined" color="warning" />
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditingProblem(p); setProblemDialogOpen(true); }}
                          disabled={room.status === 'ended'}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteProblem(p.id)}
                          disabled={room.status === 'ended'}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Paper>
              ))}
              {problems.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Code sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No problems yet. Add one to get started.</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {/* Dashboard tab */}
        {tab === 1 && <LiveDashboard roomId={roomId} room={room} />}
      </Box>

      <ProblemDialog
        open={problemDialogOpen}
        onClose={() => { setProblemDialogOpen(false); setEditingProblem(null); }}
        onSubmit={editingProblem ? handleUpdateProblem : handleAddProblem}
        loading={actionLoading}
        initial={editingProblem}
      />
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSubmit={handleInvite} loading={actionLoading} roomId={roomId} />
    </Layout>
  );
};

export default CodeArenaFaculty;

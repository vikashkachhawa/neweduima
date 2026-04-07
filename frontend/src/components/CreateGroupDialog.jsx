import React, { useState, useEffect, useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import { chatService } from '../services/chat';
import groupManagement from '../services/groupManagement';
import { getErrorMessage } from '../utils/errorHandling';

const getInitials = (first, last) =>
  `${String(first || '').charAt(0)}${String(last || '').charAt(0)}`.toUpperCase() || '?';

export default function CreateGroupDialog({ open, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connections, setConnections] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingConns, setLoadingConns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedIds([]);
      setSearch('');
      setError('');
      fetchConnections();
    }
  }, [open]);

  const fetchConnections = async () => {
    setLoadingConns(true);
    try {
      const list = await chatService.getConnections();
      setConnections(list);
    } catch {
      setConnections([]);
    } finally {
      setLoadingConns(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.trim().toLowerCase();
    return connections.filter((c) => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      return fullName.includes(q) || String(c.school_name || '').toLowerCase().includes(q);
    });
  }, [connections, search]);

  const toggle = (userId) =>
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );

  const handleCreate = async () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await groupManagement.createGroup(name.trim(), description.trim(), selectedIds);
      if (res.success) {
        onSuccess?.(res.group);
      } else {
        setError(res.message || 'Failed to create group');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create group'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedConns = connections.filter((c) => selectedIds.includes(c.user_id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupsIcon />
          <Typography variant="h6" fontWeight={700}>Create Group</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          {error && (
            <Box sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5, p: 1.5 }}>
              <Typography variant="body2" color="error">{error}</Typography>
            </Box>
          )}

          <TextField
            label="Group Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 255 }}
            helperText={`${name.length}/255`}
            disabled={submitting}
            autoFocus
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={submitting}
          />

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Add members from your connections
            </Typography>

            {selectedConns.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                {selectedConns.map((c) => (
                  <Chip
                    key={c.user_id}
                    label={`${c.first_name} ${c.last_name}`}
                    size="small"
                    onDelete={() => toggle(c.user_id)}
                    avatar={
                      <Avatar src={c.profile_image_url || ''} sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>
                        {getInitials(c.first_name, c.last_name)}
                      </Avatar>
                    }
                  />
                ))}
              </Box>
            )}

            <TextField
              fullWidth
              size="small"
              placeholder="Search connections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />

            <Box sx={{ maxHeight: 220, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              {loadingConns ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : filtered.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                  {connections.length === 0 ? 'No connections yet' : 'No matches found'}
                </Typography>
              ) : (
                filtered.map((c) => {
                  const checked = selectedIds.includes(c.user_id);
                  return (
                    <Box
                      key={c.user_id}
                      onClick={() => toggle(c.user_id)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.2,
                        px: 1.5, py: 0.9, cursor: 'pointer',
                        borderBottom: '1px solid', borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                        bgcolor: checked ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: checked ? 'action.selected' : 'action.hover' },
                      }}
                    >
                      <Checkbox size="small" checked={checked} onChange={() => toggle(c.user_id)} onClick={(e) => e.stopPropagation()} />
                      <Avatar src={c.profile_image_url || ''} sx={{ width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700 }}>
                        {getInitials(c.first_name, c.last_name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {c.first_name} {c.last_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" noWrap>
                          {c.school_name || c.role || ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {selectedIds.length > 0 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                {selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected (you will be added as admin)
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={submitting || !name.trim()}
          startIcon={submitting ? <CircularProgress size={16} /> : <GroupsIcon />}
        >
          {submitting ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

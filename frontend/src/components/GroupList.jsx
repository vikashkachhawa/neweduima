import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Stack,
  Badge,
  useTheme,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import groupManagement from '../services/groupManagement';
import { getErrorMessage } from '../utils/errorHandling';

/**
 * GroupList Component
 * Displays user's groups with quick actions
 * 
 * Usage:
 * <GroupList 
 *   onGroupSelect={handleSelect}
 *   selectedGroupId={selected}
 *   onOpenCreateDialog={handleOpenDialog}
 * />
 */
export default function GroupList({ 
  onGroupSelect, 
  selectedGroupId, 
  onOpenCreateDialog,
  onGroupDeleted,
  unreadCounts = {}
}) {
  const theme = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroupForMenu, setSelectedGroupForMenu] = useState(null);

  useEffect(() => {
    loadGroups();
    // Refresh groups every 5 seconds
    const interval = setInterval(loadGroups, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadGroups = async () => {
    try {
      setError('');
      const response = await groupManagement.getMyGroups({ sort: 'latest', limit: 50 });
      if (response.success) {
        setGroups(response.groups);
      }
    } catch (err) {
      setError('Failed to load groups: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await groupManagement.deleteGroup(groupId);
      if (response.success) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        onGroupDeleted?.(groupId);
        alert('Group deleted successfully');
      }
    } catch (err) {
      alert('Failed to delete group: ' + getErrorMessage(err));
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroupForMenu(null);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
      {/* Header with Create Button */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 'bold' }}>
          💬 Groups
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onOpenCreateDialog}
          fullWidth
        >
          New Group
        </Button>
      </Stack>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={40} />
        </Box>
      ) : groups.length === 0 ? (
        /* Empty State */
        <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'action.hover' }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            No groups yet. Create one to start chatting with groups!
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onOpenCreateDialog}
          >
            Create Your First Group
          </Button>
        </Paper>
      ) : (
        /* Groups List */
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {groups.map(group => (
            <ListItem
              key={group.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => {
                    setSelectedGroupForMenu(group);
                    setAnchorEl(e.currentTarget);
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              }
              sx={{
                backgroundColor: selectedGroupId === group.id ? 'action.selected' : 'transparent',
                borderLeft: selectedGroupId === group.id 
                  ? `4px solid ${theme.palette.primary.main}` 
                  : 'none',
                mb: 0.5,
                borderRadius: 1
              }}
            >
              <ListItemButton 
                onClick={() => onGroupSelect?.(group.id)}
                sx={{ py: 1 }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {group.name}
                      </Typography>
                      {unreadCounts[group.id] > 0 && (
                        <Badge 
                          badgeContent={unreadCounts[group.id]} 
                          color="error"
                          sx={{ ml: 'auto' }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        👥 {group.member_count} members
                      </Typography>
                      {group.last_message && (
                        <Typography 
                          variant="caption" 
                          color="textSecondary"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {group.last_message.substring(0, 50)}...
                        </Typography>
                      )}
                    </Stack>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Group Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem disabled>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit Group (Soon)
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleDeleteGroup(selectedGroupForMenu?.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

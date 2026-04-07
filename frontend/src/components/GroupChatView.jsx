import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Avatar, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, Menu, MenuItem,
  Paper, Popover, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SearchIcon from '@mui/icons-material/Search';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chat';
import groupChat from '../services/groupChat';
import groupManagement from '../services/groupManagement';
import { getErrorMessage } from '../utils/errorHandling';

const fmtTime = (v) => {
  if (!v) return '';
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const getInitials = (first, last) =>
  `${String(first || '').charAt(0)}${String(last || '').charAt(0)}`.toUpperCase() || '?';
const EMOJIS = ['😀','😁','😂','😊','😍','🤩','🤝','🙏','👍','🎉','🔥','💡','📚','✅'];

export default function GroupChatView({ groupId, onBack, onGroupDeleted, chatColors, isMobile }) {
  const { user } = useAuth();
  const [messages,  setMessages]  = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [menuAnchor,  setMenuAnchor]  = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const intervalRef    = useRef(null);

  // Derive colours from chatColors prop (same tokens as Chat.jsx)
  const col = chatColors || {};
  const bg        = col.chatBg          || '#ffffff';
  const hdrBg     = col.headerBg        || '#ffffff';
  const hdrBorder = col.headerBorder    || '#e2e8f0';
  const msgsBg    = col.messagesBg      || '#f8fbff';
  const composerBg = col.composerBg     || '#f8fbff';
  const lineCl    = col.line            || '#e2e8f0';
  const txtPrim   = col.textPrimary     || '#0f172a';
  const txtSec    = col.textSecondary   || '#64748b';
  const mineBg    = col.messageMineBg   || '#dbeafe';
  const mineBdr   = col.messageMineBorder || '#bfdbfe';
  const otherBg   = col.messageOtherBg  || '#f1f5f9';
  const otherBdr  = col.messageOtherBorder || '#e2e8f0';
  const inputBg   = col.inputBg         || '#ffffff';
  const inputBdr  = col.inputBorder     || '#dbe5f0';
  const inputHov  = col.inputBorderHover || '#93c5fd';
  const sendBg    = col.sendBtnBg       || '#2563eb';
  const sendHov   = col.sendBtnHover    || '#1d4ed8';
  const sendDis   = col.sendBtnDisabled || '#cbd5e1';
  const msgTime   = col.messageTime     || '#64748b';
  const avBg      = col.avatarBg        || '#dbeafe';
  const avTxt     = col.avatarText      || '#1d4ed8';

  const loadGroupData = useCallback(async () => {
    try {
      const res = await groupManagement.getGroupDetails(groupId);
      if (res.success) setGroupData(res.group);
    } catch {}
  }, [groupId]);

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await groupChat.getMessages(groupId, { limit: 120 });
      if (res.success) setMessages(res.messages);
    } catch {}
    if (!silent) setLoading(false);
  }, [groupId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setGroupData(null);
    loadGroupData();
    loadMessages();
    intervalRef.current = setInterval(() => loadMessages({ silent: true }), 3000);
    return () => clearInterval(intervalRef.current);
  }, [groupId, loadGroupData, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    const tmp = {
      id: `tmp-${Date.now()}`,
      sender_id: user.id,
      sender_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      message: content,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, tmp]);
    try {
      await groupChat.sendMessage(groupId, content);
      await loadMessages({ silent: true });
    } catch {}
    setSending(false);
  };

  const isAdmin = groupData?.is_user_admin;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bg }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: bg }}>

      {/* Header */}
      <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${hdrBorder}`, background: hdrBg, flexShrink: 0 }}>
        <Stack direction="row" spacing={1.4} alignItems="center">
          {(isMobile || onBack) && (
            <IconButton size="small" onClick={onBack} sx={{ color: txtPrim }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Avatar sx={{ width: 42, height: 42, bgcolor: avBg, color: avTxt, fontWeight: 800, fontSize: '1rem' }}>
            {String(groupData?.name || '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: txtPrim }} noWrap>
              {groupData?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: txtSec }}>
              {groupData?.member_count || 0} members{isAdmin ? ' · You are admin' : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: txtPrim }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setShowSettings(true); setMenuAnchor(null); }}>
          Group Settings
        </MenuItem>
        {isAdmin && (
          <MenuItem
            sx={{ color: 'error.main' }}
            onClick={async () => {
              setMenuAnchor(null);
              if (!window.confirm('Delete this group and all its messages?')) return;
              try {
                await groupManagement.deleteGroup(groupId);
                onGroupDeleted?.(groupId);
                onBack?.();
              } catch (e) {
                alert(getErrorMessage(e, 'Failed to delete group'));
              }
            }}
          >
            Delete Group
          </MenuItem>
        )}
      </Menu>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.5, md: 2.5 }, py: 2, background: msgsBg, minHeight: 0 }}>
        {messages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: txtPrim }}>Start a conversation</Typography>
            <Typography variant="body2" sx={{ color: txtSec, mt: 0.5 }}>Be the first to say something!</Typography>
          </Box>
        ) : (
          <Stack spacing={1.2}>
            {messages.map((msg) => {
              if (msg.message_type === 'system') {
                return (
                  <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 999,
                        bgcolor: 'rgba(100, 116, 139, 0.12)',
                        border: '1px solid',
                        borderColor: 'rgba(100, 116, 139, 0.18)',
                        maxWidth: '85%'
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: txtSec,
                          textAlign: 'center',
                          display: 'block',
                          fontWeight: 600,
                          letterSpacing: 0.1
                        }}
                      >
                        {msg.message}
                      </Typography>
                    </Paper>
                  </Box>
                );
              }

              const mine = Number(msg.sender_id) === Number(user?.id);
              const parts = (msg.sender_name || '').split(' ');
              return (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 1 }}>
                  {!mine && (
                    <Avatar sx={{ width: 28, height: 28, bgcolor: avBg, color: avTxt, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(parts[0], parts[1])}
                    </Avatar>
                  )}
                  <Box sx={{ maxWidth: '76%' }}>
                    {!mine && (
                      <Typography variant="caption" fontWeight={700} sx={{ color: txtSec, mb: 0.3, display: 'block', pl: 0.5 }}>
                        {msg.sender_name}
                      </Typography>
                    )}
                    <Paper elevation={0} sx={{
                      px: 1.5, py: 1,
                      borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      bgcolor: mine ? mineBg : otherBg,
                      border: '1px solid',
                      borderColor: mine ? mineBdr : otherBdr,
                      color: txtPrim,
                    }}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.message}</Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.3 }}>
                        <Typography variant="caption" sx={{ color: msgTime }}>{fmtTime(msg.created_at)}</Typography>
                        {msg._pending && <Typography variant="caption" sx={{ color: msgTime }}>⏳</Typography>}
                        {mine && !msg._pending && <DoneAllIcon sx={{ fontSize: 13, color: msgTime }} />}
                      </Stack>
                    </Paper>
                  </Box>
                  {mine && (
                    <Avatar sx={{ width: 28, height: 28, bgcolor: avBg, color: avTxt, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(user?.first_name, user?.last_name)}
                    </Avatar>
                  )}
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ p: 1.2, borderTop: `1px solid ${lineCl}`, background: composerBg, flexShrink: 0, position: 'relative' }}>
        <TextField
          fullWidth multiline minRows={2} maxRows={6}
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2, pr: 12, color: txtPrim, backgroundColor: inputBg, alignItems: 'flex-end',
              '& fieldset': { borderColor: inputBdr },
              '&:hover fieldset': { borderColor: inputHov },
              '&.Mui-focused fieldset': { borderColor: inputBdr },
            },
          }}
        />
        <Stack direction="row" spacing={0.4} sx={{ position: 'absolute', right: 18, bottom: 14, alignItems: 'center' }}>
          <IconButton size="small" onClick={(e) => setEmojiAnchor(e.currentTarget)} sx={{ color: txtSec }}>
            <EmojiEmotionsIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={handleSend}
            disabled={sending || !text.trim()}
            sx={{ width: 30, height: 30, bgcolor: sendBg, color: '#fff', '&:hover': { bgcolor: sendHov }, '&.Mui-disabled': { bgcolor: sendDis, color: '#fff' } }}
          >
            <SendRoundedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Stack>
        <Popover
          open={Boolean(emojiAnchor)} anchorEl={emojiAnchor} onClose={() => setEmojiAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          PaperProps={{ sx: { p: 1, width: 240, bgcolor: inputBg, border: `1px solid ${inputBdr}` } }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {EMOJIS.map((e) => (
              <Button key={e} size="small" variant="outlined"
                sx={{ minWidth: 36, borderColor: inputBdr, color: txtPrim }}
                onClick={() => { setText((p) => p + e); setEmojiAnchor(null); }}
              >{e}</Button>
            ))}
          </Box>
        </Popover>
      </Box>

      {/* Settings dialog */}
      {showSettings && groupData && (
        <GroupSettingsDialog
          groupId={groupId}
          groupData={groupData}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setShowSettings(false)}
          onReload={loadGroupData}
        />
      )}
    </Box>
  );
}

// ── Group Settings Dialog ────────────────────────────────────────────────────
function GroupSettingsDialog({ groupId, groupData, currentUserId, isAdmin, onClose, onReload }) {
  const [members,    setMembers]   = useState(groupData.members || []);
  const [tab,        setTab]       = useState('members');
  const [connections, setConns]   = useState([]);
  const [selectedIds, setSelIds]  = useState([]);
  const [connSearch,  setConnSearch] = useState('');
  const [loadingConns, setLCons]  = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  const existingIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const loadConns = async () => {
    setLCons(true);
    try {
      const list = await chatService.getConnections();
      setConns(list.filter((c) => !existingIds.has(c.user_id)));
    } catch { setConns([]); }
    setLCons(false);
  };

  const filteredConns = useMemo(() => {
    if (!connSearch.trim()) return connections;
    const q = connSearch.toLowerCase();
    return connections.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q));
  }, [connections, connSearch]);

  const toggleConn = (uid) =>
    setSelIds((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);

  const handleAddMembers = async () => {
    if (!selectedIds.length) return;
    setBusy(true); setError('');
    try {
      const res = await groupManagement.addMembers(groupId, selectedIds);
      if (res.success) {
        await onReload();
        const det = await groupManagement.getGroupDetails(groupId);
        if (det.success) {
          setMembers(det.group.members);
          setConns((prev) => prev.filter((c) => !selectedIds.includes(c.user_id)));
        }
        setSelIds([]); setTab('members');
      } else { setError(res.message || 'Failed to add members'); }
    } catch (e) { setError(getErrorMessage(e, 'Failed to add members')); }
    setBusy(false);
  };

  const handleToggleAdmin = async (member) => {
    setBusy(true); setError('');
    try {
      if (member.is_admin) {
        await groupManagement.removeAdmin(groupId, member.id);
        setMembers((p) => p.map((m) => m.id === member.id ? { ...m, is_admin: false } : m));
      } else {
        await groupManagement.makeAdmin(groupId, member.id);
        setMembers((p) => p.map((m) => m.id === member.id ? { ...m, is_admin: true } : m));
      }
      await onReload();
    } catch (e) { setError(getErrorMessage(e, 'Failed to update role')); }
    setBusy(false);
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    setBusy(true); setError('');
    try {
      await groupManagement.removeMember(groupId, memberId);
      setMembers((p) => p.filter((m) => m.id !== memberId));
      await onReload();
    } catch (e) { setError(getErrorMessage(e, 'Failed to remove member')); }
    setBusy(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>{groupData.name}</Typography>
          {isAdmin && (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" variant={tab === 'members' ? 'contained' : 'outlined'} onClick={() => setTab('members')}>
                Members
              </Button>
              <Button size="small" variant={tab === 'add' ? 'contained' : 'outlined'}
                startIcon={<GroupAddIcon />}
                onClick={() => { setTab('add'); loadConns(); }}>
                Add
              </Button>
            </Stack>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Box sx={{ mx: 2, mt: 1, p: 1, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
            <Typography variant="caption" color="error">{error}</Typography>
          </Box>
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <Stack divider={<Divider />} sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {members.map((m) => {
              const isMe = m.id === currentUserId;
              return (
                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1.2 }}>
                  <Avatar sx={{ width: 36, height: 36, fontWeight: 700, fontSize: '0.8rem' }}>
                    {getInitials(m.first_name, m.last_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {m.first_name} {m.last_name}{isMe ? ' (you)' : ''}
                    </Typography>
                    {m.is_admin && (
                      <Chip label="Admin" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  {isAdmin && !isMe && (
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" title={m.is_admin ? 'Remove admin' : 'Make admin'}
                        onClick={() => handleToggleAdmin(m)} disabled={busy}>
                        {m.is_admin
                          ? <StarIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                          : <StarBorderIcon sx={{ fontSize: 18 }} />
                        }
                      </IconButton>
                      <IconButton size="small" color="error" title="Remove from group"
                        onClick={() => handleRemove(m.id)} disabled={busy}>
                        <PersonRemoveIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Add members tab */}
        {tab === 'add' && (
          <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
            <TextField
              fullWidth size="small" placeholder="Search connections..."
              value={connSearch} onChange={(e) => setConnSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ mb: 1 }}
            />
            <Box sx={{ maxHeight: 260, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 1.5 }}>
              {loadingConns ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredConns.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                  {connections.length === 0 ? 'No connections available to add' : 'No matches'}
                </Typography>
              ) : (
                filteredConns.map((c) => {
                  const checked = selectedIds.includes(c.user_id);
                  return (
                    <Box key={c.user_id} onClick={() => toggleConn(c.user_id)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.8, cursor: 'pointer',
                        borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' },
                        bgcolor: checked ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: checked ? 'action.selected' : 'action.hover' },
                      }}
                    >
                      <Checkbox size="small" checked={checked} readOnly />
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700 }}>
                        {getInitials(c.first_name, c.last_name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{c.first_name} {c.last_name}</Typography>
                        <Typography variant="caption" color="textSecondary" noWrap>{c.school_name || ''}</Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
            <Button fullWidth variant="contained" disabled={!selectedIds.length || busy}
              startIcon={busy ? <CircularProgress size={15} /> : <GroupAddIcon />}
              onClick={handleAddMembers} sx={{ mb: 1.5 }}
            >
              {busy ? 'Adding...' : selectedIds.length ? `Add ${selectedIds.length} Member${selectedIds.length !== 1 ? 's' : ''}` : 'Select members to add'}
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

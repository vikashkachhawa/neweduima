import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Popover,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Circle as CircleIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  Image as ImageIcon,
  Search as SearchIcon,
  SendRounded as SendRoundedIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Layout from '../components/Layout';
import CreateGroupDialog from '../components/CreateGroupDialog';
import GroupChatView from '../components/GroupChatView';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chat';
import groupManagementService from '../services/groupManagement';
import { getErrorMessage } from '../utils/errorHandling';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatRelative = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const getInitials = (firstName, lastName, email = '') => {
  const first = String(firstName || '').trim().charAt(0).toUpperCase();
  const last = String(lastName || '').trim().charAt(0).toUpperCase();
  const initials = `${first}${last}`;
  if (initials) return initials;

  const emailInitial = String(email || '').trim().charAt(0).toUpperCase();
  return emailInitial || 'U';
};

const truncatePreview = (value, maxChars = 42) => {
  const text = String(value || '').trim();
  if (!text) return 'No messages yet';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}...`;
};

const EMOJIS = ['😀', '😁', '😂', '😊', '😍', '🤩', '🤝', '🙏', '👍', '🎉', '🔥', '💡', '📚', '✅'];
const STICKERS = ['[Great Job]', '[Awesome]', '[Well Done]', '[Thanks]', '[Congrats]', '[On My Way]', '[Noted]', '[Let\'s Go]'];

const Chat = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [pickerAnchorEl, setPickerAnchorEl] = useState(null);
  const [pickerMode, setPickerMode] = useState('emoji');
  const [error, setError] = useState('');
  
  // Group chat state
  const [tabValue, setTabValue] = useState(0); // 0 = Direct Messages, 1 = Groups
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [openCreateGroupDialog, setOpenCreateGroupDialog] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  const messagesContainerRef = useRef(null);

  const loadSidebarData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoadingList(true);
      }
      setError('');
      const allConnections = await chatService.getConnections();
      setConnections(allConnections);

      if (!selectedUserId && allConnections.length > 0 && !isMobile) {
        setSelectedUserId(allConnections[0].user_id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load chat users'));
    } finally {
      if (!silent) {
        setLoadingList(false);
      }
    }
  }, [selectedUserId, isMobile]);

  const loadMessages = useCallback(async (targetUserId, { silent = false, markAsRead = true } = {}) => {
    if (!targetUserId) return;

    try {
      if (!silent) {
        setLoadingMessages(true);
      }
      const list = await chatService.getMessages(targetUserId, 140);
      setMessages(list);
      if (markAsRead) {
        chatService.markRead(targetUserId)
          .then(() => loadSidebarData({ silent: true }))
          .catch(() => {});
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load messages'));
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  }, [loadSidebarData]);

  const loadGroups = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoadingGroups(true);
      }
      const response = await groupManagementService.getMyGroups();
      let myGroups = response?.groups || response || [];
      // Ensure we have an array of objects
      if (!Array.isArray(myGroups)) {
        myGroups = [];
      } else if (myGroups.length > 0 && typeof myGroups[0] !== 'object') {
        myGroups = [];
      }
      setGroups(myGroups);

      if (myGroups.length === 0) {
        setSelectedGroupId(null);
      } else if (!selectedGroupId && !isMobile) {
        setSelectedGroupId(myGroups[0].id);
      } else if (selectedGroupId && !myGroups.some((group) => Number(group.id) === Number(selectedGroupId))) {
        setSelectedGroupId(!isMobile ? myGroups[0].id : null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load groups'));
    } finally {
      if (!silent) {
        setLoadingGroups(false);
      }
    }
  }, [selectedGroupId, isMobile]);

  useEffect(() => {
    loadSidebarData();
    loadGroups();
  }, [loadSidebarData, loadGroups]);

  useEffect(() => {
    if (tabValue === 1) {
      loadGroups();
    }
  }, [tabValue, loadGroups]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId, loadMessages]);

  useEffect(() => {
    if (isMobile) {
      setMobileView('list');
    }
  }, [isMobile]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadSidebarData({ silent: true });
      if (tabValue === 0 && selectedUserId) {
        loadMessages(selectedUserId, { silent: true, markAsRead: false });
      } else if (tabValue === 1) {
        loadGroups({ silent: true });
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [loadSidebarData, loadMessages, selectedUserId, tabValue, loadGroups]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedUser = useMemo(() => {
    return connections.find((item) => item.user_id === selectedUserId)
      || null;
  }, [selectedUserId, connections]);

  const visibleList = useMemo(() => {
    if (!searchQuery.trim()) {
      return connections;
    }

    const q = searchQuery.trim().toLowerCase();
    return connections.filter((item) => {
      const fullName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
      const school = String(item.school_name || '').toLowerCase();
      const lastMessage = String(item.last_message || '').toLowerCase();
      return fullName.includes(q) || school.includes(q) || lastMessage.includes(q);
    });
  }, [connections, searchQuery]);

  const directUnreadCount = useMemo(
    () => connections.reduce((total, item) => total + Number(item.unread_count || 0), 0),
    [connections]
  );

  const groupUnreadCount = useMemo(
    () => groups.reduce((total, group) => total + Number(group?.unread_count || 0), 0),
    [groups]
  );

  const visibleGroups = useMemo(() => {
    // Ensure groups is always an array
    const groupsArray = Array.isArray(groups) ? groups : [];
    
    if (!groupSearchQuery.trim()) {
      return groupsArray;
    }

    const q = groupSearchQuery.trim().toLowerCase();
    return groupsArray.filter((group) => {
      if (typeof group !== 'object' || !group) return false;
      const name = String(group.name || '').toLowerCase();
      const lastMessage = String(group.last_message || '').toLowerCase();
      const memberCount = String(group.member_count || '');
      return name.includes(q) || lastMessage.includes(q) || memberCount.includes(q);
    });
  }, [groupSearchQuery, groups]);

  const handleSend = async () => {
    if (!selectedUserId || !messageInput.trim() || sending) {
      return;
    }

    try {
      setSending(true);
      const messageText = messageInput.trim();
      const result = await chatService.sendMessage(selectedUserId, messageText);
      setMessageInput('');

      if (result?.chatMessage) {
        setMessages((prev) => [...prev, result.chatMessage]);
      }

      loadSidebarData({ silent: true });
      loadMessages(selectedUserId, { silent: true, markAsRead: false });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const resolveProfilePath = (targetUser) => {
    const targetUserId = Number(targetUser?.user_id || targetUser?.id);
    const targetRole = String(targetUser?.role || '').toLowerCase();

    if (!targetUserId) {
      return '';
    }

    if (targetRole === 'faculty') {
      return `/faculty/profile/${targetUserId}`;
    }

    if (targetRole === 'student') {
      return `/student/profile/${targetUserId}`;
    }

    if (user?.role === 'school_admin') {
      return `/school-admin/users/${targetUserId}`;
    }

    return `/chat/profile/${targetUserId}`;
  };

  const openPublicProfile = (targetUser) => {
    const path = resolveProfilePath(targetUser);
    if (path) {
      navigate(path, { state: { chatUser: targetUser } });
    }
  };

  const openPicker = (event, mode) => {
    setPickerMode(mode);
    setPickerAnchorEl(event.currentTarget);
  };

  const closePicker = () => {
    setPickerAnchorEl(null);
  };

  const insertToken = (token) => {
    setMessageInput((prev) => `${prev}${prev ? ' ' : ''}${token}`);
  };

  const chatColors = useMemo(() => {
    if (isDark) {
      return {
        shellBorder: '#374151',
        shellBg: '#1F2937',
        shellShadow: 'none',
        chatBg: '#1F2937',
        headerBg: '#1F2937',
        headerBorder: '#374151',
        messagesBg: '#1F2937',
        composerBg: '#1F2937',
        sidebarBg: '#1F2937',
        line: '#374151',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        inputBg: '#111827',
        inputBorder: '#374151',
        inputBorderHover: '#475569',
        inputBorderFocus: '#38bdf8',
        messageMineBg: '#39966f',
        messageMineBorder: '#2f7a5a',
        messageOtherBg: '#111827',
        messageOtherBorder: '#374151',
        selectedRowBg: '#1e3a8a',
        hoverRowBg: '#111827',
        avatarBg: '#1e40af',
        avatarText: '#dbeafe',
        statusBg: '#052e1b',
        statusText: '#86efac',
        unreadText: '#93c5fd',
        errorText: '#fca5a5',
        messageTime: '#d1fae5',
        sendBtnBg: '#0284c7',
        sendBtnHover: '#0369a1',
        sendBtnDisabled: '#374151'
      };
    }

    return {
      shellBorder: '#dbe5f0',
      shellBg: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
      shellShadow: '0 22px 50px rgba(15, 23, 42, 0.08)',
      chatBg: '#ffffff',
      headerBg: 'linear-gradient(180deg, #ffffff 0%, #f4f8fc 100%)',
      headerBorder: '#e2e8f0',
      messagesBg: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
      composerBg: '#f8fbff',
      sidebarBg: 'linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%)',
      line: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      inputBg: '#ffffff',
      inputBorder: '#dbe5f0',
      inputBorderHover: '#93c5fd',
      inputBorderFocus: '#2563eb',
      messageMineBg: '#dbeafe',
      messageMineBorder: '#bfdbfe',
      messageOtherBg: '#eef2f7',
      messageOtherBorder: '#dbe5f0',
      selectedRowBg: '#e8f1ff',
      hoverRowBg: '#f1f5f9',
      avatarBg: '#dbeafe',
      avatarText: '#1d4ed8',
      statusBg: '#dcfce7',
      statusText: '#166534',
      unreadText: '#1d4ed8',
      errorText: '#dc2626',
      messageTime: '#64748b',
      sendBtnBg: '#2563eb',
      sendBtnHover: '#1d4ed8',
      sendBtnDisabled: '#cbd5e1'
    };
  }, [isDark]);

  return (
    <Layout disablePadding>
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          minHeight: '100vh'
        }}
      >
        <Paper
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: 0,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: chatColors.shellBorder,
            background: chatColors.shellBg,
            boxShadow: chatColors.shellShadow
          }}
        >
          {/* Single persistent two-pane layout */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
              gridTemplateRows: { xs: '1fr', md: '1fr' },
              gridTemplateAreas: {
                xs: mobileView === 'chat' ? '"chat"' : '"sidebar"',
                md: '"chat sidebar"'
              },
              height: '100%'
            }}
          >
            {(!isMobile || mobileView === 'chat') && (
            <Box
              sx={{
                gridArea: 'chat',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                minWidth: 0,
                backgroundColor: chatColors.chatBg
              }}
            >
              {/* ── Groups pane ── */}
              {tabValue === 1 && (
                selectedGroupId ? (
                  <GroupChatView
                    groupId={selectedGroupId}
                    onBack={() => {
                      setSelectedGroupId(null);
                      if (isMobile) {
                        setMobileView('list');
                      }
                    }}
                    onGroupDeleted={(deletedGroupId) => {
                      setGroups((prev) => prev.filter((group) => Number(group.id) !== Number(deletedGroupId)));
                      setSelectedGroupId(null);
                      loadGroups({ silent: true });
                    }}
                    chatColors={chatColors}
                    isMobile={isMobile}
                  />
                ) : (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: chatColors.textPrimary }}>Choose a group</Typography>
                      <Typography sx={{ color: chatColors.textSecondary, mt: 0.8 }}>
                        Open an existing group or create one with your connected friends.
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} justifyContent="center" sx={{ mt: 2 }}>
                        {visibleGroups.length > 0 && (
                          <Button
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                            variant="outlined"
                            onClick={() => handleSelectGroup(visibleGroups[0].id)}
                          >
                            Open First Group
                          </Button>
                        )}
                        <Button
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                          variant="contained"
                          onClick={() => setOpenCreateGroupDialog(true)}
                        >
                          Create Group
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )
              )}
              {/* ── Direct Messages pane ── */}
              {tabValue === 0 && (selectedUser ? (
                <>
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: `1px solid ${chatColors.headerBorder}`,
                      background: chatColors.headerBg
                    }}
                  >
                    <Stack direction="row" spacing={1.4} alignItems="center">
                      {isMobile && (
                        <IconButton
                          size="small"
                          onClick={() => setMobileView('list')}
                          sx={{ color: chatColors.textPrimary }}
                        >
                          <ArrowBackIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Avatar
                        src={selectedUser.profile_image_url || ''}
                        onClick={() => openPublicProfile(selectedUser)}
                        sx={{
                          width: 46,
                          height: 46,
                          bgcolor: chatColors.avatarBg,
                          color: chatColors.avatarText,
                          fontWeight: 700,
                          cursor: resolveProfilePath(selectedUser) ? 'pointer' : 'default'
                        }}
                      >
                        {getInitials(selectedUser.first_name, selectedUser.last_name)}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="subtitle1"
                          onClick={() => openPublicProfile(selectedUser)}
                          sx={{
                            fontWeight: 800,
                            color: chatColors.textPrimary,
                            cursor: selectedUser?.role === 'faculty' || user?.role === 'school_admin' ? 'pointer' : 'default',
                            '&:hover': {
                              textDecoration: selectedUser?.role === 'faculty' || user?.role === 'school_admin' ? 'underline' : 'none'
                            }
                          }}
                        >
                          {selectedUser.first_name} {selectedUser.last_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: chatColors.textSecondary }}>
                          {selectedUser.school_name || 'School not set'}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        <Chip
                          size="small"
                          icon={<CircleIcon sx={{ fontSize: '0.6rem !important', color: '#16a34a !important' }} />}
                          label="Connected"
                          sx={{ backgroundColor: chatColors.statusBg, color: chatColors.statusText, fontWeight: 700 }}
                        />
                      </Box>
                    </Stack>
                  </Box>

                  <Box
                    ref={messagesContainerRef}
                    sx={{
                      flex: 1,
                      overflowY: 'auto',
                      px: { xs: 1.5, md: 2.5 },
                      py: 2,
                      minHeight: 0,
                      background: chatColors.messagesBg
                    }}
                  >
                    {loadingMessages && messages.length === 0 ? (
                      <Typography sx={{ color: chatColors.textSecondary }}>Loading messages...</Typography>
                    ) : messages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', mt: 6 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: chatColors.textPrimary }}>Start the conversation</Typography>
                        <Typography variant="body2" sx={{ color: chatColors.textSecondary }}>
                          Say hello to your connection.
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1.2}>
                        {messages.map((msg) => {
                          const mine = Number(msg.sender_id) === Number(user?.id);
                          const hasRecipient = Number(msg.recipient_id) > 0;
                          const messageStatus = Boolean(msg.is_read)
                            ? 'seen'
                            : hasRecipient
                              ? 'delivered'
                              : 'sent';
                          const messageAvatar = mine
                            ? getInitials(user?.first_name ?? user?.firstName, user?.last_name ?? user?.lastName, user?.email)
                            : getInitials(selectedUser.first_name ?? selectedUser.firstName, selectedUser.last_name ?? selectedUser.lastName, selectedUser.email);
                          const messageAvatarSrc = mine
                            ? (user?.profile_image_url || '')
                            : (selectedUser.profile_image_url || '');
                          return (
                            <Box
                              key={msg.id}
                              sx={{
                                display: 'flex',
                                justifyContent: mine ? 'flex-end' : 'flex-start',
                                alignItems: 'flex-end',
                                gap: 1
                              }}
                            >
                              {!mine && (
                                <Avatar
                                  src={messageAvatarSrc}
                                  onClick={() => openPublicProfile(selectedUser)}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    bgcolor: chatColors.avatarBg,
                                    color: chatColors.avatarText,
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: resolveProfilePath(selectedUser) ? 'pointer' : 'default'
                                  }}
                                >
                                  {messageAvatar}
                                </Avatar>
                              )}
                              <Paper
                                elevation={0}
                                sx={{
                                  maxWidth: '78%',
                                  px: 1.5,
                                  py: 1.1,
                                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                  backgroundColor: mine ? chatColors.messageMineBg : chatColors.messageOtherBg,
                                  color: chatColors.textPrimary,
                                  border: '1px solid',
                                  borderColor: mine ? chatColors.messageMineBorder : chatColors.messageOtherBorder
                                }}
                              >
                                <Typography variant="body2">{msg.message_text}</Typography>
                                <Stack direction="row" spacing={0.35} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.4 }}>
                                  <Typography variant="caption" sx={{ color: chatColors.messageTime }}>
                                    {formatTime(msg.created_at)}
                                  </Typography>
                                  {mine && (
                                    messageStatus === 'seen' ? (
                                      <DoneAllIcon sx={{ fontSize: 14, color: '#2563eb' }} />
                                    ) : messageStatus === 'delivered' ? (
                                      <DoneAllIcon sx={{ fontSize: 14, color: chatColors.textSecondary }} />
                                    ) : (
                                      <DoneIcon sx={{ fontSize: 14, color: chatColors.textSecondary }} />
                                    )
                                  )}
                                </Stack>
                              </Paper>
                              {mine && (
                                <Avatar
                                  src={messageAvatarSrc}
                                  onClick={() => openPublicProfile({ user_id: user?.id, role: user?.role })}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    bgcolor: chatColors.avatarBg,
                                    color: chatColors.avatarText,
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: resolveProfilePath({ user_id: user?.id, role: user?.role }) ? 'pointer' : 'default'
                                  }}
                                >
                                  {messageAvatar}
                                </Avatar>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>

                  <Box
                    sx={{
                      p: 0,
                      borderTop: `1px solid ${chatColors.line}`,
                      backgroundColor: chatColors.composerBg
                    }}
                  >
                    <Box sx={{ p: 1.2, position: 'relative' }}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        placeholder="Type your message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            pr: 12,
                            color: chatColors.textPrimary,
                            backgroundColor: chatColors.inputBg,
                            alignItems: 'flex-end',
                            '& fieldset': { borderColor: chatColors.inputBorder },
                            '&:hover fieldset': { borderColor: chatColors.inputBorderHover },
                            '&.Mui-focused': { boxShadow: 'none' },
                            '&.Mui-focused fieldset': { borderColor: chatColors.inputBorder, outline: 'none' }
                          },
                          '& .MuiInputBase-inputMultiline': {
                            resize: 'vertical'
                          }
                        }}
                      />

                      <Stack
                        direction="row"
                        spacing={0.4}
                        sx={{
                          position: 'absolute',
                          right: 18,
                          bottom: 14,
                          alignItems: 'center'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => openPicker(e, 'emoji')}
                          sx={{ color: chatColors.textSecondary }}
                        >
                          <EmojiEmotionsIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => openPicker(e, 'sticker')}
                          sx={{ color: chatColors.textSecondary }}
                        >
                          <ImageIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={handleSend}
                          disabled={sending || !messageInput.trim()}
                          sx={{
                            width: 30,
                            height: 30,
                            backgroundColor: chatColors.sendBtnBg,
                            color: '#ffffff',
                            '&:hover': { backgroundColor: chatColors.sendBtnHover },
                            '&.Mui-disabled': { backgroundColor: chatColors.sendBtnDisabled, color: '#ffffff' }
                          }}
                        >
                          <SendRoundedIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Stack>

                      <Popover
                        open={Boolean(pickerAnchorEl)}
                        anchorEl={pickerAnchorEl}
                        onClose={closePicker}
                        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        PaperProps={{
                          sx: {
                            width: 260,
                            p: 1,
                            backgroundColor: chatColors.inputBg,
                            border: `1px solid ${chatColors.inputBorder}`
                          }
                        }}
                      >
                        <Typography variant="caption" sx={{ color: chatColors.textSecondary, px: 0.5 }}>
                          {pickerMode === 'emoji' ? 'Choose emoji' : 'Choose sticker'}
                        </Typography>
                        <Divider sx={{ my: 0.8, borderColor: chatColors.inputBorder }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                          {(pickerMode === 'emoji' ? EMOJIS : STICKERS).map((token) => (
                            <Button
                              key={token}
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                insertToken(token);
                                closePicker();
                              }}
                              sx={{
                                minWidth: pickerMode === 'emoji' ? 36 : 'auto',
                                textTransform: 'none',
                                borderColor: chatColors.inputBorder,
                                color: chatColors.textPrimary
                              }}
                            >
                              {token}
                            </Button>
                          ))}
                        </Box>
                      </Popover>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: chatColors.textPrimary }}>Choose a connection</Typography>
                    <Typography sx={{ color: chatColors.textSecondary, mt: 0.8 }}>
                      Select a connected user from the list to open chat.
                    </Typography>
                    {visibleList.length > 0 && (
                      <Button
                        sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
                        variant="outlined"
                        onClick={() => setSelectedUserId(visibleList[0].user_id)}
                      >
                        Open First Chat
                      </Button>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
            )}

            {/* Sidebar – right pane with tab switcher at top */}
            {(!isMobile || mobileView === 'list') && (
            <Box
              sx={{
                gridArea: 'sidebar',
                borderLeft: { md: `1px solid ${chatColors.line}` },
                borderBottom: { xs: `1px solid ${chatColors.line}`, md: 'none' },
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                background: chatColors.sidebarBg
              }}
            >
              {/* Tab switcher inside sidebar */}
              <Box sx={{ borderBottom: `1px solid ${chatColors.line}`, background: chatColors.headerBg, flexShrink: 0 }}>
                <Tabs
                  value={tabValue}
                  onChange={(e, newValue) => {
                    setTabValue(newValue);
                    if (newValue === 0) {
                      setSelectedUserId(null);
                    } else {
                      setSelectedGroupId(null);
                    }
                  }}
                  variant="fullWidth"
                  sx={{
                    '& .MuiTabs-indicator': { backgroundColor: chatColors.textPrimary },
                    '& .MuiTab-root': { color: chatColors.textSecondary, minHeight: 44, fontSize: '0.82rem' },
                    '& .Mui-selected': { color: chatColors.textPrimary, fontWeight: 700 }
                  }}
                >
                  <Tab
                    label={<Badge color="error" badgeContent={directUnreadCount} invisible={directUnreadCount === 0}>Chats</Badge>}
                    value={0}
                  />
                  <Tab
                    label={<Badge color="error" badgeContent={groupUnreadCount} invisible={groupUnreadCount === 0}>Groups</Badge>}
                    value={1}
                  />
                </Tabs>
              </Box>

              {/* Chats list */}
              {tabValue === 0 && (<>
              <Box sx={{ p: 2, borderBottom: `1px solid ${chatColors.line}` }}>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2, color: chatColors.textPrimary }}>
                  Chats
                </Typography>
                <Typography variant="caption" sx={{ color: chatColors.textSecondary }}>
                  Message only your connected users
                </Typography>
                {!isMobile && (
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by name, school, or message"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                      mt: 1.5,
                      '& .MuiOutlinedInput-root': {
                        color: chatColors.textPrimary,
                        backgroundColor: chatColors.inputBg,
                        '& fieldset': { borderColor: chatColors.inputBorder },
                        '&:hover fieldset': { borderColor: chatColors.inputBorderHover },
                        '&.Mui-focused fieldset': { borderColor: chatColors.inputBorderFocus }
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: chatColors.textSecondary }} fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {loadingList && visibleList.length === 0 ? (
                  <Typography sx={{ p: 2, color: chatColors.textSecondary }}>Loading chat users...</Typography>
                ) : visibleList.length === 0 ? (
                  <Typography sx={{ p: 2, color: chatColors.textSecondary }}>No users in this list.</Typography>
                ) : (
                  visibleList.map((item) => {
                    const isSelected = selectedUserId === item.user_id;
                    const unread = Number(item.unread_count || 0);
                    const isUnread = unread > 0;
                    const currentUserId = Number(user?.id);
                    const isLatestFromMe = Number(item.last_message_sender_id) === currentUserId;
                    const isLatestRead = Boolean(item.last_message_is_read);
                    const hasRecipient = Number(item.last_message_recipient_id) > 0;
                    const latestStatus = isLatestRead
                      ? 'seen'
                      : hasRecipient
                        ? 'delivered'
                        : 'sent';
                    return (
                      <Box
                        key={item.user_id}
                        onClick={() => handleSelectUser(item.user_id)}
                        sx={{
                          p: 1.4,
                          cursor: 'pointer',
                          borderBottom: `1px solid ${chatColors.line}`,
                          backgroundColor: isSelected ? chatColors.selectedRowBg : 'transparent',
                          '&:hover': { backgroundColor: chatColors.hoverRowBg }
                        }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                          <Badge color="error" badgeContent={unread} invisible={unread === 0}>
                            <Avatar src={item.profile_image_url || ''} sx={{ width: 40, height: 40, bgcolor: chatColors.avatarBg, color: chatColors.avatarText, fontWeight: 700 }}>
                              {getInitials(item.first_name, item.last_name)}
                            </Avatar>
                          </Badge>
                          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: isUnread ? 800 : 600, color: chatColors.textPrimary }} noWrap>
                                {item.first_name} {item.last_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: chatColors.textSecondary }}>
                                {formatRelative(item.last_message_at)}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: chatColors.textSecondary,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.school_name || 'School not set'}
                            </Typography>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: unread ? chatColors.unreadText : chatColors.textSecondary,
                                fontWeight: unread ? 800 : 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                width: '100%'
                              }}
                            >
                              {truncatePreview(item.last_message)}
                            </Typography>
                            {isLatestFromMe && item.last_message && (
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.15 }}>
                                {latestStatus === 'seen' ? (
                                  <DoneAllIcon sx={{ fontSize: 14, color: '#2563eb' }} />
                                ) : latestStatus === 'delivered' ? (
                                  <DoneAllIcon sx={{ fontSize: 14, color: chatColors.textSecondary }} />
                                ) : (
                                  <DoneIcon sx={{ fontSize: 14, color: chatColors.textSecondary }} />
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: latestStatus === 'seen' ? '#2563eb' : chatColors.textSecondary,
                                    fontWeight: latestStatus === 'seen' ? 700 : 500,
                                    lineHeight: 1.1
                                  }}
                                >
                                  {latestStatus === 'seen' ? 'Seen' : latestStatus === 'delivered' ? 'Delivered' : 'Sent'}
                                </Typography>
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Box>
              </> )}

              {/* Groups list */}
              {tabValue === 1 && (<>
              <Box sx={{ p: 2, borderBottom: `1px solid ${chatColors.line}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2, color: chatColors.textPrimary }}>
                      Groups
                    </Typography>
                    <Typography variant="caption" sx={{ color: chatColors.textSecondary }}>
                      Group conversations with your connections
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setOpenCreateGroupDialog(true)}
                    sx={{
                      minWidth: 'fit-content',
                      backgroundColor: chatColors.sendBtnBg,
                      '&:hover': { backgroundColor: chatColors.sendBtnHover }
                    }}
                  >
                    New Group
                  </Button>
                </Stack>
                {!isMobile && (
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by group name or message"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    sx={{
                      mt: 1.5,
                      '& .MuiOutlinedInput-root': {
                        color: chatColors.textPrimary,
                        backgroundColor: chatColors.inputBg,
                        '& fieldset': { borderColor: chatColors.inputBorder },
                        '&:hover fieldset': { borderColor: chatColors.inputBorderHover },
                        '&.Mui-focused fieldset': { borderColor: chatColors.inputBorderFocus }
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: chatColors.textSecondary }} fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {loadingGroups && visibleGroups.length === 0 ? (
                  <Typography sx={{ p: 2, color: chatColors.textSecondary }}>Loading groups...</Typography>
                ) : visibleGroups.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Typography sx={{ color: chatColors.textSecondary }}>
                      {groups.length === 0 ? 'No groups yet.' : 'No groups match this search.'}
                    </Typography>
                  </Box>
                ) : (
                  visibleGroups.map((group) => {
                    const isSelected = Number(selectedGroupId) === Number(group.id);
                    const unread = Number(group.unread_count || 0);
                    const isUnread = unread > 0;
                    return (
                      <Box
                        key={group.id}
                        onClick={() => handleSelectGroup(group.id)}
                        sx={{
                          p: 1.4,
                          cursor: 'pointer',
                          borderBottom: `1px solid ${chatColors.line}`,
                          backgroundColor: isSelected ? chatColors.selectedRowBg : 'transparent',
                          '&:hover': { backgroundColor: chatColors.hoverRowBg }
                        }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                          <Badge color="error" badgeContent={unread} invisible={unread === 0}>
                            <Avatar sx={{ width: 40, height: 40, bgcolor: chatColors.avatarBg, color: chatColors.avatarText, fontWeight: 700 }}>
                              {String(group.name || '?').charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                              <Typography variant="body2" sx={{ fontWeight: isUnread ? 800 : 600, color: chatColors.textPrimary }} noWrap>
                                {group.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: chatColors.textSecondary, flexShrink: 0 }}>
                                {formatRelative(group.last_message_at)}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: chatColors.textSecondary,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {`${group.member_count || 0} member${Number(group.member_count) === 1 ? '' : 's'}${group.is_admin ? ' · Admin' : ''}`}
                            </Typography>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: isUnread ? chatColors.unreadText : chatColors.textSecondary,
                                fontWeight: isUnread ? 800 : 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                width: '100%'
                              }}
                            >
                              {truncatePreview(group.last_message)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Box>
              </> )}

            </Box>
            )}
          </Box>

        </Paper>

        {/* Create Group Dialog */}
        <CreateGroupDialog
          open={openCreateGroupDialog}
          onClose={() => setOpenCreateGroupDialog(false)}
          onSuccess={(group) => {
            setOpenCreateGroupDialog(false);
            loadGroups();
            if (group?.id) {
              setSelectedGroupId(group.id);
              if (isMobile) {
                setMobileView('chat');
                setTabValue(1);
              }
            }
          }}
        />

        {error && (
          <Typography sx={{ mt: 1, color: chatColors.errorText }} variant="caption">
            {error}
          </Typography>
        )}
      </Box>
    </Layout>
  );
};

export default Chat;

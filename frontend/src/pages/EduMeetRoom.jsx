import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
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
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  useMediaQuery,
  useTheme,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  Chat,
  Close,
  ContentCopy,
  DarkMode,
  Delete,
  Logout,
  LightMode,
  Download,
  Draw,
  EmojiEmotions,
  FilePresent,
  Fullscreen,
  FullscreenExit,
  Mic,
  MicOff,
  MoreVert,
  OpenInNew,
  PanTool,
  People,
  PlayArrow,
  Poll,
  PushPin,
  Refresh,
  Settings,
  ScreenShare,
  Send,
  Stop,
  StopScreenShare,
  RadioButtonChecked,
  Videocam,
  VideocamOff,
  VolumeOff,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import eduMeetService from '../services/edumeet';
import { createEduMeetSocket } from '../services/edumeetSocket';
import { Room as LiveKitRoom, RoomEvent } from 'livekit-client';

const TYPE_LABEL = {
  one_to_one: 'One-to-One',
  one_to_many: 'One-to-Many',
  many_to_many: 'Many-to-Many',
};

const ROLE_COLOR = {
  admin: 'error',
  teacher: 'primary',
  student: 'default',
};

const ROOM_DESIGN_TOKENS = {
  dark: {
    bgPrimary: '#0f172a',
    bgSecondary: '#111827',
    bgGlass: 'rgba(20,20,20,0.6)',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5f5',
    accentGreen: '#4ade80',
    accentBlue: '#60a5fa',
    dangerRed: '#ef4444',
    tileBg: '#1f2937',
    hoverBg: '#374151',
    borderSubtle: 'rgba(255,255,255,0.08)',
    panelShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  light: {
    bgPrimary: '#eef4ff',
    bgSecondary: '#f8fbff',
    bgGlass: 'rgba(255,255,255,0.72)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    accentGreen: '#16a34a',
    accentBlue: '#2563eb',
    dangerRed: '#dc2626',
    tileBg: '#ffffff',
    hoverBg: '#f1f5f9',
    borderSubtle: 'rgba(15,23,42,0.12)',
    panelShadow: '0 8px 24px rgba(15,23,42,0.14)',
  },
};

const formatSeconds = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const parseMediaFlag = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  }
  return fallback;
};

const isLikelyScreenTrack = (track) => {
  if (!track || track.kind !== 'video') return false;
  const settings = track.getSettings?.() || {};
  const label = String(track.label || '').toLowerCase();
  return Boolean(
    settings.displaySurface
    || label.includes('screen')
    || label.includes('window')
    || label.includes('tab')
  );
};

const debugLog = (event, payload = {}) => {
  try {
    // Keep one searchable prefix for easy filtering in browser console.
    console.debug(`[EduMeet-RTC] ${event}`, {
      at: new Date().toISOString(),
      ...payload,
    });
  } catch {
    // no-op
  }
};

const drawStroke = (ctx, stroke) => {
  if (!ctx || !stroke) return;
  ctx.strokeStyle = stroke.color || '#0f172a';
  ctx.lineWidth = stroke.width || 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(stroke.fromX * ctx.canvas.width, stroke.fromY * ctx.canvas.height);
  ctx.lineTo(stroke.toX * ctx.canvas.width, stroke.toY * ctx.canvas.height);
  ctx.stroke();
};

const WhiteboardCanvas = ({ events, canDraw, onDraw, onClear }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    events.forEach((event) => {
      if (event.event_type === 'draw') drawStroke(ctx, event.payload || event.stroke);
    });
  }, [events]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const handleStart = (event) => {
    if (!canDraw) return;
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  };

  const handleMove = (event) => {
    if (!canDraw || !drawingRef.current || !lastPointRef.current) return;
    const nextPoint = getPoint(event);
    const stroke = {
      fromX: lastPointRef.current.x,
      fromY: lastPointRef.current.y,
      toX: nextPoint.x,
      toY: nextPoint.y,
      color: '#0f172a',
      width: 2,
    };
    onDraw(stroke);
    lastPointRef.current = nextPoint;
  };

  const handleEnd = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" fontWeight={700}>Interactive Whiteboard</Typography>
        <Button size="small" color="error" onClick={onClear} disabled={!canDraw}>Clear</Button>
      </Box>
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <canvas
          ref={canvasRef}
          width={960}
          height={420}
          style={{ width: '100%', height: 420, background: '#ffffff', borderRadius: 12, touchAction: 'none', cursor: canDraw ? 'crosshair' : 'not-allowed' }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </Box>
    </Paper>
  );
};

const PollDialog = ({ open, onClose, onSubmit, loading }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctOption, setCorrectOption] = useState('');

  useEffect(() => {
    if (open) {
      setQuestion('');
      setOptions(['', '']);
      setCorrectOption('');
    }
  }, [open]);

  const setOption = (index, value) => {
    setOptions((current) => current.map((item, idx) => (idx === index ? value : item)));
  };

  const validOptions = options.filter((item) => item.trim());

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Live Poll</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Question" value={question} onChange={(event) => setQuestion(event.target.value)} size="small" fullWidth />
          {options.map((option, index) => (
            <TextField key={index} label={`Option ${index + 1}`} value={option} onChange={(event) => setOption(index, event.target.value)} size="small" fullWidth />
          ))}
          <Button size="small" onClick={() => setOptions((current) => [...current, ''])} disabled={options.length >= 6}>Add Option</Button>
          <Typography variant="caption" color="text.secondary">{options.length}/6 options</Typography>
          
          {validOptions.length >= 2 && (
            <FormControl fullWidth size="small">
              <InputLabel>Mark Correct Answer</InputLabel>
              <Select
                value={correctOption}
                onChange={(event) => setCorrectOption(event.target.value)}
                label="Mark Correct Answer"
              >
                {validOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={() => onSubmit({ question, options: validOptions, correctOption })}
          variant="contained"
          disabled={loading || !question.trim() || validOptions.length < 2}
        >
          {loading ? <CircularProgress size={18} /> : 'Create Poll'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FileDialog = ({ open, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState({ title: '', file_type: 'link', file_url: '' });

  useEffect(() => {
    if (open) setForm({ title: '', file_type: 'link', file_url: '' });
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Learning Resource</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Resource Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} size="small" fullWidth />
          <TextField select label="Type" value={form.file_type} onChange={(event) => setForm((current) => ({ ...current, file_type: event.target.value }))} size="small" fullWidth>
            <MenuItem value="link">Link</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="image">Image</MenuItem>
            <MenuItem value="notes">Notes</MenuItem>
          </TextField>
          <TextField label="URL" value={form.file_url} onChange={(event) => setForm((current) => ({ ...current, file_url: event.target.value }))} size="small" fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} variant="contained" disabled={loading || !form.title.trim() || !form.file_url.trim()}>
          {loading ? <CircularProgress size={18} /> : 'Share'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RemoteVideoTile = React.memo(({ participant, stream, isLocal, darkMode, cameraOn, micOn, isActiveSpeaker, handRaised, canMuteParticipant, onMuteParticipant }) => {
  const tileRef = useRef(null);
  const tileContainerRef = useRef(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const playRetryTimerRef = useRef(null);

  useEffect(() => {
    const videoEl = tileRef.current;
    if (!videoEl) return undefined;

    const clearPlayRetry = () => {
      if (playRetryTimerRef.current) {
        window.clearTimeout(playRetryTimerRef.current);
        playRetryTimerRef.current = null;
      }
    };

    const safePlay = () => {
      if (!tileRef.current || !stream) return;
      tileRef.current.play?.().catch(() => {
        // Keep retrying shortly; this avoids requiring tab switch for track resume.
        clearPlayRetry();
        playRetryTimerRef.current = window.setTimeout(() => {
          safePlay();
        }, 220);
      });
    };

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream || null;
    }
    if (stream) safePlay();

    if (!stream) {
      clearPlayRetry();
      return () => clearPlayRetry();
    }

    const trackCleanups = new Map();
    const bindTrackListeners = (track) => {
      if (!track || trackCleanups.has(track.id)) return;
      const onTrackState = () => safePlay();
      track.addEventListener('mute', onTrackState);
      track.addEventListener('unmute', onTrackState);
      track.addEventListener('ended', onTrackState);
      trackCleanups.set(track.id, () => {
        track.removeEventListener('mute', onTrackState);
        track.removeEventListener('unmute', onTrackState);
        track.removeEventListener('ended', onTrackState);
      });
    };

    stream.getTracks().forEach((track) => bindTrackListeners(track));

    const onAddTrack = (event) => {
      bindTrackListeners(event.track);
      safePlay();
    };
    const onRemoveTrack = () => safePlay();

    stream.addEventListener('addtrack', onAddTrack);
    stream.addEventListener('removetrack', onRemoveTrack);

    return () => {
      clearPlayRetry();
      stream.removeEventListener('addtrack', onAddTrack);
      stream.removeEventListener('removetrack', onRemoveTrack);
      trackCleanups.forEach((cleanup) => cleanup());
    };
  }, [stream]);

  const hasLiveVideoTrack = Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live'));
  const hasLiveAudioTrack = Boolean(stream?.getAudioTracks?.().some((track) => track.readyState === 'live'));
  const hasScreenTrack = Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live' && isLikelyScreenTrack(track)));
  const remoteCameraOn = parseMediaFlag(participant.camera_enabled ?? participant.cameraEnabled, true);
  // For local: show video only when camera is on AND there is a live track.
  // For remote: show video only when the remote participant has camera_enabled AND a live track exists.
  // Without remoteCameraOn, turning camera off in LiveKit still shows a black frame.
  const showVideo = isLocal ? (cameraOn && hasLiveVideoTrack) : (remoteCameraOn && hasLiveVideoTrack);
  const shouldAttachMediaElement = showVideo || (!isLocal && hasLiveAudioTrack);
  const remoteMicOn = parseMediaFlag(participant.mic_enabled ?? participant.micEnabled, true);
  const isMuted = isLocal ? !micOn : !remoteMicOn;

  const tileBorder = isActiveSpeaker
    ? '1px solid rgba(34,197,94,0.85)'
    : isMuted
      ? '1px solid rgba(74,222,128,0.72)'
      : `1px solid ${darkMode ? 'rgba(148,163,184,0.24)' : '#d1d5db'}`;

  const tileShadow = isActiveSpeaker
    ? '0 0 0 2px rgba(34,197,94,0.20), 0 14px 28px rgba(2,6,23,0.36)'
    : isMuted
      ? '0 0 0 1px rgba(34,197,94,0.18), 0 8px 18px rgba(2,6,23,0.28)'
      : (darkMode ? '0 8px 20px rgba(2,6,23,0.30)' : '0 6px 16px rgba(15,23,42,0.10)');

  const openTileMenu = (event) => setMenuAnchorEl(event.currentTarget);
  const closeTileMenu = () => setMenuAnchorEl(null);

  const handleFullscreen = () => {
    closeTileMenu();
    tileContainerRef.current?.requestFullscreen?.().catch(() => {});
  };

  const handleMuteParticipant = () => {
    closeTileMenu();
    if (canMuteParticipant && onMuteParticipant) onMuteParticipant(participant.user_id);
  };

  return (
    <Paper
      ref={tileContainerRef}
      sx={{
        borderRadius: 1.5,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: darkMode ? '#0b1220' : '#eef2f7',
        border: tileBorder,
        boxShadow: tileShadow,
        transition: 'all 180ms ease-in-out',
        '&:fullscreen, &:-webkit-full-screen': {
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
          backgroundColor: '#000',
        },
        '&:fullscreen video, &:-webkit-full-screen video': {
          objectFit: 'contain !important',
          width: '100vw !important',
          height: '100vh !important',
          backgroundColor: '#000',
        },
      }}
    >
      {shouldAttachMediaElement ? (
        <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <video
            ref={tileRef}
            autoPlay
            playsInline
            muted={isLocal}
            style={{
              width: '100%',
              height: '100%',
              objectFit: hasScreenTrack ? 'contain' : 'cover',
              display: 'block',
              background: '#000',
              opacity: showVideo ? 1 : 0,
            }}
          />
          {!showVideo && (
            <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: darkMode ? '#0f172a' : '#cbd5e1', color: darkMode ? '#f8fafc' : '#0f172a', fontWeight: 700 }}>
                {participant.first_name?.[0] || '?'}{participant.last_name?.[0] || ''}
              </Avatar>
            </Stack>
          )}
          <IconButton size="small" onClick={openTileMenu} sx={{ position: 'absolute', top: 8, right: handRaised ? 68 : 8, color: '#e2e8f0', bgcolor: 'rgba(2,6,23,0.45)', '&:hover': { bgcolor: 'rgba(2,6,23,0.68)' } }}>
            <MoreVert sx={{ fontSize: 16 }} />
          </IconButton>
          {handRaised && (
            <Box sx={{ position: 'absolute', top: 8, right: 8, px: 0.75, py: 0.35, borderRadius: 1, bgcolor: 'rgba(245,158,11,0.90)', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
              <PanTool sx={{ fontSize: 14 }} />
              <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1 }}>Hand</Typography>
            </Box>
          )}
          <Box sx={{ position: 'absolute', left: 8, bottom: 8, px: 0.85, py: 0.45, borderRadius: 1, bgcolor: 'rgba(15,23,42,0.58)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" fontWeight={700} noWrap sx={{ color: '#f8fafc', maxWidth: 150 }}>
              {participant.first_name} {participant.last_name}{isLocal ? ' (You)' : ''}
            </Typography>
            {(isLocal ? micOn : remoteMicOn)
              ? <Mic sx={{ fontSize: 14, color: '#22c55e' }} />
              : <MicOff sx={{ fontSize: 14, color: '#f87171' }} />}
          </Box>
        </Box>
      ) : (
        <Stack alignItems="center" justifyContent="center" spacing={1.1} sx={{ p: 1.5, flex: 1, minHeight: 0, position: 'relative' }}>
          <IconButton size="small" onClick={openTileMenu} sx={{ position: 'absolute', top: 8, right: 8, color: darkMode ? '#e2e8f0' : '#0f172a', bgcolor: darkMode ? 'rgba(2,6,23,0.35)' : 'rgba(255,255,255,0.55)', '&:hover': { bgcolor: darkMode ? 'rgba(2,6,23,0.6)' : 'rgba(255,255,255,0.8)' } }}>
            <MoreVert sx={{ fontSize: 16 }} />
          </IconButton>
          {handRaised && (
            <Chip size="small" icon={<PanTool sx={{ fontSize: '0.9rem !important' }} />} label="Hand Raised" sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: darkMode ? '#facc15' : '#92400e', border: '1px solid rgba(245,158,11,0.35)' }} />
          )}
          <Avatar sx={{ width: 52, height: 52 }}>{participant.first_name?.[0]}{participant.last_name?.[0]}</Avatar>
          <Stack direction="row" alignItems="center" spacing={0.7} sx={{ px: 0.85, py: 0.45, borderRadius: 1, bgcolor: darkMode ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.8)' }}>
            <Typography variant="caption" fontWeight={700} noWrap sx={{ color: darkMode ? '#f8fafc' : '#0f172a', maxWidth: 160 }}>
              {participant.first_name} {participant.last_name}{isLocal ? ' (You)' : ''}
            </Typography>
            {(isLocal ? micOn : remoteMicOn)
              ? <Mic sx={{ fontSize: 14, color: '#22c55e' }} />
              : <MicOff sx={{ fontSize: 14, color: '#f87171' }} />}
          </Stack>
        </Stack>
      )}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={closeTileMenu}>
        {canMuteParticipant && (
          <MenuItem onClick={handleMuteParticipant}>
            <VolumeOff sx={{ fontSize: 16, mr: 1 }} /> Mute
          </MenuItem>
        )}
        <MenuItem onClick={handleFullscreen}>
          <Fullscreen sx={{ fontSize: 16, mr: 1 }} /> Full screen
        </MenuItem>
      </Menu>
    </Paper>
  );
});

const EduMeetRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isPhoneLayout = useMediaQuery('(max-width:768px)');
  const { user } = useAuth();
  const isManager = ['faculty', 'school_admin', 'super_admin'].includes(user?.role);
  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [files, setFiles] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [whiteboardEvents, setWhiteboardEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sideTab, setSideTab] = useState(0);
  const [mainTab, setMainTab] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [pollOpen, setPollOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [qualityMode, setQualityMode] = useState('low');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [reactions, setReactions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [liveRecordingInfo, setLiveRecordingInfo] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [handQueue, setHandQueue] = useState([]);
  const [breakoutRooms, setBreakoutRooms] = useState([]);
  const [newBreakoutTitle, setNewBreakoutTitle] = useState('');
  const [selectedBreakoutRoomId, setSelectedBreakoutRoomId] = useState('');
  const [chatPopped, setChatPopped] = useState(false);
  const [chatPos, setChatPos] = useState(() => ({ x: Math.max(20, window.innerWidth - 390), y: 80 }));
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const [participantPage, setParticipantPage] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showControlsBar, setShowControlsBar] = useState(true);
  const [controlsHideTimerRef] = useState({ current: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [networkQuality, setNetworkQuality] = useState({ label: 'Network: Normal', color: 'default' });
  const [activeScreenShare, setActiveScreenShare] = useState(null);
  const [localScreenShareStream, setLocalScreenShareStream] = useState(null);
  const [isShareStageFullscreen, setIsShareStageFullscreen] = useState(false);
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [forceMeshFallback, setForceMeshFallback] = useState(false);
  const [mediaRefreshKey, setMediaRefreshKey] = useState(0);
  // Mobile-first UI state
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [hostMuted, setHostMuted] = useState(false);
  const [focusedParticipantId, setFocusedParticipantId] = useState(null);
  const [selfViewPos, setSelfViewPos] = useState({ x: null, y: null });
  const selfViewDragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const peersRef = useRef({});
  const peerSendersRef = useRef({});
  const makingOfferRef = useRef({});
  const pendingRenegotiateRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const screenShareStreamRef = useRef(null);
  const shareVideoRef = useRef(null);
  const shareStageRef = useRef(null);
  const stageGridRef = useRef(null);
  const chatMessagesScrollRef = useRef(null);
  const isChatOpenRef = useRef(!isMobile);
  const localStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const liveKitRoomRef = useRef(null);
  const liveKitConnectedRef = useRef(false);
  const participantsRef = useRef([]);
  const remoteStreamsRef = useRef({});
  const participantPresenceSnapshotRef = useRef(new Map());
  const mediaStatusRef = useRef({
    micOn: true,
    cameraOn: true,
    qualityMode: 'low',
    selectedAudioDevice: '',
    lowBandwidthMode: false,
  });
  const meshFallbackRejoinSentRef = useRef(false);
  const preferredFacingModeRef = useRef('user');
  const forcingFrontCameraRef = useRef(false);
  const prevMediaStateRef = useRef({ micOn: true, cameraOn: true, qualityMode: 'low' });
  const repairingVideoPublishRef = useRef(false);
  const lastVideoRepairAtRef = useRef(0);
  const ui = darkMode ? ROOM_DESIGN_TOKENS.dark : ROOM_DESIGN_TOKENS.light;
  const meetingPanelWidth = 344;

  const toggleChatPanel = useCallback(() => {
    setIsChatOpen((current) => {
      const next = !current;
      if (next) {
        setSideTab(0);
        setUnreadCount(0);
      }
      return next;
    });
  }, []);

  const isChatScrolledToLatest = useCallback(() => {
    const node = chatMessagesScrollRef.current;
    if (!node) return false;
    return (node.scrollHeight - node.scrollTop - node.clientHeight) <= 24;
  }, []);

  const scrollChatToLatest = useCallback((behavior = 'auto') => {
    const node = chatMessagesScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  const pushToast = useCallback((message, severity = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, message, severity }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // Self-view tile dragging (mobile) - must be before any conditional returns
  const startSelfViewDrag = useCallback((e) => {
    if (!isMobile) return;
    const pt = e.touches ? e.touches[0] : e;
    selfViewDragRef.current = {
      dragging: true,
      startX: pt.clientX,
      startY: pt.clientY,
      origX: selfViewPos.x ?? (window.innerWidth - 84),
      origY: selfViewPos.y ?? (window.innerHeight - 160),
    };
    const move = (me) => {
      const p = me.touches ? me.touches[0] : me;
      const dx = p.clientX - selfViewDragRef.current.startX;
      const dy = p.clientY - selfViewDragRef.current.startY;
      setSelfViewPos({
        x: Math.max(8, Math.min(window.innerWidth - 84, selfViewDragRef.current.origX + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 132, selfViewDragRef.current.origY + dy)),
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
  }, [isMobile, selfViewPos]);

  const normalizeParticipants = useCallback((items = []) => (
    items.filter((participant) => ['joined', 'in_room'].includes(String(participant?.status || '').toLowerCase()))
  ), []);

  const ensureMobileFrontCamera = useCallback(async (publication, reason = 'unknown') => {
    if (!isMobile) return;
    if (preferredFacingModeRef.current !== 'user') return;
    if (forcingFrontCameraRef.current) return;

    const localVideoTrack = publication?.videoTrack || publication?.track;
    const mediaTrack = localVideoTrack?.mediaStreamTrack;
    if (!localVideoTrack || !mediaTrack) return;

    const facingMode = mediaTrack.getSettings?.().facingMode || 'unknown';
    console.info(`[EduMeet-LiveKit] Local video facingMode=${facingMode} (${reason})`);

    if (facingMode !== 'environment') return;
    if (!localVideoTrack.restartTrack) return;

    forcingFrontCameraRef.current = true;
    try {
      console.warn('[EduMeet-LiveKit] Back camera detected on mobile, restarting to front camera');
      await localVideoTrack.restartTrack({ facingMode: 'user' });
    } catch (error) {
      console.warn('[EduMeet-LiveKit] Front camera restart failed', { message: error?.message });
    } finally {
      window.setTimeout(() => {
        forcingFrontCameraRef.current = false;
      }, 800);
    }
  }, [isMobile]);

  const spotlightParticipant = useMemo(
    () => participants.find((participant) => participant.spotlighted) || participants.find((participant) => participant.role === 'teacher') || participants[0],
    [participants]
  );

  const orderedParticipants = useMemo(() => {
    const local = participants.find((p) => String(p.user_id) === String(user?.id));
    const rest = participants.filter((p) => String(p.user_id) !== String(user?.id));
    return local ? [local, ...rest] : rest;
  }, [participants, user?.id]);

  const participantsPerPage = isMobile ? 4 : 10;
  const participantPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < orderedParticipants.length; i += participantsPerPage) {
      pages.push(orderedParticipants.slice(i, i + participantsPerPage));
    }
    return pages.length ? pages : [[]];
  }, [orderedParticipants]);

  useEffect(() => {
    setParticipantPage((current) => Math.min(current, Math.max(0, participantPages.length - 1)));
  }, [participantPages.length]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
      window.setTimeout(() => scrollChatToLatest('smooth'), 60);
    }
  }, [isChatOpen, scrollChatToLatest]);

  useEffect(() => {
    if (!isChatOpen || sideTab !== 0) return;
    window.setTimeout(() => scrollChatToLatest('smooth'), 30);
    setUnreadCount(0);
  }, [messages.length, isChatOpen, sideTab, scrollChatToLatest]);

  // Initialize chat as closed on desktop too (new modern design)
  // Users can open manually via button
  useEffect(() => {
    // Reset on mount, chat stays closed by default
  }, []);

  // Push toasts when error/success changes
  useEffect(() => { if (error) { pushToast(error, 'error'); } }, [error]);
  useEffect(() => { if (success) { pushToast(success, 'success'); } }, [success]);
  useEffect(() => { if (mediaError) { pushToast(mediaError, 'warning'); } }, [mediaError]);

  // Auto-hide controls after inactivity on desktop only
  useEffect(() => {
    // On mobile, controls are always visible (no auto-hide)
    if (isMobile) { setShowControlsBar(true); return undefined; }
    const handleMouseMove = () => {
      setShowControlsBar(true);
      if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = setTimeout(() => setShowControlsBar(false), 3000);
    };
    
    const handleKeyDown = () => {
      setShowControlsBar(true);
      if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
    };
  }, [controlsHideTimerRef, isMobile]);

  const visibleParticipants = participantPages[participantPage] || [];
  const visibleParticipantCount = Math.max(1, visibleParticipants.length);
  const hideScrollbarSx = {
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      width: 0,
      height: 0,
      display: 'none',
    },
  };

  const gridColumns = useMemo(() => {
    const count = visibleParticipantCount;
    if (count === 1) return 'repeat(1, minmax(0, 1fr))';
    if (count === 2) return isPhoneLayout ? 'repeat(1, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))';
    if (count <= 4) return 'repeat(2, minmax(0, 1fr))';
    return 'repeat(3, minmax(0, 1fr))';
  }, [visibleParticipantCount, isPhoneLayout]);

  const gridRows = useMemo(() => {
    const count = visibleParticipantCount;
    if (count === 1) return 1;
    if (count === 2) return isPhoneLayout ? 2 : 1;
    if (count <= 4) return 2;
    return Math.ceil(count / 3);
  }, [visibleParticipantCount, isPhoneLayout]);
  const hasPagination = participantPages.length > 1;

  const detectedRemoteScreenShare = useMemo(() => {
    for (const participant of orderedParticipants) {
      if (String(participant.user_id) === String(user?.id)) continue;
      const stream = remoteStreams[participant.user_id];
      const screenTrack = stream?.getVideoTracks?.().find((track) => track.readyState === 'live' && isLikelyScreenTrack(track));
      if (screenTrack) {
        return {
          roomId,
          active: true,
          userId: participant.user_id,
          firstName: participant.first_name,
          lastName: participant.last_name,
          stream,
        };
      }
    }
    return null;
  }, [orderedParticipants, remoteStreams, roomId, user?.id]);

  const effectiveScreenShare = useMemo(() => {
    if (activeScreenShare?.active) return activeScreenShare;
    if (screenSharing) {
      return {
        roomId,
        active: true,
        userId: user?.id,
        firstName: user?.first_name,
        lastName: user?.last_name,
      };
    }
    return detectedRemoteScreenShare;
  }, [activeScreenShare, screenSharing, detectedRemoteScreenShare, roomId, user?.id, user?.first_name, user?.last_name]);

  const isScreenShareActive = Boolean(effectiveScreenShare?.active);

  const toggleSharedStageFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    shareStageRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsShareStageFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const sharedScreenStream = useMemo(() => {
    if (!isScreenShareActive) return null;
    const isLocalSharer = String(effectiveScreenShare.userId) === String(user?.id);
    if (isLocalSharer) return localScreenShareStream;
    if (detectedRemoteScreenShare && String(detectedRemoteScreenShare.userId) === String(effectiveScreenShare.userId)) {
      return detectedRemoteScreenShare.stream;
    }
    return remoteStreams[effectiveScreenShare.userId] || null;
  }, [isScreenShareActive, effectiveScreenShare, localScreenShareStream, detectedRemoteScreenShare, remoteStreams, user?.id]);

  useEffect(() => {
    if (!detectedRemoteScreenShare) return;
    setActiveScreenShare((current) => {
      if (current?.active && String(current.userId) === String(detectedRemoteScreenShare.userId)) return current;
      return {
        roomId,
        active: true,
        userId: detectedRemoteScreenShare.userId,
        firstName: detectedRemoteScreenShare.firstName,
        lastName: detectedRemoteScreenShare.lastName,
      };
    });
  }, [detectedRemoteScreenShare, roomId]);

  useEffect(() => {
    if (!shareVideoRef.current) return;
    shareVideoRef.current.srcObject = sharedScreenStream || null;
    if (sharedScreenStream) {
      shareVideoRef.current.play?.().catch(() => {});
    }
  }, [sharedScreenStream]);

  const getLowBandwidthHint = useCallback(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return false;
    return Boolean(
      connection.saveData
      || ['slow-2g', '2g'].includes(connection.effectiveType)
      || (typeof connection.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1.5)
    );
  }, []);

  const updateNetworkQuality = useCallback(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) {
      setNetworkQuality({ label: 'Network: Normal', color: 'default' });
      return;
    }

    const effectiveType = String(connection.effectiveType || '').toLowerCase();
    const downlink = Number(connection.downlink || 0);
    const saveData = Boolean(connection.saveData);

    if (saveData || ['slow-2g', '2g'].includes(effectiveType) || (downlink > 0 && downlink < 1.5)) {
      setNetworkQuality({ label: 'Network: Low', color: 'warning' });
      return;
    }
    if (effectiveType === '3g' || (downlink >= 1.5 && downlink < 3)) {
      setNetworkQuality({ label: 'Network: Moderate', color: 'info' });
      return;
    }
    setNetworkQuality({ label: 'Network: Good', color: 'success' });
  }, []);

  const applySenderQualityProfile = useCallback((pc, preferLowBandwidth) => {
    if (!pc || pc.signalingState === 'closed') return;
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind !== 'video') return;
      const params = sender.getParameters() || {};
      const encodings = params.encodings?.length ? params.encodings : [{}];
      encodings[0].maxBitrate = preferLowBandwidth ? 250000 : 1200000;
      encodings[0].maxFramerate = preferLowBandwidth ? 12 : 24;
      sender.setParameters({ ...params, encodings }).catch(() => {});
    });
  }, []);

  const applyScreenShareSenderProfile = useCallback((pc) => {
    if (!pc || pc.signalingState === 'closed') return;
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind !== 'video') return;
      const params = sender.getParameters() || {};
      const encodings = params.encodings?.length ? params.encodings : [{}];
      encodings[0].maxBitrate = 2500000;
      encodings[0].maxFramerate = 30;
      sender.setParameters({
        ...params,
        degradationPreference: 'maintain-resolution',
        encodings,
      }).catch(() => {});
    });
  }, []);

  const getSenderByKind = useCallback((pc, kind) => {
    if (!pc || pc.signalingState === 'closed') return null;
    const directSender = pc.getSenders().find((sender) => sender.track?.kind === kind);
    if (directSender) return directSender;

    // When replaceTrack(null) is used, sender.track can be null. In that case,
    // use transceiver receiver kind to recover the right sender.
    const transceiverSender = pc.getTransceivers?.()
      ?.find((transceiver) => {
        const direction = transceiver?.direction || transceiver?.currentDirection || '';
        const canSend = String(direction).includes('send');
        return Boolean(canSend && transceiver?.sender && transceiver?.receiver?.track?.kind === kind);
      })
      ?.sender;
    if (!directSender && transceiverSender) {
      debugLog('sender:resolved-via-transceiver', {
        kind,
        connectionState: pc.connectionState,
        signalingState: pc.signalingState,
      });
    }
    return transceiverSender || null;
  }, []);

  const flushPendingCandidates = useCallback(async (userId, pc) => {
    const queue = pendingCandidatesRef.current[userId] || [];
    if (!queue.length) return;
    pendingCandidatesRef.current[userId] = [];
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore stale/invalid candidate
      }
    }
  }, []);

  const requestOfferToPeer = useCallback(async (peerId, pc) => {
    if (!pc || pc.signalingState === 'closed' || !socketRef.current || makingOfferRef.current[peerId]) return;
    if (pc.signalingState !== 'stable') {
      pendingRenegotiateRef.current[peerId] = true;
      debugLog('offer:create:deferred', { peerId, signalingState: pc.signalingState });
      return;
    }
    try {
      makingOfferRef.current[peerId] = true;
      debugLog('offer:create:start', { peerId, signalingState: pc.signalingState });
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(offer);
      debugLog('offer:create:success', { peerId, type: pc.localDescription?.type });
      socketRef.current.emit('webrtc:offer', { roomId, toUserId: peerId, offer: pc.localDescription });
    } catch {
      debugLog('offer:create:error', { peerId });
    } finally {
      makingOfferRef.current[peerId] = false;
    }
  }, [roomId]);

  const createPeerConnection = useCallback((userId) => {
    if (peersRef.current[userId]) return peersRef.current[userId];
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    debugLog('pc:create', { peerId: userId });
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0] || null;
      const videoTrack = stream.getVideoTracks()[0] || null;
      if (audioTrack) {
        const sender = pc.addTrack(audioTrack, stream);
        debugLog('pc:addTrack:audio', { peerId: userId, trackId: audioTrack.id, readyState: audioTrack.readyState });
        peerSendersRef.current[userId] = { ...(peerSendersRef.current[userId] || {}), audio: sender };
      }
      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, stream);
        debugLog('pc:addTrack:video', { peerId: userId, trackId: videoTrack.id, readyState: videoTrack.readyState });
        peerSendersRef.current[userId] = { ...(peerSendersRef.current[userId] || {}), video: sender };
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        debugLog('ice:local-candidate', { peerId: userId, type: event.candidate.type });
        socketRef.current.emit('webrtc:ice-candidate', { roomId, toUserId: userId, candidate: event.candidate.toJSON() });
      }
    };

    pc.onnegotiationneeded = async () => {
      debugLog('pc:negotiationneeded', { peerId: userId, signalingState: pc.signalingState });
      requestOfferToPeer(userId, pc);
    };

    pc.onsignalingstatechange = () => {
      debugLog('pc:signalingstate', { peerId: userId, signalingState: pc.signalingState });
      // If we had deferred a renegotiation while not stable, retry now
      if (pc.signalingState === 'stable' && !makingOfferRef.current[userId]) {
        const pending = pendingRenegotiateRef.current[userId];
        if (pending) {
          pendingRenegotiateRef.current[userId] = false;
          requestOfferToPeer(userId, pc);
        }
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      debugLog('pc:ontrack', {
        peerId: userId,
        trackKind: event.track?.kind,
        trackId: event.track?.id,
        streams: event.streams?.length || 0,
      });
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      setRemoteStreams((prev) => ({ ...prev, [userId]: remoteStream }));
    };

    pc.onconnectionstatechange = () => {
      debugLog('pc:connectionstate', {
        peerId: userId,
        connectionState: pc.connectionState,
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
      });
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        delete peersRef.current[userId];
        delete peerSendersRef.current[userId];
        delete makingOfferRef.current[userId];
        delete pendingRenegotiateRef.current[userId];
        delete pendingCandidatesRef.current[userId];
        setRemoteStreams((prev) => { const next = { ...prev }; delete next[userId]; return next; });
      }
    };

    peersRef.current[userId] = pc;
    if (localStreamRef.current) {
      requestOfferToPeer(userId, pc);
    }
    return pc;
  }, [requestOfferToPeer]);

  const loadRoom = useCallback(async () => {
    try {
      setLoading(true);
      const [data, notesData, queueData, breakoutData] = await Promise.all([
        eduMeetService.getRoom(roomId),
        eduMeetService.listNotes(roomId),
        eduMeetService.getHandQueue(roomId),
        eduMeetService.listBreakoutRooms(roomId),
      ]);
      setRoom(data.room);
      setParticipants(normalizeParticipants(data.participants || []));
      setMessages(data.messages || []);
      setPolls(data.polls || []);
      setFiles(data.files || []);
      setRecordings(data.recordings || []);
      setWhiteboardEvents(data.whiteboard_events || []);
      setNotes(notesData || []);
      setHandQueue(queueData || []);
      setBreakoutRooms(breakoutData || []);
      setError('');
    } catch (loadError) {
      const message = loadError?.response?.data?.message || 'Failed to load EduMeet room';
      if (message === 'Join the room first') {
        try {
          await eduMeetService.joinRoom(roomId);
          const [data, notesData, queueData, breakoutData] = await Promise.all([
            eduMeetService.getRoom(roomId),
            eduMeetService.listNotes(roomId),
            eduMeetService.getHandQueue(roomId),
            eduMeetService.listBreakoutRooms(roomId),
          ]);
          setRoom(data.room);
          setParticipants(normalizeParticipants(data.participants || []));
          setMessages(data.messages || []);
          setPolls(data.polls || []);
          setFiles(data.files || []);
          setRecordings(data.recordings || []);
          setWhiteboardEvents(data.whiteboard_events || []);
          setNotes(notesData || []);
          setHandQueue(queueData || []);
          setBreakoutRooms(breakoutData || []);
          setError('');
        } catch (joinError) {
          setError(joinError?.response?.data?.message || message);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, normalizeParticipants]);

  const repairLocalVideoPublish = useCallback(async (reason = 'unknown') => {
    const lkRoom = liveKitRoomRef.current;
    if (!lkRoom || !liveKitConnectedRef.current || !cameraOn) return;

    const now = Date.now();
    if (repairingVideoPublishRef.current || (now - lastVideoRepairAtRef.current) < 2500) return;

    repairingVideoPublishRef.current = true;
    lastVideoRepairAtRef.current = now;
    try {
      console.info(`[EduMeet-VideoRepair] Triggered (${reason})`);
      const publication = Array.from(lkRoom.localParticipant.trackPublications.values()).find((item) => item?.kind === 'video');
      const localVideoTrack = publication?.videoTrack || publication?.track;

      if (localVideoTrack?.restartTrack) {
        await localVideoTrack.restartTrack({
          facingMode: preferredFacingModeRef.current,
        });
        await lkRoom.localParticipant.setCameraEnabled(true, { facingMode: preferredFacingModeRef.current });
      } else {
        await lkRoom.localParticipant.setCameraEnabled(true, { facingMode: preferredFacingModeRef.current });
      }
      console.info('[EduMeet-VideoRepair] Completed');
    } catch (repairError) {
      console.warn('[EduMeet-VideoRepair] Failed', { message: repairError?.message });
    } finally {
      repairingVideoPublishRef.current = false;
    }
  }, [cameraOn]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomId) return undefined;

    const socket = createEduMeetSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setError('');
      socket.emit('meeting:join', { roomId });
      const media = mediaStatusRef.current;
      console.info(
        `[EduMeet-SocketConnect] Joining room with media state: mic=${media.micOn}, camera=${media.cameraOn}`
      );
      socket.emit('media:update', {
        roomId,
        micEnabled: media.micOn,
        cameraEnabled: media.cameraOn,
        lowBandwidthMode: media.lowBandwidthMode,
        audioDeviceLabel: media.selectedAudioDevice,
        videoQuality: media.qualityMode,
      });
    });
    socket.on('connect_error', (connectError) => {
      setError(connectError?.message || 'Realtime connection failed. Retrying...');
    });
    socket.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') {
        setError('Realtime connection interrupted. Reconnecting...');
      }
    });
    socket.on('participant:presence', (nextParticipants) => {
      const safeParticipants = nextParticipants || [];
      const prevById = participantPresenceSnapshotRef.current;
      const nextById = new Map(safeParticipants.map((participant) => [String(participant.user_id), participant]));

      // Joined users + their initial media state.
      nextById.forEach((participant, participantId) => {
        if (prevById.has(participantId)) return;
        const name = `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || `User ${participantId}`;
        const micEnabled = parseMediaFlag(participant.mic_enabled ?? participant.micEnabled, true);
        const cameraEnabled = parseMediaFlag(participant.camera_enabled ?? participant.cameraEnabled, true);
        console.info(
          `[EduMeet-Presence] participant joined id=${participantId} name="${name}" role=${participant.role || 'student'} mic=${micEnabled ? 'on' : 'off'} camera=${cameraEnabled ? 'on' : 'off'} status=${participant.status || 'unknown'}`
        );
        if (String(participantId) !== String(user?.id)) {
          setSuccess(`${name} joined (mic ${micEnabled ? 'on' : 'off'}, camera ${cameraEnabled ? 'on' : 'off'})`);
        }
      });

      // Leave diagnostics.
      prevById.forEach((participant, participantId) => {
        if (nextById.has(participantId)) return;
        const name = `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || `User ${participantId}`;
        console.info(`[EduMeet-Presence] participant left id=${participantId} name="${name}"`);
      });

      // Media state changes (mute/unmute/camera on/off).
      nextById.forEach((participant, participantId) => {
        const previous = prevById.get(participantId);
        if (!previous) return;

        const previousMic = parseMediaFlag(previous.mic_enabled ?? previous.micEnabled, true);
        const nextMic = parseMediaFlag(participant.mic_enabled ?? participant.micEnabled, true);
        const previousCamera = parseMediaFlag(previous.camera_enabled ?? previous.cameraEnabled, true);
        const nextCamera = parseMediaFlag(participant.camera_enabled ?? participant.cameraEnabled, true);
        if (previousMic === nextMic && previousCamera === nextCamera) return;

        const name = `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || `User ${participantId}`;
        console.info(
          `[EduMeet-Presence] media status changed id=${participantId} name="${name}" mic:${previousMic ? 'on' : 'off'}->${nextMic ? 'on' : 'off'} camera:${previousCamera ? 'on' : 'off'}->${nextCamera ? 'on' : 'off'}`
        );
          // If the host externally re-enabled THIS user's mic, clear the lock so they can control their own mic again.
          if (String(participantId) === String(user?.id) && !previousMic && nextMic) {
            setHostMuted(false);
          }
      });

      console.debug('[EduMeet-Debug] participant:presence update', {
        count: safeParticipants.length,
        participants: safeParticipants.map((participant) => ({
          id: participant.user_id,
          name: `${participant.first_name || ''} ${participant.last_name || ''}`.trim(),
          micEnabled: participant.mic_enabled,
          cameraEnabled: participant.camera_enabled,
          role: participant.role,
        })),
      });

      participantPresenceSnapshotRef.current = nextById;
      setParticipants(normalizeParticipants(safeParticipants));
    });
    socket.on('hand:toggle', (payload = {}) => {
      const userId = payload.userId ?? payload.user_id;
      if (!userId) return;
      const raised = Boolean(payload.raised ?? payload.handRaised ?? payload.hand_raised);
      setParticipants((current) => current.map((participant) => (
        String(participant.user_id) === String(userId)
          ? { ...participant, hand_raised: raised }
          : participant
      )));
    });
    socket.on('chat:message', (message) => {
      let added = false;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        added = true;
        return [...current, message];
      });

      const isSelfMessage = String(message?.sender_id ?? message?.user_id ?? '') === String(user?.id);
      if (added && !isSelfMessage && !isChatOpenRef.current) {
        setUnreadCount((count) => count + 1);
      }

      if (added && isChatOpenRef.current && sideTab === 0) {
        window.setTimeout(() => scrollChatToLatest('smooth'), 40);
      }
    });
    socket.on('reaction:received', (reaction) => {
      setReactions((current) => [...current, { ...reaction, id: `${reaction.userId}-${reaction.createdAt}` }]);
      window.setTimeout(() => {
        setReactions((current) => current.filter((item) => item.id !== `${reaction.userId}-${reaction.createdAt}`));
      }, 2200);
    });
    socket.on('poll:new', ({ poll, byUserId }) => {
      if (!poll) return;
      setPolls((current) => [poll, ...current.filter((item) => item.id !== poll.id)]);
      if (String(byUserId) !== String(user?.id)) {
        setSuccess('New poll started');
      }
    });
    socket.on('poll:update', ({ poll }) => {
      if (!poll) return;
      setPolls((current) => current.map((item) => (item.id === poll.id ? { ...item, ...poll } : item)));
    });
    socket.on('poll:end', ({ poll, byUserId }) => {
      if (!poll) return;
      setPolls((current) => current.map((item) => (item.id === poll.id ? { ...item, ...poll, is_active: 0 } : item)));
      if (String(byUserId) !== String(user?.id)) {
        setSuccess('Poll ended');
      }
    });
    socket.on('poll:delete', ({ pollId, byUserId }) => {
      if (!pollId) return;
      setPolls((current) => current.filter((item) => String(item.id) !== String(pollId)));
      if (String(byUserId) !== String(user?.id)) {
        setSuccess('A poll was removed');
      }
    });
    socket.on('whiteboard:draw', ({ stroke }) => {
      setWhiteboardEvents((current) => [...current, { event_type: 'draw', payload: stroke }]);
    });
    socket.on('whiteboard:clear', () => setWhiteboardEvents([]));
    socket.on('hand:queue', ({ roomId: queueRoomId, queue }) => {
      if (String(queueRoomId) !== String(roomId)) return;
      setHandQueue(queue || []);
    });
    socket.on('notes:updated', ({ roomId: notesRoomId, notes: nextNotes }) => {
      if (String(notesRoomId) !== String(roomId)) return;
      setNotes(nextNotes || []);
    });
    socket.on('recording:status', (payload) => {
      setLiveRecordingInfo(payload?.active ? payload : null);
      if (payload?.active) {
        setSuccess(`${payload.firstName || 'Teacher'} started recording.`);
      } else {
        setSuccess(`${payload?.firstName || 'Teacher'} stopped recording.`);
      }
    });
    socket.on('screen-share:status', (payload) => {
      if (payload?.active) {
        setActiveScreenShare(payload);
      } else {
        setActiveScreenShare(null);
      }
    });
    socket.on('participant:muted', ({ roomId: mutedRoomId, userId: mutedUserId }) => {
      if (String(mutedRoomId) !== String(roomId) || String(mutedUserId) !== String(user?.id)) return;
      setMicOn(false);
      localStreamRef.current?.getAudioTracks?.().forEach((track) => {
        track.enabled = false;
      });
      setHostMuted(true);
      pushToast('Host muted your microphone. Only the host can unmute you.', 'warning');
    });

    // Host-level media lock — blocks individual users from toggling mic/camera.
    socket.on('host:locks', ({ micLocked }) => {
      if (micLocked) {
        setHostMuted(true);
        setMicOn(false);
        localStreamRef.current?.getAudioTracks?.().forEach((track) => { track.enabled = false; });
        pushToast('Host has muted all participants.', 'warning');
      } else {
        // Host released the lock — participants can toggle their own mic again.
        setHostMuted(false);
      }
    });

    // Mesh fallback: when LiveKit is unavailable, keep the room functional via legacy signaling.
    socket.on('webrtc:new-peer', ({ userId: peerId }) => {
      if (liveKitConnectedRef.current && !forceMeshFallback) return;
      debugLog('socket:webrtc:new-peer', { peerId });
      createPeerConnection(peerId);
    });

    socket.on('webrtc:existing-peers', (peers) => {
      if (liveKitConnectedRef.current && !forceMeshFallback) return;
      debugLog('socket:webrtc:existing-peers', { count: peers?.length || 0, peers });
      peers.forEach(({ userId: peerId }) => {
        if (!peersRef.current[peerId]) createPeerConnection(peerId);
      });
    });

    socket.on('webrtc:offer', async ({ fromUserId, offer }) => {
      if (liveKitConnectedRef.current && !forceMeshFallback) return;
      debugLog('socket:webrtc:offer:received', { fromUserId, type: offer?.type });
      let pc = peersRef.current[fromUserId];
      if (!pc) pc = createPeerConnection(fromUserId);
      try {
        if (pc.signalingState !== 'stable') {
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingCandidates(fromUserId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        debugLog('socket:webrtc:answer:send', { toUserId: fromUserId, type: pc.localDescription?.type });
        socket.emit('webrtc:answer', { roomId, toUserId: fromUserId, answer: pc.localDescription });
      } catch {
        debugLog('socket:webrtc:offer:handle-error', { fromUserId });
      }
    });

    socket.on('webrtc:answer', async ({ fromUserId, answer }) => {
      if (liveKitConnectedRef.current && !forceMeshFallback) return;
      debugLog('socket:webrtc:answer:received', { fromUserId, type: answer?.type });
      const pc = peersRef.current[fromUserId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingCandidates(fromUserId, pc);
        } catch {
          debugLog('socket:webrtc:answer:handle-error', { fromUserId });
        }
      }
    });

    socket.on('webrtc:ice-candidate', async ({ fromUserId, candidate }) => {
      if (liveKitConnectedRef.current && !forceMeshFallback) return;
      if (!candidate) return;
      let pc = peersRef.current[fromUserId];
      if (!pc) pc = createPeerConnection(fromUserId);
      if (pc.remoteDescription?.type) {
        try {
          debugLog('socket:webrtc:ice:add', { fromUserId, type: candidate?.type || candidate?.candidate?.split(' ')[7] });
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          debugLog('socket:webrtc:ice:add-error', { fromUserId });
        }
      } else {
        debugLog('socket:webrtc:ice:queued', { fromUserId });
        pendingCandidatesRef.current[fromUserId] = [...(pendingCandidatesRef.current[fromUserId] || []), candidate];
      }
    });

    socket.on('webrtc:peer-left', ({ userId: peerId }) => {
      if (liveKitConnectedRef.current && !forceMeshFallback) return;
      const pc = peersRef.current[peerId];
      if (pc) {
        pc.close();
        delete peersRef.current[peerId];
        delete peerSendersRef.current[peerId];
        delete makingOfferRef.current[peerId];
        delete pendingRenegotiateRef.current[peerId];
        delete pendingCandidatesRef.current[peerId];
        setRemoteStreams((prev) => { const next = { ...prev }; delete next[peerId]; return next; });
      }
      setActiveScreenShare((current) => (String(current?.userId) === String(peerId) ? null : current));
    });

    socket.on('meeting:error', ({ message }) => setError(message || 'Meeting error'));

    return () => {
      socket.emit('meeting:leave', { roomId });
      socket.disconnect();
      socketRef.current = null;
      participantPresenceSnapshotRef.current = new Map();
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      peerSendersRef.current = {};
      makingOfferRef.current = {};
      pendingRenegotiateRef.current = {};
      pendingCandidatesRef.current = {};
      screenShareStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      screenShareStreamRef.current = null;
      setLocalScreenShareStream(null);
      setActiveScreenShare(null);
    };
  }, [roomId, user?.id, createPeerConnection, flushPendingCandidates, forceMeshFallback]);

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection?.addEventListener) return undefined;
    const onConnectionChange = () => {
      if (getLowBandwidthHint()) {
        setQualityMode('low');
      }
      updateNetworkQuality();
    };
    connection.addEventListener('change', onConnectionChange);
    onConnectionChange();
    return () => connection.removeEventListener('change', onConnectionChange);
  }, [getLowBandwidthHint, updateNetworkQuality]);

  useEffect(() => {
    let disposed = false;
    let mediaWatchdogTimer = null;

    const rebuildStreams = (lkRoom) => {
      if (!lkRoom || disposed) return;
      const next = {};

      lkRoom.remoteParticipants.forEach((participant, identity) => {
        const stream = new MediaStream();
        participant.trackPublications.forEach((publication) => {
          const mediaTrack = publication.track?.mediaStreamTrack;
          if (mediaTrack) stream.addTrack(mediaTrack);
        });
        if (stream.getTracks().length) {
          next[identity] = stream;
        }
      });

      setRemoteStreams(next);
    };

    const syncLocalPreview = (lkRoom) => {
      if (!lkRoom || disposed) return;
      const stream = new MediaStream();
      lkRoom.localParticipant.trackPublications.forEach((publication) => {
        const mediaTrack = publication.track?.mediaStreamTrack;
        if (mediaTrack) stream.addTrack(mediaTrack);
      });
      if (stream.getTracks().length) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
      }
    };

    const connectLiveKit = async () => {
      try {
        const tokenData = await eduMeetService.getLiveKitToken(roomId);
        if (disposed) return;

        const lkRoom = new LiveKitRoom({
          adaptiveStream: false,
          dynacast: true,
          stopLocalTrackOnUnpublish: false,
          videoCaptureDefaults: {
            facingMode: preferredFacingModeRef.current,
          },
        });

        const refresh = () => {
          lkRoom.remoteParticipants.forEach((participant) => {
            participant.trackPublications.forEach((publication) => {
              if (!publication.isSubscribed) {
                publication.setSubscribed(true);
              }
            });
          });
          rebuildStreams(lkRoom);
          syncLocalPreview(lkRoom);
        };

        lkRoom.on(RoomEvent.ParticipantConnected, refresh);
        lkRoom.on(RoomEvent.ParticipantDisconnected, refresh);
        lkRoom.on(RoomEvent.TrackPublished, refresh);
        lkRoom.on(RoomEvent.TrackSubscribed, refresh);
        lkRoom.on(RoomEvent.TrackUnsubscribed, refresh);
        lkRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          console.info(`[EduMeet-LiveKit] Local track published: kind=${publication?.kind} id=${publication?.track?.mediaStreamTrack?.id}`);
          if (publication?.kind === 'video') {
            ensureMobileFrontCamera(publication, 'local-track-published').catch(() => {});
          }
          refresh();
        });
        lkRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          console.warn(`[EduMeet-LiveKit] Local track UNPUBLISHED: kind=${publication?.kind}`);
          refresh();
        });
        lkRoom.on(RoomEvent.Disconnected, () => {
          console.warn('[EduMeet-LiveKit] Room disconnected unexpectedly');
          if (!disposed) {
            liveKitConnectedRef.current = false;
            setLiveKitConnected(false);
            setRemoteStreams({});
          }
        });
        lkRoom.on(RoomEvent.Reconnected, () => {
          console.info('[EduMeet-LiveKit] Room reconnected — restoring local media');
          const status = mediaStatusRef.current;
          lkRoom.localParticipant
            .setMicrophoneEnabled(status.micOn)
            .catch((e) => console.warn('[EduMeet-LiveKit] Reconnect mic restore failed:', e?.message));
          lkRoom.localParticipant
            .setCameraEnabled(status.cameraOn, status.cameraOn ? { facingMode: preferredFacingModeRef.current } : undefined)
            .catch((e) => console.warn('[EduMeet-LiveKit] Reconnect camera restore failed:', e?.message));
          refresh();
        });

        await lkRoom.connect(tokenData.url, tokenData.token);
        if (disposed) {
          await lkRoom.disconnect();
          return;
        }

        liveKitRoomRef.current = lkRoom;
        // Pre-set the ref so updateMedia's LiveKit guard is active immediately,
        // preventing any queued getUserMedia calls from racing with LK track publishing.
        liveKitConnectedRef.current = true;
        console.info('[EduMeet-LiveKit] Room connected — media enable deferred to reactive effects (single publish)');
        // Calling setLiveKitConnected(true) is the ONLY place we trigger media enable.
        // The reactive useEffects for [micOn, liveKitConnected] and [cameraOn, liveKitConnected]
        // will each fire exactly once and call setMicrophoneEnabled/setCameraEnabled.
        setLiveKitConnected(true);

        // If SFU connects but no remote tracks appear in a room with other participants,
        // automatically switch to mesh fallback so users can still see each other.
        mediaWatchdogTimer = window.setTimeout(() => {
          if (disposed) return;
          const hasOtherParticipants = participantsRef.current.some((p) => String(p.user_id) !== String(user?.id));
          const hasAnyRemoteTrack = Object.values(remoteStreamsRef.current).some((stream) => stream?.getTracks?.().length);
          if (hasOtherParticipants && !hasAnyRemoteTrack) {
            setForceMeshFallback(true);
            setLiveKitConnected(false);
            liveKitConnectedRef.current = false;
            lkRoom.disconnect();
            setSuccess('Switched to compatibility media mode for better reliability.');
          }
        }, 9000);
      } catch (liveKitError) {
        setLiveKitConnected(false);
        setForceMeshFallback(true);
        setMediaError(liveKitError?.message || 'Unable to connect media server');
      }
    };

    connectLiveKit();

    return () => {
      disposed = true;
      const lkRoom = liveKitRoomRef.current;
      liveKitRoomRef.current = null;
      if (mediaWatchdogTimer) {
        window.clearTimeout(mediaWatchdogTimer);
        mediaWatchdogTimer = null;
      }
      if (lkRoom) {
        lkRoom.disconnect();
      }
      setLiveKitConnected(false);
      setRemoteStreams({});
    };
  }, [roomId, user?.id, ensureMobileFrontCamera]);

  useEffect(() => {
    updateNetworkQuality();
  }, [updateNetworkQuality]);

  useEffect(() => {
    const lkRoom = liveKitRoomRef.current;
    if (!lkRoom || !liveKitConnected) return;
    console.info(`[EduMeet-MediaSync] Updating LiveKit microphone enabled=${micOn}`);
    lkRoom.localParticipant.setMicrophoneEnabled(micOn).catch(() => {});
  }, [micOn, liveKitConnected]);

  useEffect(() => {
    const lkRoom = liveKitRoomRef.current;
    if (!lkRoom || !liveKitConnected) return;
    console.info(`[EduMeet-MediaSync] Updating LiveKit camera enabled=${cameraOn}`);
    lkRoom.localParticipant.setCameraEnabled(cameraOn, cameraOn ? { facingMode: preferredFacingModeRef.current } : undefined).catch(() => {});
  }, [cameraOn, liveKitConnected]);

  // Fallback: If local video preview is missing but should exist, try to sync it
  // This handles race conditions where syncLocalPreview might be called before tracks are ready
  useEffect(() => {
    const lkRoom = liveKitRoomRef.current;
    if (!lkRoom || !liveKitConnected || !cameraOn) return;
    
    const hasLocalVideoTrack = localStream?.getVideoTracks?.().some((track) => track.readyState === 'live');
    
    // If user has camera enabled but no live video in preview, try to sync now
    if (!hasLocalVideoTrack) {
      console.warn('[EduMeet-LocalPreview] Local video preview not found, attempting to sync now');
      const stream = new MediaStream();
      lkRoom.localParticipant.trackPublications.forEach((publication) => {
        const mediaTrack = publication.track?.mediaStreamTrack;
        if (mediaTrack) stream.addTrack(mediaTrack);
      });
      if (stream.getTracks().length) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
        console.info('[EduMeet-LocalPreview] Local preview synced via fallback mechanism');
      } else {
        console.warn('[EduMeet-LocalPreview] Fallback sync found no tracks yet');
      }
    }
  }, [cameraOn, liveKitConnected, localStream]);

  useEffect(() => {
    liveKitConnectedRef.current = liveKitConnected;
  }, [liveKitConnected]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  useEffect(() => {
    mediaStatusRef.current = {
      micOn,
      cameraOn,
      qualityMode,
      selectedAudioDevice,
      lowBandwidthMode: Boolean(room?.low_bandwidth_mode || qualityMode === 'low'),
    };
  }, [micOn, cameraOn, qualityMode, selectedAudioDevice, room?.low_bandwidth_mode]);

  useEffect(() => {
    if (!liveKitConnected) return;
    const lkRoom = liveKitRoomRef.current;
    if (!lkRoom) return;

    const timer = window.setTimeout(() => {
      const publications = Array.from(lkRoom.localParticipant?.trackPublications?.values?.() || []);
      const hasLocalAudio = publications.some((publication) => publication?.kind === 'audio' && publication?.track?.mediaStreamTrack?.readyState === 'live');
      const hasLocalVideo = publications.some((publication) => publication?.kind === 'video' && publication?.track?.mediaStreamTrack?.readyState === 'live');

        // Read intent from ref to avoid having micOn/cameraOn in deps (which fires a new timer on every toggle)
        const status = mediaStatusRef.current;
        if (status.micOn && !hasLocalAudio) {
          console.info('[EduMeet-Watchdog] Mic track missing 2s after connect, re-enabling');
          lkRoom.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        }
        if (status.cameraOn && !hasLocalVideo) {
          console.info('[EduMeet-Watchdog] Camera track missing 2s after connect, re-enabling');
          lkRoom.localParticipant.setCameraEnabled(true, { facingMode: preferredFacingModeRef.current }).catch(() => {});
        }
      }, 2000);

    return () => window.clearTimeout(timer);
    }, [liveKitConnected]); // Only fires once per connect/disconnect — not on every mic/cam toggle

  useEffect(() => {
    if (!forceMeshFallback) {
      meshFallbackRejoinSentRef.current = false;
      return;
    }
    const socket = socketRef.current;
    if (!socket) return;

    // Re-bootstrap legacy signaling path exactly once when switching to mesh mode.
    if (!meshFallbackRejoinSentRef.current) {
      socket.emit('meeting:join', { roomId });
      meshFallbackRejoinSentRef.current = true;
    }
  }, [forceMeshFallback, roomId]);

  // Trigger local media capture exactly ONCE when first switching to mesh fallback.
  // This must NOT depend on `participants` — doing so would cause setMediaRefreshKey to
  // increment on every participant:presence event, creating an infinite updateMedia loop.
  useEffect(() => {
    if (!forceMeshFallback) return;
    setMediaRefreshKey((value) => value + 1);
  }, [forceMeshFallback]);

  // Establish / re-negotiate peer connections whenever participants change in mesh mode.
  // createPeerConnection already attaches tracks from localStreamRef.current, so no media
  // refresh is needed here — the initial refresh above already ran when mesh mode started.
  useEffect(() => {
    if (!forceMeshFallback) return;
    participants
      .filter((participant) => String(participant.user_id) !== String(user?.id))
      .forEach((participant) => {
        const peerId = participant.user_id;
        if (!peersRef.current[peerId]) {
          createPeerConnection(peerId);
        } else {
          requestOfferToPeer(peerId, peersRef.current[peerId]);
        }
      });
  }, [forceMeshFallback, roomId, participants, user?.id, createPeerConnection, requestOfferToPeer]);

  useEffect(() => {
    let cancelled = false;
    const loadDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const inputs = devices.filter((device) => device.kind === 'audioinput');
        setAudioInputDevices(inputs);
        if (!selectedAudioDevice && inputs[0]) {
          setSelectedAudioDevice(inputs[0].label || inputs[0].deviceId);
        }
      } catch {
        // ignore device enumeration failures
      }
    };
    loadDevices();
    return () => {
      cancelled = true;
    };
  }, [selectedAudioDevice]);

  useEffect(() => {
    let disposed = false;
    const updateMedia = async () => {
      debugLog('media:update:start', { cameraOn, micOn, qualityMode });
      console.info(
        `[EduMeet-UpdateMedia] Starting media update: mic=${micOn}, camera=${cameraOn}, qualityMode=${qualityMode}, hasLocalStream=${!!localStreamRef.current}`
      );

      // When LiveKit is active, avoid running local getUserMedia/track replacement logic.
      // LiveKit owns publishing in this mode, and duplicate capture paths can stop tracks.
      if (liveKitConnectedRef.current && !forceMeshFallback) {
        prevMediaStateRef.current = { micOn, cameraOn, qualityMode };
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) return;
      const previousState = prevMediaStateRef.current;
      const previousStream = localStreamRef.current;
      const previousVideoTrack = previousStream?.getVideoTracks?.()[0] || null;
      const previousAudioTrack = previousStream?.getAudioTracks?.()[0] || null;
      const micToggledOnly = previousState.cameraOn === cameraOn && previousState.qualityMode === qualityMode && previousState.micOn !== micOn;

      if (!cameraOn && !micOn) {
        debugLog('media:update:disable-all');
        Object.entries(peersRef.current).forEach(([peerId, pc]) => {
          if (pc.signalingState === 'closed') return;
          const senderEntry = peerSendersRef.current[peerId] || {};
          const audioSender = senderEntry.audio || getSenderByKind(pc, 'audio');
          const videoSender = senderEntry.video || getSenderByKind(pc, 'video');

          if (audioSender) {
            audioSender.replaceTrack(null).catch(() => {});
            debugLog('media:sender:audio:null', { peerId });
            peerSendersRef.current[peerId] = { ...(peerSendersRef.current[peerId] || {}), audio: audioSender };
          }
          if (videoSender) {
            videoSender.replaceTrack(null).catch(() => {});
            debugLog('media:sender:video:null', { peerId });
            peerSendersRef.current[peerId] = { ...(peerSendersRef.current[peerId] || {}), video: videoSender };
          }
          requestOfferToPeer(peerId, pc);
        });

        localStreamRef.current = null;
        setLocalStream((current) => {
          current?.getTracks().forEach((track) => track.stop());
          return null;
        });
        if (videoRef.current) videoRef.current.srcObject = null;
        prevMediaStateRef.current = { micOn, cameraOn, qualityMode };
        return;
      }

      try {
        const preferLowBandwidth = qualityMode === 'low' || getLowBandwidthHint();

        if (micToggledOnly && cameraOn && previousVideoTrack && previousVideoTrack.readyState === 'live') {
          let nextAudioTrack = previousAudioTrack;

          if (!micOn && previousAudioTrack) {
            previousAudioTrack.enabled = false;
          }

          if (micOn && previousAudioTrack) {
            previousAudioTrack.enabled = true;
          }

          if (micOn && !previousAudioTrack) {
            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            if (disposed) {
              audioOnlyStream.getTracks().forEach((track) => track.stop());
              return;
            }
            nextAudioTrack = audioOnlyStream.getAudioTracks()[0] || null;
            if (nextAudioTrack && previousStream) {
              previousStream.addTrack(nextAudioTrack);
            }
          }

          localStreamRef.current = previousStream || null;
          if (previousStream) {
            setLocalStream(previousStream);
            if (videoRef.current) videoRef.current.srcObject = previousStream;
          }

          Object.entries(peersRef.current).forEach(([peerId, pc]) => {
            if (pc.signalingState === 'closed') return;
            const senderEntry = peerSendersRef.current[peerId] || {};
            let audioSender = senderEntry.audio || getSenderByKind(pc, 'audio');
            const videoSender = senderEntry.video || getSenderByKind(pc, 'video');

            if (!audioSender && nextAudioTrack) {
              audioSender = pc.addTrack(nextAudioTrack, previousStream || localStreamRef.current);
            }
            if (audioSender && nextAudioTrack) {
              audioSender.replaceTrack(nextAudioTrack).catch(() => {});
            }
            if (videoSender) videoSender.replaceTrack(previousVideoTrack).catch(() => {});

            peerSendersRef.current[peerId] = {
              ...(peerSendersRef.current[peerId] || {}),
              audio: audioSender || null,
              video: videoSender || null,
            };

            applySenderQualityProfile(pc, preferLowBandwidth);
            requestOfferToPeer(peerId, pc);
          });

          setMediaError('');
          prevMediaStateRef.current = { micOn, cameraOn, qualityMode };
          return;
        }

        console.debug('[EduMeet-Debug] getUserMedia starting', { cameraOn, micOn, qualityMode });
        const preferredConstraints = {
          audio: micOn,
          video: cameraOn
            ? {
              facingMode: { ideal: preferredFacingModeRef.current },
              width: { ideal: preferLowBandwidth ? 480 : 1280 },
              height: { ideal: preferLowBandwidth ? 270 : 720 },
              frameRate: { ideal: preferLowBandwidth ? 12 : 24, max: preferLowBandwidth ? 15 : 30 },
            }
            : false,
        };

        console.info(
          `[EduMeet-GetUserMedia] Requesting constraints: mic=${micOn}, camera=${cameraOn}, facingMode=${preferredFacingModeRef.current}, resolution=${preferLowBandwidth ? '480p' : '1280p'}`
        );
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
        } catch (preferredError) {
          // Fallback to broad constraints for devices that reject the preferred profile.
          console.warn('[EduMeet-Debug] preferred getUserMedia failed, retrying fallback', { message: preferredError?.message });
          stream = await navigator.mediaDevices.getUserMedia({
            audio: micOn,
            video: cameraOn ? { facingMode: { ideal: preferredFacingModeRef.current } } : false,
          });
        }
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          console.debug('[EduMeet-Debug] getUserMedia disposed, stopping tracks');
          return;
        }
        console.info(
          `[EduMeet-GetUserMediaSuccess] Got stream with ${stream.getAudioTracks().length} audio track(s), ${stream.getVideoTracks().length} video track(s)`
        );
        console.debug('[EduMeet-Debug] getUserMedia success', {
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          audioTrackState: stream.getAudioTracks()[0]?.readyState,
          videoTrackState: stream.getVideoTracks()[0]?.readyState,
        });
        debugLog('media:update:stream-ready', {
          audioTracks: stream.getAudioTracks().map((t) => ({ id: t.id, enabled: t.enabled, state: t.readyState })),
          videoTracks: stream.getVideoTracks().map((t) => ({ id: t.id, enabled: t.enabled, state: t.readyState })),
        });
        setMediaError('');
        localStreamRef.current = stream;
        setLocalStream((current) => {
          current?.getTracks().forEach((track) => track.stop());
          return stream;
        });
        if (previousStream && previousStream !== stream) {
          previousStream.getTracks().forEach((track) => track.stop());
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Update tracks in any existing peer connections
        Object.entries(peersRef.current).forEach(([peerId, pc]) => {
          if (pc.signalingState !== 'closed') {
            const nextAudioTrack = stream.getAudioTracks()[0] || null;
            const nextVideoTrack = stream.getVideoTracks()[0] || null;

            const senderEntry = peerSendersRef.current[peerId] || {};
            let audioSender = senderEntry.audio || getSenderByKind(pc, 'audio');
            let videoSender = senderEntry.video || getSenderByKind(pc, 'video');

            if (!audioSender && nextAudioTrack) {
              audioSender = pc.addTrack(nextAudioTrack, stream);
              console.info(`[EduMeet-AddTrack] Added audio track to peer ${peerId}`);
            }
            if (!videoSender && nextVideoTrack) {
              videoSender = pc.addTrack(nextVideoTrack, stream);
              console.info(`[EduMeet-AddTrack] Added video track to peer ${peerId}`);
            }

            if (audioSender) {
              audioSender.replaceTrack(nextAudioTrack).catch(() => {});
              debugLog('media:sender:audio:replace', { peerId, hasTrack: Boolean(nextAudioTrack) });
            }

            if (videoSender) {
              videoSender.replaceTrack(nextVideoTrack).catch(() => {});
              debugLog('media:sender:video:replace', { peerId, hasTrack: Boolean(nextVideoTrack) });
              console.info(`[EduMeet-Replace] Replaced video track for peer ${peerId}: hasTrack=${Boolean(nextVideoTrack)}`);
            }

            peerSendersRef.current[peerId] = {
              ...(peerSendersRef.current[peerId] || {}),
              audio: audioSender || null,
              video: videoSender || null,
            };

            applySenderQualityProfile(pc, preferLowBandwidth);
            requestOfferToPeer(peerId, pc);
          }
        });
        prevMediaStateRef.current = { micOn, cameraOn, qualityMode };
      } catch (streamError) {
        debugLog('media:update:error', { message: streamError?.message, name: streamError?.name });
        console.error('[EduMeet-Debug] getUserMedia failed', { message: streamError?.message, cameraOn, micOn, qualityMode });
        const liveKitLocalTracks = liveKitRoomRef.current?.localParticipant?.trackPublications
          ? Array.from(liveKitRoomRef.current.localParticipant.trackPublications.values())
          : [];
        const hasActiveLiveKitLocalMedia = liveKitLocalTracks.some((publication) => {
          const mediaTrack = publication?.track?.mediaStreamTrack;
          return mediaTrack && mediaTrack.readyState === 'live';
        });

        // If LiveKit already has active local tracks, suppress noisy getUserMedia warnings.
        if (liveKitConnectedRef.current && hasActiveLiveKitLocalMedia) {
          setMediaError('');
          return;
        }

        const messageByErrorName = {
          NotAllowedError: 'Camera or microphone permission is blocked in your browser settings.',
          PermissionDeniedError: 'Camera or microphone permission is blocked in your browser settings.',
          NotFoundError: 'No camera or microphone was found. Check device connections and OS input settings.',
          DevicesNotFoundError: 'No camera or microphone was found. Check device connections and OS input settings.',
          NotReadableError: 'Camera or microphone is currently busy in another app. Close other apps and retry.',
          TrackStartError: 'Camera or microphone could not start. Try reselecting the device and rejoining.',
          OverconstrainedError: 'Selected camera profile is not supported. Switching quality or device can help.',
        };

        setMediaError(messageByErrorName[streamError?.name] || streamError?.message || 'Unable to access microphone or camera');
        prevMediaStateRef.current = { micOn, cameraOn, qualityMode };
      }
    };

    updateMedia();
    return () => {
      disposed = true;
    };
  // NOTE: forceMeshFallback is intentionally omitted from deps — the LiveKit guard in
  // updateMedia reads liveKitConnectedRef.current (a ref, always fresh). Re-running on
  // forceMeshFallback would cause a duplicate getUserMedia call alongside the dedicated
  // setMediaRefreshKey effect that already handles the mesh-mode initial media capture.
  }, [cameraOn, micOn, qualityMode, mediaRefreshKey, getLowBandwidthHint, applySenderQualityProfile, requestOfferToPeer, getSenderByKind]);

  useEffect(() => () => {
    // LiveKit owns the underlying MediaStreamTrack objects — syncLocalPreview wraps them in
    // new MediaStream containers but the tracks are the same shared references.
    // Stopping them here while LK is active kills the live camera/mic at the hardware level.
    // LK calls stopLocalTrack internally when setCameraEnabled(false) or on disconnect.
    if (liveKitConnectedRef.current) return;
    localStream?.getTracks().forEach((track) => track.stop());
  }, [localStream]);

  useEffect(() => {
    if (!isRecording || !recordingStartedAtRef.current) return undefined;
    const timer = window.setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!socketRef.current || !roomId) return;
    console.info(
      `[EduMeet-MediaUpdate] Emitting media update to server: mic=${micOn}, camera=${cameraOn}, quality=${qualityMode}, bandwidth=${room?.low_bandwidth_mode || qualityMode === 'low'}`
    );
    socketRef.current.emit('media:update', {
      roomId,
      micEnabled: micOn,
      cameraEnabled: cameraOn,
      lowBandwidthMode: room?.low_bandwidth_mode || qualityMode === 'low',
      audioDeviceLabel: selectedAudioDevice,
      videoQuality: qualityMode,
    });
  }, [roomId, micOn, cameraOn, qualityMode, selectedAudioDevice, room?.low_bandwidth_mode]);

  const sendReaction = (emoji) => {
    socketRef.current?.emit('reaction:send', { roomId, emoji });
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    setParticipants((current) => current.map((participant) => (
      String(participant.user_id) === String(user?.id)
        ? { ...participant, hand_raised: next }
        : participant
    )));
    socketRef.current?.emit('hand:toggle', { roomId, raised: next });
  };

  const handleExitRoom = useCallback(() => {
    socketRef.current?.emit('meeting:leave', { roomId });
    socketRef.current?.disconnect();
    socketRef.current = null;
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    makingOfferRef.current = {};
    pendingCandidatesRef.current = {};
    localStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    setLocalStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    navigate('/edumeet');
  }, [navigate, roomId]);

  const handleWhiteboardDraw = (stroke) => {
    setWhiteboardEvents((current) => [...current, { event_type: 'draw', payload: stroke }]);
    socketRef.current?.emit('whiteboard:draw', { roomId, stroke });
  };

  const handleWhiteboardClear = () => {
    setWhiteboardEvents([]);
    socketRef.current?.emit('whiteboard:clear', { roomId });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const payload = { content: messageText.trim(), recipient_id: recipientId || null };
    try {
      if (socketRef.current) {
        socketRef.current.emit('chat:send', { roomId, content: payload.content, recipientId: payload.recipient_id || null });
      } else {
        const response = await eduMeetService.sendMessage(roomId, payload);
        if (response.message) {
          setMessages((current) => [...current, response.message]);
        }
      }
      setMessageText('');
    } catch (sendError) {
      setError(sendError?.response?.data?.message || 'Failed to send message');
    }
  };

  const handleToggleScreenShare = async () => {
    const stopShare = () => {
      screenShareStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      screenShareStreamRef.current = null;
      setLocalScreenShareStream(null);
      setScreenSharing(false);
      setActiveScreenShare((current) => (String(current?.userId) === String(user?.id) ? null : current));
      socketRef.current?.emit('screen-share:status', { roomId, active: false });

      const localVideoTrack = localStreamRef.current?.getVideoTracks?.()?.[0] || null;
      Object.values(peersRef.current).forEach((pc) => {
        const sender = getSenderByKind(pc, 'video');
        if (sender) sender.replaceTrack(localVideoTrack).catch(() => {});
      });
    };

    if (screenSharing) {
      stopShare();
      return;
    }
    try {
      if (navigator.mediaDevices?.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];
        if (!screenTrack) throw new Error('No screen track found');
        screenTrack.contentHint = 'detail';
        screenTrack.applyConstraints?.({ frameRate: { ideal: 24, max: 30 } }).catch(() => {});

        screenShareStreamRef.current = stream;
        setLocalScreenShareStream(stream);
        stream.getTracks().forEach((track) => {
          track.onended = () => stopShare();
        });

        Object.values(peersRef.current).forEach((pc) => {
          const sender = getSenderByKind(pc, 'video');
          if (sender) sender.replaceTrack(screenTrack).catch(() => {});
        });

        setScreenSharing(true);
        setActiveScreenShare({ roomId, active: true, userId: user?.id, firstName: user?.first_name, lastName: user?.last_name });
        socketRef.current?.emit('screen-share:status', { roomId, active: true });
      }
    } catch (screenError) {
      setError(screenError?.message || 'Screen share could not be started');
    }
  };

  const handleHostMuteParticipant = useCallback(async (targetUserId) => {
    if (!isManager || String(targetUserId) === String(user?.id)) return;
    socketRef.current?.emit('participant:mute', { roomId, targetUserId });
    setParticipants((current) => current.map((participant) => (
      String(participant.user_id) === String(targetUserId)
        ? { ...participant, mic_enabled: 0, micEnabled: 0 }
        : participant
    )));
    setSuccess('Participant muted.');
  }, [isManager, roomId, user?.id]);

  const handleQueueAction = useCallback(async (targetUserId, action) => {
    if (!isManager) return;
    socketRef.current?.emit('hand:queue:update', { roomId, userId: targetUserId, action });
    try {
      await eduMeetService.updateHandQueue(roomId, targetUserId, action);
      const updatedQueue = await eduMeetService.getHandQueue(roomId);
      setHandQueue(updatedQueue || []);
      if (action === 'accept') {
        setSuccess('Participant accepted to speak and spotlighted.');
      }
    } catch (queueError) {
      setError(queueError?.response?.data?.message || 'Failed to update hand queue');
    }
  }, [isManager, roomId]);

  const handleCreateNote = useCallback(async () => {
    const text = noteDraft.trim();
    if (!text) return;
    try {
      socketRef.current?.emit('notes:create', { roomId, noteText: text });
      const data = await eduMeetService.createNote(roomId, { note_text: text });
      if (data?.note) {
        setNotes((current) => [...current, data.note]);
      }
      setNoteDraft('');
    } catch (noteError) {
      setError(noteError?.response?.data?.message || 'Failed to save note');
    }
  }, [noteDraft, roomId]);

  const handlePinNote = useCallback(async (note) => {
    try {
      socketRef.current?.emit('notes:update', { roomId, noteId: note.id, pinned: !Boolean(note.pinned) });
      const data = await eduMeetService.updateNote(roomId, note.id, { pinned: !Boolean(note.pinned), note_text: note.note_text });
      if (data?.note) {
        setNotes((current) => current.map((item) => (item.id === note.id ? data.note : item)));
      }
    } catch (noteError) {
      setError(noteError?.response?.data?.message || 'Failed to update note');
    }
  }, [roomId]);

  const handleDeleteNote = useCallback(async (noteId) => {
    try {
      socketRef.current?.emit('notes:delete', { roomId, noteId });
      await eduMeetService.deleteNote(roomId, noteId);
      setNotes((current) => current.filter((item) => item.id !== noteId));
    } catch (noteError) {
      setError(noteError?.response?.data?.message || 'Failed to delete note');
    }
  }, [roomId]);

  const handleSaveMessageAsNote = useCallback(async (message) => {
    if (!message?.content?.trim()) return;
    try {
      socketRef.current?.emit('notes:create', { roomId, noteText: message.content.trim(), sourceMessageId: message.id });
      const data = await eduMeetService.createNote(roomId, {
        note_text: message.content.trim(),
        source_message_id: message.id,
      });
      if (data?.note) {
        setNotes((current) => [...current, data.note]);
      }
      setSuccess('Message saved as note.');
    } catch (noteError) {
      setError(noteError?.response?.data?.message || 'Failed to save message as note');
    }
  }, [roomId]);

  const handleCreateBreakout = useCallback(async () => {
    const title = newBreakoutTitle.trim();
    if (!title || !isManager) return;
    try {
      await eduMeetService.createBreakoutRoom(roomId, title);
      setNewBreakoutTitle('');
      const next = await eduMeetService.listBreakoutRooms(roomId);
      setBreakoutRooms(next || []);
      setSuccess('Breakout room created.');
    } catch (breakoutError) {
      setError(breakoutError?.response?.data?.message || 'Failed to create breakout room');
    }
  }, [isManager, newBreakoutTitle, roomId]);

  const handleAssignParticipantToBreakout = useCallback(async (targetUserId) => {
    if (!isManager || !selectedBreakoutRoomId) return;
    try {
      await eduMeetService.assignToBreakoutRoom(roomId, Number(selectedBreakoutRoomId), [targetUserId]);
      setSuccess('Participant assigned to breakout room.');
      const next = await eduMeetService.listBreakoutRooms(roomId);
      setBreakoutRooms(next || []);
    } catch (breakoutError) {
      setError(breakoutError?.response?.data?.message || 'Failed to assign participant');
    }
  }, [isManager, roomId, selectedBreakoutRoomId]);

  const handleCloseBreakout = useCallback(async (breakoutRoomId) => {
    if (!isManager) return;
    try {
      await eduMeetService.closeBreakoutRoom(roomId, breakoutRoomId);
      const next = await eduMeetService.listBreakoutRooms(roomId);
      setBreakoutRooms(next || []);
      setSuccess('Breakout room closed.');
    } catch (breakoutError) {
      setError(breakoutError?.response?.data?.message || 'Failed to close breakout room');
    }
  }, [isManager, roomId]);

  const refreshDashboardData = async () => {
    try {
      const [participantData, pollData, fileData, recordingData, notesData, queueData, breakoutData] = await Promise.all([
        eduMeetService.getParticipants(roomId),
        eduMeetService.getPolls(roomId),
        eduMeetService.listFiles(roomId),
        eduMeetService.listRecordings(roomId),
        eduMeetService.listNotes(roomId),
        eduMeetService.getHandQueue(roomId),
        eduMeetService.listBreakoutRooms(roomId),
      ]);
      setParticipants(normalizeParticipants(participantData));
      setPolls(pollData);
      setFiles(fileData);
      setRecordings(recordingData);
      setNotes(notesData || []);
      setHandQueue(queueData || []);
      setBreakoutRooms(breakoutData || []);
    } catch {
      // leave current state in place
    }
  };

  const stopTracks = (stream) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const uploadRecordingBlob = async (blob) => {
    if (!blob || blob.size === 0) return;
    try {
      setRecordingStatus('Uploading recording...');
      const durationSeconds = Math.max(1, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      const title = `${room?.title ?? 'Recording'} ${new Date().toLocaleString()}`;
      const data = await eduMeetService.uploadRecording(roomId, blob, {
        title,
        durationSeconds,
        mimeType: blob.type || 'video/webm',
      });
      setRecordings((current) => [data.recording, ...current]);
      setSuccess('Recording saved. Playback will auto-delete after 24 hours.');
    } catch (uploadError) {
      setError(uploadError?.response?.data?.message || uploadError?.message || 'Failed to upload recording');
    } finally {
      setRecordingStatus('');
      recordingStartedAtRef.current = null;
      setRecordingElapsed(0);
    }
  };

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    const recorder = recorderRef.current;
    recorderRef.current = null;
    setIsRecording(false);
    socketRef.current?.emit('recording:status', { roomId, active: false, title: room?.title ?? '' });

    await new Promise((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        recordingChunksRef.current = [];
        stopTracks(recordingStreamRef.current);
        recordingStreamRef.current = null;
        await uploadRecordingBlob(blob);
        resolve();
      };
      recorder.stop();
    });
  }, [room?.title, roomId]);

  const startRecording = async () => {
    if (!isManager || !room.recording_enabled) {
      setError('Enable recording for this session to start capturing.');
      return;
    }

    if (!window.MediaRecorder || !navigator.mediaDevices?.getDisplayMedia) {
      setError('This browser does not support session recording.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const tracks = [...displayStream.getVideoTracks()];
      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length) {
        tracks.push(...displayAudioTracks);
      } else if (micOn && localStream?.getAudioTracks()?.length) {
        tracks.push(localStream.getAudioTracks()[0]);
      }

      const recordingStream = new MediaStream(tracks);
      const recorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });
      recordingChunksRef.current = [];
      recordingStreamRef.current = recordingStream;
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      displayStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (recorderRef.current) {
            stopRecording();
          }
        };
      });

      recorder.start(1000);
      recorderRef.current = recorder;
      setRecordingStatus('Recording in progress');
      setIsRecording(true);
      socketRef.current?.emit('recording:status', { roomId, active: true, title: room?.title ?? '' });
      setSuccess('Recording started. Stop it when the class is finished.');
    } catch (recordError) {
      setError(recordError?.message || 'Failed to start recording');
    }
  };

  const startChatDrag = (e) => {
    const origX = chatPos.x;
    const origY = chatPos.y;
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (me) => {
      setChatPos({
        x: Math.max(0, Math.min(window.innerWidth - 360, origX + (me.clientX - startX))),
        y: Math.max(0, Math.min(window.innerHeight - 60, origY + (me.clientY - startY))),
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const handleDownloadRecording = async (recording) => {
    try {
      await eduMeetService.downloadRecording(recording.id, `${recording.title || 'edumeet-recording'}.webm`);
    } catch (downloadError) {
      setError(downloadError?.response?.data?.message || downloadError?.message || 'Failed to download recording');
    }
  };

  const handleManagerAction = async (action) => {
    try {
      setActionLoading(true);
      if (action === 'mute-all') await eduMeetService.muteAllParticipants(roomId);
      if (action === 'attendance') await eduMeetService.markAttendance(roomId);
      if (action === 'start') await eduMeetService.startRoom(roomId);
      if (action === 'end') await eduMeetService.endRoom(roomId);
      await loadRoom();
      setSuccess('Session updated.');
    } catch (actionError) {
      setError(actionError?.response?.data?.message || 'Failed to update session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSpotlight = async (targetUserId) => {
    try {
      await eduMeetService.spotlightParticipant(roomId, targetUserId);
      await refreshDashboardData();
    } catch (spotlightError) {
      setError(spotlightError?.response?.data?.message || 'Failed to spotlight participant');
    }
  };

  const handleRemoveParticipant = async (targetUserId) => {
    try {
      await eduMeetService.removeParticipant(roomId, targetUserId);
      await refreshDashboardData();
    } catch (removeError) {
      setError(removeError?.response?.data?.message || 'Failed to remove participant');
    }
  };

  const handleCreatePoll = async ({ question, options, correctOption }) => {
    try {
      setActionLoading(true);
      const data = await eduMeetService.createPoll(roomId, { question, options, correctOption });
      setPolls((current) => [data.poll, ...current.filter((item) => item.id !== data.poll.id)]);
      socketRef.current?.emit('poll:new', { roomId, poll: data.poll });
      setPollOpen(false);
      setSuccess('New poll started');
    } catch (pollError) {
      setError(pollError?.response?.data?.message || 'Failed to create poll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondToPoll = async (pollId, selectedOption) => {
    try {
      const data = await eduMeetService.respondToPoll(pollId, selectedOption);
      setPolls((current) => current.map((poll) => (poll.id === pollId ? data.poll : poll)));
      socketRef.current?.emit('poll:update', { roomId, poll: data.poll });
    } catch (pollError) {
      setError(pollError?.response?.data?.message || 'Failed to submit poll response');
    }
  };

  const handleEndPoll = async (pollId) => {
    try {
      const data = await eduMeetService.endPoll(pollId);
      if (data?.poll) {
        setPolls((current) => current.map((poll) => (poll.id === pollId ? data.poll : poll)));
        socketRef.current?.emit('poll:end', { roomId, poll: data.poll });
      }
      setSuccess('Poll ended');
    } catch (pollError) {
      setError(pollError?.response?.data?.message || 'Failed to end poll');
    }
  };

  const handleDeletePoll = async (pollId) => {
    try {
      await eduMeetService.deletePoll(pollId);
      setPolls((current) => current.filter((poll) => poll.id !== pollId));
      socketRef.current?.emit('poll:delete', { roomId, pollId });
      setSuccess('Poll deleted');
    } catch (pollError) {
      setError(pollError?.response?.data?.message || 'Failed to delete poll');
    }
  };

  const handleShareFile = async (payload) => {
    try {
      setActionLoading(true);
      const data = await eduMeetService.shareFile(roomId, payload);
      setFiles(data.files || []);
      setFileOpen(false);
    } catch (fileError) {
      setError(fileError?.response?.data?.message || 'Failed to share file');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!room) {
    return (
      <Layout>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'EduMeet room not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/edumeet')}>Back to EduMeet</Button>
      </Layout>
    );
  }

  return (
    <Layout disablePadding hideSidebar>
      <Box
        sx={{
          height: '100dvh',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: ui.textPrimary,
          position: 'relative',
          fontFamily: "'Space Grotesk', 'Manrope', 'Segoe UI', sans-serif",
          backgroundColor: ui.bgPrimary,
          backgroundImage: darkMode
            ? 'radial-gradient(circle at 14% 10%, rgba(96,165,250,0.18), transparent 42%), radial-gradient(circle at 86% 20%, rgba(74,222,128,0.14), transparent 40%), linear-gradient(150deg, #0f172a 0%, #111827 58%, #0b1220 100%)'
            : 'radial-gradient(circle at 12% 12%, rgba(37,99,235,0.14), transparent 42%), radial-gradient(circle at 82% 18%, rgba(14,165,233,0.12), transparent 40%), linear-gradient(160deg, #eef4ff 0%, #f8fbff 56%, #edf5ff 100%)',
        }}
      >
        {/* ── Toast Notifications ── */}
        <Box sx={{ position: 'fixed', top: isMobile ? 56 : 72, right: isMobile ? 8 : 16, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 1, pointerEvents: 'none', width: isMobile ? 'calc(100vw - 16px)' : 340 }}>
          {toasts.map((t) => (
            <Alert
              key={t.id}
              severity={t.severity}
              sx={{ pointerEvents: 'auto', borderRadius: 2, fontSize: '0.82rem', py: 0.4, px: 1.25, boxShadow: '0 4px 18px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', animation: 'slideInRight 200ms ease' }}
              onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              {t.message}
            </Alert>
          ))}
        </Box>

        {/* ── Compact Header ── */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            flexShrink: 0,
            height: isMobile ? 48 : 52,
            px: isMobile ? 1 : 2,
            borderBottom: `1px solid ${ui.borderSubtle}`,
            bgcolor: ui.bgGlass,
            backdropFilter: 'blur(12px)',
            zIndex: 100,
          }}
        >
          <IconButton size="small" onClick={() => navigate('/edumeet')} sx={{ color: ui.textPrimary }}>
            <ArrowBack sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            noWrap
            sx={{ flex: 1, color: ui.textPrimary, fontSize: isMobile ? '0.85rem' : '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {room.title}
          </Typography>
          <Chip
            icon={<People sx={{ fontSize: '0.9rem !important' }} />}
            label={participants.length}
            size="small"
            sx={{ height: 22, fontSize: '0.72rem', bgcolor: darkMode ? 'rgba(96,165,250,0.18)' : '#dbeafe', color: darkMode ? '#dbeafe' : '#1e3a8a' }}
          />
          {liveRecordingInfo?.active && (
            <Chip icon={<RadioButtonChecked sx={{ fontSize: '0.8rem !important', color: '#ef4444 !important' }} />} label="REC" size="small" sx={{ height: 22, bgcolor: 'rgba(239,68,68,0.18)', color: '#fca5a5', fontSize: '0.68rem' }} />
          )}
          <IconButton size="small" onClick={() => setDarkMode((v) => !v)} sx={{ color: ui.textSecondary, p: 0.5 }}>
            {darkMode ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
          </IconButton>
          {!isMobile && (
            <Tooltip title="Exit room">
              <IconButton size="small" onClick={handleExitRoom} sx={{ color: ui.dangerRed, p: 0.5 }}>
                <Logout sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* ── Main Content Area ── */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', position: 'relative' }}>

          {/* ── Video Stage ── */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              position: 'relative',
              pb: isMobile ? '72px' : '80px', // leave room for bottom control bar
              transition: 'padding-right 240ms ease',
              pr: (!isMobile && isChatOpen) ? `${meetingPanelWidth + 8}px` : 0,
            }}
          >
            {mainTab === 0 ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isScreenShareActive ? (
                  /* ── Screen share layout ── */
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1, p: isMobile ? 0.5 : 1, minHeight: 0, overflow: 'hidden' }}>
                    <Paper ref={shareStageRef} sx={{ flex: 1, overflow: 'hidden', bgcolor: '#000', borderRadius: isMobile ? 0 : 2, border: `1px solid ${darkMode ? 'rgba(148,163,184,0.25)' : '#cbd5e1'}`, position: 'relative' }}>
                      <Tooltip title={isShareStageFullscreen ? 'Exit full screen' : 'Full screen'}>
                        <IconButton size="small" onClick={toggleSharedStageFullscreen} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3, color: '#e2e8f0', bgcolor: 'rgba(2,6,23,0.52)' }}>
                          {isShareStageFullscreen ? <FullscreenExit sx={{ fontSize: 18 }} /> : <Fullscreen sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Tooltip>
                      {sharedScreenStream ? (
                        <video ref={shareVideoRef} autoPlay playsInline muted={String(effectiveScreenShare?.userId) === String(user?.id)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }} />
                      ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: '#e2e8f0' }}>
                          <Typography variant="body2">Preparing screen share…</Typography>
                        </Stack>
                      )}
                    </Paper>
                    {/* Participant strip alongside screen share */}
                    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 0.75, overflowX: isMobile ? 'auto' : 'hidden', overflowY: isMobile ? 'hidden' : 'auto', width: isMobile ? '100%' : 140, height: isMobile ? 88 : '100%', flexShrink: 0, px: isMobile ? 0.5 : 0, ...hideScrollbarSx }}>
                      {visibleParticipants.slice(0, isMobile ? 4 : 8).map((participant) => {
                        const isLocal = String(participant.user_id) === String(user?.id);
                        return (
                          <Box key={participant.user_id} sx={{ width: isMobile ? 88 : '100%', height: isMobile ? 72 : 110, flexShrink: 0 }}>
                            <RemoteVideoTile participant={participant} stream={isLocal ? localStream : (remoteStreams[participant.user_id] || null)} isLocal={isLocal} darkMode={darkMode} cameraOn={cameraOn} micOn={micOn} isActiveSpeaker={Boolean(participant.spotlighted)} handRaised={Boolean(participant.hand_raised)} canMuteParticipant={isManager && !isLocal} onMuteParticipant={handleHostMuteParticipant} />
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ) : isMobile ? (
                  /* ── Mobile: Focus mode (1 main + strip) ── */
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    {/* Main focused video (active speaker / selected) */}
                    {(() => {
                      const focusedP = (focusedParticipantId
                        ? orderedParticipants.find((p) => String(p.user_id) === String(focusedParticipantId))
                        : null) || spotlightParticipant || orderedParticipants[0];
                      if (!focusedP) return null;
                      const isLocal = String(focusedP.user_id) === String(user?.id);
                      return (
                        <Box sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: '#000' }}>
                          <RemoteVideoTile participant={focusedP} stream={isLocal ? localStream : (remoteStreams[focusedP.user_id] || null)} isLocal={isLocal} darkMode={darkMode} cameraOn={cameraOn} micOn={micOn} isActiveSpeaker handRaised={Boolean(focusedP.hand_raised)} canMuteParticipant={isManager && !isLocal} onMuteParticipant={handleHostMuteParticipant} />
                        </Box>
                      );
                    })()}

                    {/* Horizontal participant strip (others, max 4) */}
                    {orderedParticipants.length > 1 && (
                      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.75, overflowX: 'auto', flexShrink: 0, height: 88, px: 1, py: 0.75, bgcolor: 'rgba(0,0,0,0.6)', ...hideScrollbarSx }}>
                        {orderedParticipants
                          .filter((p) => String(p.user_id) !== String(focusedParticipantId || spotlightParticipant?.user_id || orderedParticipants[0]?.user_id))
                          .slice(0, 6)
                          .map((participant) => {
                            const isLocal = String(participant.user_id) === String(user?.id);
                            return (
                              <Box
                                key={participant.user_id}
                                sx={{ width: 80, height: 72, flexShrink: 0, cursor: 'pointer', borderRadius: 1.5, overflow: 'hidden', border: '2px solid transparent', '&:active': { borderColor: '#60a5fa' } }}
                                onClick={() => setFocusedParticipantId(participant.user_id)}
                              >
                                <RemoteVideoTile participant={participant} stream={isLocal ? localStream : (remoteStreams[participant.user_id] || null)} isLocal={isLocal} darkMode={darkMode} cameraOn={cameraOn} micOn={micOn} isActiveSpeaker={false} handRaised={Boolean(participant.hand_raised)} canMuteParticipant={false} onMuteParticipant={handleHostMuteParticipant} />
                              </Box>
                            );
                          })}
                      </Box>
                    )}
                  </Box>
                ) : (
                  /* ── Desktop: Grid layout ── */
                  <Box sx={{ flex: 1, p: 1.5, display: 'grid', gridTemplateColumns: gridColumns, gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`, gap: 1.5, minHeight: 0, overflow: 'hidden' }}>
                    {visibleParticipants.map((participant) => {
                      const isLocal = String(participant.user_id) === String(user?.id);
                      return (
                        <RemoteVideoTile key={participant.user_id} participant={participant} stream={isLocal ? localStream : (remoteStreams[participant.user_id] || null)} isLocal={isLocal} darkMode={darkMode} cameraOn={cameraOn} micOn={micOn} isActiveSpeaker={Boolean(participant.spotlighted)} handRaised={Boolean(participant.hand_raised)} canMuteParticipant={isManager && !isLocal} onMuteParticipant={handleHostMuteParticipant} />
                      );
                    })}
                  </Box>
                )}

                {/* Desktop pagination */}
                {!isMobile && hasPagination && (
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ py: 1, flexShrink: 0 }}>
                    <Button size="small" variant="outlined" disabled={participantPage === 0} onClick={() => setParticipantPage((v) => Math.max(0, v - 1))}>Prev</Button>
                    <Typography variant="caption" sx={{ color: ui.textSecondary }}>Page {participantPage + 1} / {participantPages.length}</Typography>
                    <Button size="small" variant="outlined" disabled={participantPage >= participantPages.length - 1} onClick={() => setParticipantPage((v) => Math.min(participantPages.length - 1, v + 1))}>Next</Button>
                  </Stack>
                )}
              </Box>
            ) : (
              /* ── Whiteboard tab ── */
              <Box sx={{ flex: 1, p: { xs: 0.5, md: 1.5 }, overflow: 'auto' }}>
                <WhiteboardCanvas events={whiteboardEvents} canDraw={isManager} onDraw={handleWhiteboardDraw} onClear={handleWhiteboardClear} />
              </Box>
            )}
          </Box>

          {/* ── Desktop side panel (chat + participants) ── */}
          {!isMobile && isChatOpen && (
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${meetingPanelWidth}px`,
                bgcolor: darkMode ? 'rgba(15,23,42,0.97)' : 'rgba(248,250,252,0.97)',
                backdropFilter: 'blur(12px)',
                borderLeft: `1px solid ${ui.borderSubtle}`,
                boxShadow: '-10px 0 32px rgba(2,6,23,0.35)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                transform: isChatOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 260ms ease',
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${ui.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: ui.textPrimary }}>Meeting Panel</Typography>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Refresh data"><IconButton size="small" onClick={refreshDashboardData} sx={{ color: ui.textSecondary }}><Refresh sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                  <IconButton size="small" onClick={() => setIsChatOpen(false)} sx={{ color: ui.textSecondary }}><Close sx={{ fontSize: 17 }} /></IconButton>
                </Stack>
              </Box>
              <Box sx={{ p: 0.5, mx: 1.5, mt: 1, borderRadius: 1.5, bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,0.7)' }}>
                <Tabs value={Math.min(sideTab, 3)} onChange={(_, v) => setSideTab(v)} variant="scrollable" scrollButtons={false} sx={{ minHeight: 34, '.MuiTabs-indicator': { height: '100%', borderRadius: 999, bgcolor: ui.accentBlue, opacity: 0.18 }, '.MuiTab-root': { minHeight: 34, minWidth: 60, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', px: 1, color: ui.textSecondary, zIndex: 1 }, '.Mui-selected': { color: `${ui.textPrimary} !important` } }}>
                  <Tab label={<Badge badgeContent={unreadCount} color="error" max={9}><span>Chat</span></Badge>} onClick={() => { setUnreadCount(0); }} />
                  <Tab label="People" />
                  <Tab label="Polls" />
                  <Tab label="Files" />
                </Tabs>
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {sideTab === 0 && (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Box ref={chatMessagesScrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, ...hideScrollbarSx }}>
                      {messages.map((msg) => (
                        <Box key={msg.id} sx={{ mb: 1.25 }}>
                          <Stack direction="row" spacing={0.75} alignItems="flex-start">
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, flexShrink: 0, mt: 0.3 }}>{msg.sender_first_name?.[0]}{msg.sender_last_name?.[0]}</Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="caption" fontWeight={700} sx={{ color: ui.textPrimary }}>{msg.sender_first_name} {msg.sender_last_name}</Typography>
                                {msg.recipient_id && <Chip label="Private" size="small" color="secondary" sx={{ height: 14, fontSize: 9 }} />}
                                <Typography variant="caption" sx={{ color: ui.textSecondary, ml: 'auto' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                              </Stack>
                              <Typography variant="body2" sx={{ color: ui.textSecondary, mt: 0.25, wordBreak: 'break-word' }}>{msg.content}</Typography>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ px: 1.5, py: 1, borderTop: `1px solid ${ui.borderSubtle}`, flexShrink: 0 }}>
                      {room.allow_private_chat && (
                        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                          <Select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} displayEmpty sx={{ fontSize: '0.75rem', bgcolor: darkMode ? '#0f172a' : '#fff', color: ui.textPrimary }}>
                            <MenuItem value="">Public chat</MenuItem>
                            {participants.filter((p) => String(p.user_id) !== String(user?.id)).map((p) => (
                              <MenuItem key={p.user_id} value={p.user_id}>Private → {p.first_name} {p.last_name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <TextField value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Send a message…" fullWidth size="small" multiline maxRows={3} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={handleSendMessage} color="primary"><Send sx={{ fontSize: 18 }} /></IconButton></InputAdornment>, sx: { bgcolor: darkMode ? '#0f172a' : '#fff', color: ui.textPrimary, fontSize: '0.85rem' } }} />
                    </Box>
                  </Box>
                )}

                {sideTab === 1 && (
                  <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, ...hideScrollbarSx }}>
                    {participants.map((p) => (
                      <Stack key={p.user_id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.75, borderBottom: `1px solid ${ui.borderSubtle}` }}>
                        <Avatar sx={{ width: 32, height: 32 }}>{p.first_name?.[0]}{p.last_name?.[0]}</Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ color: ui.textPrimary }}>{p.first_name} {p.last_name}{String(p.user_id) === String(user?.id) ? ' (You)' : ''}</Typography>
                          <Typography variant="caption" sx={{ color: ui.textSecondary }}>{p.role}</Typography>
                        </Box>
                        {p.hand_raised && <PanTool sx={{ fontSize: 16, color: '#f59e0b' }} />}
                        {p.mic_enabled ? <Mic sx={{ fontSize: 15, color: '#22c55e' }} /> : <MicOff sx={{ fontSize: 15, color: '#f87171' }} />}
                        {isManager && String(p.user_id) !== String(user?.id) && (
                          <IconButton size="small" onClick={() => handleHostMuteParticipant(p.user_id)} sx={{ color: ui.textSecondary, p: 0.4 }}><VolumeOff sx={{ fontSize: 15 }} /></IconButton>
                        )}
                      </Stack>
                    ))}
                  </Box>
                )}

                {sideTab === 2 && (
                  <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1, ...hideScrollbarSx }}>
                    {isManager && (<Button variant="outlined" size="small" startIcon={<Poll />} onClick={() => setPollOpen(true)}>Create Poll</Button>)}
                    {polls.length === 0 && <Typography variant="body2" sx={{ color: ui.textSecondary }}>No polls yet.</Typography>}
                    {polls.map((poll) => {
                      const totalVotes = Array.isArray(poll.summary) ? poll.summary.reduce((sum, item) => sum + Number(item?.count || 0), 0) : 0;
                      return (
                        <Paper key={poll.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: darkMode ? 'rgba(31,41,55,0.92)' : '#f1f5f9', border: `1px solid ${ui.borderSubtle}` }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: ui.textPrimary, mb: 0.75 }}>{poll.question}</Typography>
                          <Stack spacing={0.6}>
                            {poll.options.map((opt) => {
                              const item = Array.isArray(poll.summary) ? poll.summary.find((s) => s.option === opt) : null;
                              const pct = totalVotes > 0 ? Math.round((Number(item?.count || 0) / totalVotes) * 100) : 0;
                              return (
                                <Box key={opt}>
                                  <Button size="small" variant={poll.my_response === opt ? 'contained' : 'outlined'} onClick={() => handleRespondToPoll(poll.id, opt)} disabled={Boolean(poll.my_response) || Number(poll.is_active) !== 1} sx={{ width: '100%', justifyContent: 'space-between', textTransform: 'none', fontSize: '0.8rem' }}>
                                    <span>{opt}</span><span>{item?.count || 0}</span>
                                  </Button>
                                  {(Boolean(poll.my_response) || isManager) && <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.4, height: 4, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#60a5fa' } }} />}
                                </Box>
                              );
                            })}
                          </Stack>
                          {isManager && Number(poll.is_active) === 1 && (
                            <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                              <Button size="small" color="warning" variant="outlined" onClick={() => handleEndPoll(poll.id)} sx={{ fontSize: '0.74rem' }}>End</Button>
                              <Button size="small" color="error" variant="outlined" onClick={() => handleDeletePoll(poll.id)} sx={{ fontSize: '0.74rem' }}>Delete</Button>
                            </Stack>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                )}

                {sideTab === 3 && (
                  <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1.25, ...hideScrollbarSx }}>
                    {isManager && (<Button variant="outlined" size="small" startIcon={<FilePresent />} onClick={() => setFileOpen(true)}>Share Resource</Button>)}
                    {files.length === 0 && <Typography variant="body2" sx={{ color: ui.textSecondary }}>No shared resources.</Typography>}
                    {files.map((file) => (
                      <Box key={file.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: darkMode ? 'rgba(31,41,55,0.85)' : '#f1f5f9', border: `1px solid ${ui.borderSubtle}` }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: ui.textPrimary }}>{file.title}</Typography>
                        <Typography variant="caption" sx={{ color: ui.textSecondary }}>{file.file_type}</Typography>
                        <Box sx={{ mt: 0.5 }}><Button size="small" href={file.file_url} target="_blank" rel="noreferrer" startIcon={<OpenInNew sx={{ fontSize: 14 }} />}>Open</Button></Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* ── Mobile Self-View Floating Tile ── */}
        {isMobile && localStream && cameraOn && mainTab === 0 && !isScreenShareActive && orderedParticipants.length > 1 && (
          <Box
            onMouseDown={startSelfViewDrag}
            onTouchStart={startSelfViewDrag}
            sx={{
              position: 'fixed',
              right: selfViewPos.x !== null ? 'auto' : 12,
              bottom: selfViewPos.y !== null ? 'auto' : 144,
              left: selfViewPos.x !== null ? selfViewPos.x : 'auto',
              top: selfViewPos.y !== null ? selfViewPos.y : 'auto',
              width: 76,
              height: 108,
              borderRadius: 2,
              overflow: 'hidden',
              zIndex: 300,
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
              border: '2px solid rgba(96,165,250,0.5)',
              cursor: 'grab',
              touchAction: 'none',
            }}
          >
            {(() => {
              const selfP = orderedParticipants.find((p) => String(p.user_id) === String(user?.id));
              if (!selfP) return null;
              return <RemoteVideoTile participant={selfP} stream={localStream} isLocal darkMode={darkMode} cameraOn={cameraOn} micOn={micOn} isActiveSpeaker={false} handRaised={false} canMuteParticipant={false} onMuteParticipant={() => {}} />;
            })()}
          </Box>
        )}

        {/* ── Floating Bottom Control Bar ── */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            pb: isMobile ? 1 : 1.5,
            pointerEvents: 'none',
            opacity: showControlsBar ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}
        >
          <Paper
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 0.5 : 1,
              px: isMobile ? 1 : 2,
              py: isMobile ? 0.75 : 1,
              borderRadius: isMobile ? '20px' : '16px',
              bgcolor: darkMode ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${ui.borderSubtle}`,
              boxShadow: '0 -4px 24px rgba(2,6,23,0.4)',
              pointerEvents: 'auto',
              maxWidth: isMobile ? 'calc(100vw - 16px)' : 700,
            }}
          >
            {/* Mic */}
            <Tooltip title={hostMuted ? 'Muted by host' : (micOn ? 'Mute' : 'Unmute')}>
              <span>
              <IconButton
                onClick={() => !hostMuted && setMicOn((v) => !v)}
                disabled={hostMuted}
                sx={{
                  width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                  color: hostMuted ? '#9ca3af' : (micOn ? ui.textPrimary : ui.dangerRed),
                  bgcolor: hostMuted ? (darkMode ? 'rgba(156,163,175,0.12)' : '#f1f5f9') : (micOn ? (darkMode ? 'rgba(96,165,250,0.15)' : '#dbeafe') : (darkMode ? 'rgba(239,68,68,0.18)' : '#fee2e2')),
                  borderRadius: '12px',
                  '&:active': { transform: 'scale(0.93)' },
                  '&.Mui-disabled': { opacity: 0.55 },
                }}
              >
                <MicOff sx={{ color: hostMuted ? '#9ca3af' : undefined }} />
              </IconButton>
              </span>
            </Tooltip>

            {/* Camera */}
            <Tooltip title={cameraOn ? 'Camera off' : 'Camera on'}>
              <IconButton
                onClick={() => setCameraOn((v) => !v)}
                sx={{
                  width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                  color: cameraOn ? ui.textPrimary : ui.dangerRed,
                  bgcolor: cameraOn ? (darkMode ? 'rgba(96,165,250,0.15)' : '#dbeafe') : (darkMode ? 'rgba(239,68,68,0.18)' : '#fee2e2'),
                  borderRadius: '12px',
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                {cameraOn ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Tooltip>

            {/* Screen share (hide on mobile if not supported) */}
            {(!isMobile || Boolean(navigator.mediaDevices?.getDisplayMedia)) && (
              <Tooltip title={screenSharing ? 'Stop sharing' : 'Share screen'}>
                <IconButton
                  onClick={handleToggleScreenShare}
                  sx={{
                    width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                    color: screenSharing ? ui.accentBlue : ui.textPrimary,
                    bgcolor: screenSharing ? (darkMode ? 'rgba(96,165,250,0.2)' : '#dbeafe') : (darkMode ? 'rgba(255,255,255,0.08)' : '#eef2f7'),
                    borderRadius: '12px',
                    '&:active': { transform: 'scale(0.93)' },
                  }}
                >
                  {screenSharing ? <StopScreenShare /> : <ScreenShare />}
                </IconButton>
              </Tooltip>
            )}

            {/* Raise hand */}
            <Tooltip title={handRaised ? 'Lower hand' : 'Raise hand'}>
              <IconButton
                onClick={toggleHand}
                sx={{
                  width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                  color: handRaised ? '#f59e0b' : ui.textPrimary,
                  bgcolor: handRaised ? (darkMode ? 'rgba(245,158,11,0.22)' : '#fef3c7') : (darkMode ? 'rgba(255,255,255,0.08)' : '#eef2f7'),
                  borderRadius: '12px',
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                <PanTool />
              </IconButton>
            </Tooltip>

            {/* Chat */}
            <Tooltip title={isChatOpen ? 'Close chat' : 'Open chat'}>
              <IconButton
                onClick={toggleChatPanel}
                sx={{
                  width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                  color: isChatOpen ? '#fff' : ui.textPrimary,
                  bgcolor: isChatOpen ? (darkMode ? 'rgba(96,165,250,0.25)' : '#dbeafe') : (darkMode ? 'rgba(255,255,255,0.08)' : '#eef2f7'),
                  borderRadius: '12px',
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                <Badge badgeContent={unreadCount} color="error" max={9} overlap="circular">
                  <Chat />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Participants (mobile) */}
            {isMobile && (
              <Tooltip title="Participants">
                <IconButton
                  onClick={() => setShowParticipantsPanel(true)}
                  sx={{
                    width: 48, height: 48,
                    color: ui.textPrimary,
                    bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : '#eef2f7',
                    borderRadius: '12px',
                    '&:active': { transform: 'scale(0.93)' },
                  }}
                >
                  <People />
                </IconButton>
              </Tooltip>
            )}

            {/* More (mobile) / Settings (desktop) */}
            <Tooltip title={isMobile ? 'More' : 'Settings'}>
              <IconButton
                onClick={() => setShowMorePanel(true)}
                sx={{
                  width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                  color: ui.textPrimary,
                  bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : '#eef2f7',
                  borderRadius: '12px',
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                {isMobile ? <MoreVert /> : <Settings />}
              </IconButton>
            </Tooltip>

            {/* Divider */}
            <Box sx={{ width: 1, height: 32, bgcolor: ui.borderSubtle, mx: 0.5 }} />

            {/* Leave */}
            <Tooltip title="Leave meeting">
              <IconButton
                onClick={handleExitRoom}
                sx={{
                  width: isMobile ? 48 : 44, height: isMobile ? 48 : 44,
                  color: '#fff',
                  bgcolor: '#dc2626',
                  borderRadius: '12px',
                  '&:hover': { bgcolor: '#b91c1c' },
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                <Logout />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>

        {/* ── Mobile Chat Overlay (full-screen) ── */}
        {isMobile && isChatOpen && (
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 500,
              bgcolor: darkMode ? '#0f172a' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 220ms ease',
              '@keyframes slideUp': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${ui.borderSubtle}`, flexShrink: 0 }}>
              <IconButton size="small" onClick={() => setIsChatOpen(false)} sx={{ color: ui.textPrimary }}><ArrowBack sx={{ fontSize: 20 }} /></IconButton>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: ui.textPrimary }}>Chat</Typography>
              <Typography variant="caption" sx={{ color: ui.textSecondary }}>{messages.length} messages</Typography>
            </Stack>

            <Box ref={chatMessagesScrollRef} sx={{ flex: 1, overflowY: 'auto', px: 1.25, py: 1, ...hideScrollbarSx }}>
              {messages.length === 0 && (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', opacity: 0.55 }}>
                  <Chat sx={{ fontSize: 44, color: ui.textSecondary, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: ui.textSecondary }}>No messages yet. Say hi!</Typography>
                </Stack>
              )}
              {messages.map((msg) => {
                const isSelf = String(msg.sender_id) === String(user?.id);
                return (
                  <Box key={msg.id} sx={{ mb: 1.5, display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start' }}>
                    {!isSelf && <Avatar sx={{ width: 28, height: 28, fontSize: 11, mr: 0.75, mt: 0.25, flexShrink: 0 }}>{msg.sender_first_name?.[0]}{msg.sender_last_name?.[0]}</Avatar>}
                    <Box sx={{ maxWidth: '78%' }}>
                      {!isSelf && <Typography variant="caption" fontWeight={700} sx={{ color: ui.textSecondary, display: 'block', mb: 0.25, ml: 0.25 }}>{msg.sender_first_name}</Typography>}
                      <Box sx={{ px: 1.25, py: 0.75, borderRadius: isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px', bgcolor: isSelf ? (darkMode ? '#2563eb' : '#3b82f6') : (darkMode ? '#1e293b' : '#e2e8f0'), maxWidth: '100%' }}>
                        <Typography variant="body2" sx={{ color: isSelf ? '#fff' : ui.textPrimary, wordBreak: 'break-word' }}>{msg.content}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: ui.textSecondary, mt: 0.25, display: 'block', textAlign: isSelf ? 'right' : 'left', px: 0.25 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                    </Box>
                    {isSelf && <Avatar sx={{ width: 28, height: 28, fontSize: 11, ml: 0.75, mt: 0.25, flexShrink: 0 }}>{msg.sender_first_name?.[0]}{msg.sender_last_name?.[0]}</Avatar>}
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ px: 1.25, py: 1, borderTop: `1px solid ${ui.borderSubtle}`, flexShrink: 0, bgcolor: darkMode ? 'rgba(15,23,42,0.95)' : '#fff' }}>
              {room.allow_private_chat && (
                <FormControl size="small" fullWidth sx={{ mb: 0.75 }}>
                  <Select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} displayEmpty sx={{ fontSize: '0.75rem', color: ui.textPrimary, bgcolor: darkMode ? '#1e293b' : '#f1f5f9' }}>
                    <MenuItem value="">Everyone</MenuItem>
                    {participants.filter((p) => String(p.user_id) !== String(user?.id)).map((p) => (
                      <MenuItem key={p.user_id} value={p.user_id}>{p.first_name} {p.last_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Message…"
                fullWidth
                size="small"
                autoComplete="off"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSendMessage} disabled={!messageText.trim()} sx={{ color: '#3b82f6' }}><Send sx={{ fontSize: 20 }} /></IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '20px', bgcolor: darkMode ? '#1e293b' : '#f1f5f9', fontSize: '0.9rem' },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
              />
            </Box>
          </Box>
        )}

        {/* ── Mobile Participants Bottom Sheet ── */}
        {isMobile && showParticipantsPanel && (
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 600,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              bgcolor: 'rgba(0,0,0,0.5)',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowParticipantsPanel(false); }}
          >
            <Paper
              sx={{
                borderRadius: '20px 20px 0 0',
                bgcolor: darkMode ? '#111827' : '#f8fafc',
                maxHeight: '75vh',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 220ms ease',
              }}
            >
              <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(148,163,184,0.5)', mx: 'auto', mt: 1.25, mb: 0.5, flexShrink: 0 }} />
              <Stack direction="row" alignItems="center" sx={{ px: 2, pb: 1.25, flexShrink: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: ui.textPrimary }}>Participants ({participants.length})</Typography>
                <IconButton size="small" onClick={() => setShowParticipantsPanel(false)} sx={{ color: ui.textSecondary }}><Close sx={{ fontSize: 18 }} /></IconButton>
              </Stack>
              <Box sx={{ overflowY: 'auto', px: 1.5, pb: 2, ...hideScrollbarSx }}>
                {participants.map((p) => (
                  <Stack key={p.user_id} direction="row" spacing={1.25} alignItems="center" sx={{ py: 1, borderBottom: `1px solid ${ui.borderSubtle}` }}>
                    <Avatar sx={{ width: 36, height: 36 }}>{p.first_name?.[0]}{p.last_name?.[0]}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ color: ui.textPrimary }}>{p.first_name} {p.last_name}{String(p.user_id) === String(user?.id) ? ' (You)' : ''}</Typography>
                      <Typography variant="caption" sx={{ color: ui.textSecondary, textTransform: 'capitalize' }}>{p.role}</Typography>
                    </Box>
                    {p.hand_raised && <Chip icon={<PanTool sx={{ fontSize: '0.8rem !important' }} />} label="Hand" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: '#fbbf24', height: 22 }} />}
                    {p.mic_enabled ? <Mic sx={{ fontSize: 18, color: '#22c55e' }} /> : <MicOff sx={{ fontSize: 18, color: '#f87171' }} />}
                    {isManager && String(p.user_id) !== String(user?.id) && (
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => handleHostMuteParticipant(p.user_id)} sx={{ color: ui.textSecondary, bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : '#eef2f7', borderRadius: 1 }}>
                          <VolumeOff sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => { handleRemoveParticipant(p.user_id); setShowParticipantsPanel(false); }} sx={{ color: ui.dangerRed, bgcolor: darkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2', borderRadius: 1 }}>
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    )}
                  </Stack>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* ── More / Settings Bottom Sheet ── */}
        {showMorePanel && (
          <Box
            sx={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', bgcolor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowMorePanel(false); }}
          >
            <Paper
              sx={{
                borderRadius: '20px 20px 0 0',
                bgcolor: darkMode ? '#111827' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 220ms ease',
              }}
            >
              <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(148,163,184,0.5)', mx: 'auto', mt: 1.25, mb: 0.5 }} />
              <Stack direction="row" alignItems="center" sx={{ px: 2, pb: 1, pt: 0.25 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: ui.textPrimary }}>{isMobile ? 'More Options' : 'Settings'}</Typography>
                <IconButton size="small" onClick={() => setShowMorePanel(false)} sx={{ color: ui.textSecondary }}><Close sx={{ fontSize: 18 }} /></IconButton>
              </Stack>
              <Box sx={{ px: 1.5, pb: 2 }}>
                {/* Whiteboard toggle */}
                <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setMainTab((v) => v === 1 ? 0 : 1); setShowMorePanel(false); }}>
                  <Draw sx={{ fontSize: 22, color: mainTab === 1 ? ui.accentBlue : ui.textSecondary, mr: 2 }} />
                  <Typography variant="body2" sx={{ flex: 1, color: ui.textPrimary }}>{mainTab === 1 ? 'Hide Whiteboard' : 'Open Whiteboard'}</Typography>
                  {mainTab === 1 && <Chip label="Active" size="small" color="primary" sx={{ height: 20, fontSize: '0.68rem' }} />}
                </Stack>

                {/* Polls (mobile) */}
                {isMobile && isManager && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); setPollOpen(true); }}>
                    <Poll sx={{ fontSize: 22, color: ui.textSecondary, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: ui.textPrimary }}>Create Poll</Typography>
                  </Stack>
                )}

                {/* Share File */}
                {isManager && room.allow_file_sharing && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); setFileOpen(true); }}>
                    <FilePresent sx={{ fontSize: 22, color: ui.textSecondary, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: ui.textPrimary }}>Share File / Resource</Typography>
                  </Stack>
                )}

                {/* Recording */}
                {isManager && room.recording_enabled && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); if (isRecording) stopRecording(); else startRecording(); }}>
                    <RadioButtonChecked sx={{ fontSize: 22, color: isRecording ? '#ef4444' : ui.textSecondary, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: isRecording ? '#ef4444' : ui.textPrimary }}>{isRecording ? `Stop Recording (${formatSeconds(recordingElapsed)})` : 'Start Recording'}</Typography>
                    {isRecording && <Chip label="REC" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.18)', color: '#fca5a5', height: 20, fontSize: '0.68rem' }} />}
                  </Stack>
                )}

                {/* Mute all */}
                {isManager && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); socketRef.current?.emit('host:locks:set', { roomId, micLocked: true, muteAllNow: true }); pushToast('All participants muted.', 'info'); }}>
                    <VolumeOff sx={{ fontSize: 22, color: ui.textSecondary, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: ui.textPrimary }}>Mute All Participants</Typography>
                  </Stack>
                )}

                {/* Unlock mics — lets participants resume control of their own mic after mute-all */}
                {isManager && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); socketRef.current?.emit('host:locks:set', { roomId, micLocked: false }); pushToast('Participants can now unmute themselves.', 'success'); }}>
                    <Mic sx={{ fontSize: 22, color: ui.accentGreen, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: ui.textPrimary }}>Unlock Participant Mics</Typography>
                  </Stack>
                )}

                {/* Start / End session */}
                {isManager && room.status !== 'live' && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); handleManagerAction('start'); }}>
                    <PlayArrow sx={{ fontSize: 22, color: ui.accentGreen, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: ui.textPrimary }}>Start Session</Typography>
                  </Stack>
                )}
                {isManager && room.status === 'live' && (
                  <Stack direction="row" alignItems="center" sx={{ py: 1.1, borderBottom: `1px solid ${ui.borderSubtle}`, cursor: 'pointer' }} onClick={() => { setShowMorePanel(false); handleManagerAction('end'); }}>
                    <Stop sx={{ fontSize: 22, color: ui.dangerRed, mr: 2 }} />
                    <Typography variant="body2" sx={{ color: ui.dangerRed }}>End Session</Typography>
                  </Stack>
                )}

                {/* Video Quality */}
                <Box sx={{ pt: 1.25 }}>
                  <Typography variant="caption" sx={{ color: ui.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, display: 'block', mb: 0.75 }}>Video Quality</Typography>
                  <Stack direction="row" spacing={1}>
                    {['low', 'high'].map((q) => (
                      <Button key={q} size="small" variant={qualityMode === q ? 'contained' : 'outlined'} onClick={() => { setQualityMode(q); }} sx={{ textTransform: 'capitalize', borderRadius: 2, flex: 1 }}>{q === 'low' ? 'Low (save data)' : 'High (HD)'}</Button>
                    ))}
                  </Stack>
                </Box>

                {/* Audio device */}
                {audioInputDevices.length > 0 && (
                  <Box sx={{ pt: 1.25 }}>
                    <Typography variant="caption" sx={{ color: ui.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, display: 'block', mb: 0.75 }}>Microphone</Typography>
                    <FormControl size="small" fullWidth>
                      <Select value={selectedAudioDevice} onChange={(e) => setSelectedAudioDevice(e.target.value)} sx={{ bgcolor: darkMode ? '#0f172a' : '#fff', color: ui.textPrimary, fontSize: '0.85rem' }}>
                        {audioInputDevices.map((d) => <MenuItem key={d.deviceId} value={d.label || d.deviceId}>{d.label || 'Microphone'}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Theme */}
                <Box sx={{ pt: 1.25 }}>
                  <Stack direction="row" alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => setDarkMode((v) => !v)}>
                    {darkMode ? <LightMode sx={{ fontSize: 22, color: ui.textSecondary, mr: 2 }} /> : <DarkMode sx={{ fontSize: 22, color: ui.textSecondary, mr: 2 }} />}
                    <Typography variant="body2" sx={{ color: ui.textPrimary }}>{darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Typography>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {/* ── Reaction Burst ── */}
        {reactions.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ position: 'fixed', right: 12, bottom: isMobile ? 88 : 96, zIndex: 250, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 200 }}>
            {reactions.slice(-3).map((reaction) => (
              <Chip key={reaction.id} label={`${reaction.emoji} ${reaction.firstName || ''}`} size="small" color="secondary" sx={{ fontSize: '0.78rem', height: 26 }} />
            ))}
          </Stack>
        )}

        {/* ── Emoji reactions (mobile bottom-right above control bar) ── */}
        {isMobile && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: isMobile ? 80 : 96,
              zIndex: 199,
              opacity: showControlsBar ? 1 : 0,
              transition: 'opacity 200ms ease',
            }}
          >
            {['👍', '👏', '🎉', '❤️'].map((emoji) => (
              <IconButton key={emoji} size="small" onClick={() => sendReaction(emoji)} sx={{ bgcolor: darkMode ? 'rgba(17,24,39,0.88)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: `1px solid ${ui.borderSubtle}`, borderRadius: '50%', width: 36, height: 36, fontSize: '1rem' }}>
                {emoji}
              </IconButton>
            ))}
          </Stack>
        )}

      </Box>

      <PollDialog open={pollOpen} onClose={() => setPollOpen(false)} onSubmit={handleCreatePoll} loading={actionLoading} />
      <FileDialog open={fileOpen} onClose={() => setFileOpen(false)} onSubmit={handleShareFile} loading={actionLoading} />
    </Layout>
  );
};

export default EduMeetRoom;

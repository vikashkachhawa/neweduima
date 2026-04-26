import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CameraAlt,
  CheckCircle,
  HourglassEmpty,
  Mic,
  MicOff,
  Settings,
  Videocam,
  VideocamOff,
  VolumeUp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import eduMeetService from '../services/edumeet';
import { createEduMeetSocket } from '../services/edumeetSocket';

const QUALITY_CONSTRAINTS = {
  high: { width: 1280, height: 720, frameRate: 30 },
  medium: { width: 640, height: 480, frameRate: 24 },
  low: { width: 320, height: 240, frameRate: 15 },
};

export default function EduMeetPreJoin() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const socketRef = useRef(null);
  const profileDisplayName = [
    user?.first_name || user?.firstName || '',
    user?.last_name || user?.lastName || '',
  ].join(' ').trim();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [waitingStatus, setWaitingStatus] = useState(null); // null | 'waiting' | 'admitted' | 'rejected'

  const [displayName, setDisplayName] = useState(profileDisplayName);
  const [password, setPassword] = useState(searchParams.get('pwd') || '');

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [quality, setQuality] = useState('medium');

  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');

  const [audioLevel, setAudioLevel] = useState(0);
  const [mediaError, setMediaError] = useState('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  useEffect(() => {
    if (profileDisplayName) setDisplayName(profileDisplayName);
  }, [profileDisplayName]);

  // Load room info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await eduMeetService.getRoom(roomId);
        if (!cancelled) setRoom(data.room);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Room not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  // Enumerate devices after initial permission
  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
    setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
    const firstAudio = devices.find((d) => d.kind === 'audioinput');
    const firstVideo = devices.find((d) => d.kind === 'videoinput');
    const firstOutput = devices.find((d) => d.kind === 'audiooutput');
    if (firstAudio && !selectedAudio) setSelectedAudio(firstAudio.deviceId);
    if (firstVideo && !selectedVideo) setSelectedVideo(firstVideo.deviceId);
    if (firstOutput && !selectedOutput) setSelectedOutput(firstOutput.deviceId);
  }, [selectedAudio, selectedVideo, selectedOutput]);

  // Acquire media stream
  useEffect(() => {
    let disposed = false;

    const acquire = async () => {
      // Stop any existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop());

      if (!cameraOn && !micOn) {
        if (videoRef.current) videoRef.current.srcObject = null;
        streamRef.current = null;
        setAudioLevel(0);
        return;
      }

      try {
        const videoConstraints = cameraOn
          ? { ...(QUALITY_CONSTRAINTS[quality] || QUALITY_CONSTRAINTS.medium), deviceId: selectedVideo ? { ideal: selectedVideo } : undefined }
          : false;
        const audioConstraints = micOn
          ? { deviceId: selectedAudio ? { ideal: selectedAudio } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : false;

        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });
        if (disposed) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setMediaError('');
        await enumerateDevices();

        // Audio level meter
        if (micOn) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const tick = () => {
              if (disposed) return;
              const buf = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(buf);
              const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
          } catch {
            // audio meter optional
          }
        }
      } catch (err) {
        if (!disposed) setMediaError(err?.message || 'Cannot access camera/microphone');
      }
    };

    acquire();

    return () => {
      disposed = true;
      cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, micOn, quality, selectedAudio, selectedVideo]);

  // Socket for waiting room status
  useEffect(() => {
    if (!roomId) return undefined;
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = createEduMeetSocket(token);
    socketRef.current = socket;

    socket.on('waiting:decision', ({ action }) => {
      if (action === 'admitted') {
        setWaitingStatus('admitted');
        // Auto-navigate after brief message
        setTimeout(() => navigate(`/edumeet/rooms/${roomId}`), 1500);
      } else {
        setWaitingStatus('rejected');
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, navigate]);

  const handleJoin = async () => {
    if (!displayName.trim()) return;
    setJoining(true);
    setError('');
    try {
      await eduMeetService.joinRoom(roomId, password);
      // If room needs waiting room, emit knock
      if (room?.waiting_room_enabled) {
        socketRef.current?.emit('waiting:request', { roomId });
        setWaitingStatus('waiting');
        setJoining(false);
        return;
      }
      // Navigate to room
      navigate(`/edumeet/rooms/${roomId}`);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a' }}>
        <CircularProgress sx={{ color: '#fff' }} />
      </Box>
    );
  }

  if (!room && error) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', gap: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => navigate('/edumeet')}>Back to EduMeet</Button>
      </Box>
    );
  }

  // Waiting room limbo screen
  if (waitingStatus === 'waiting') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', px: 2 }}>
        <Paper sx={{ p: 5, borderRadius: 4, maxWidth: 440, textAlign: 'center', bgcolor: '#1e293b' }}>
          <HourglassEmpty sx={{ fontSize: 56, color: '#f59e0b', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} sx={{ color: '#f8fafc', mb: 1 }}>Waiting for host</Typography>
          <Typography sx={{ color: '#94a3b8', mb: 3 }}>
            The teacher will let you in shortly. Please wait.
          </Typography>
          <CircularProgress size={28} sx={{ color: '#f59e0b' }} />
          <Box sx={{ mt: 3 }}>
            <Button variant="text" sx={{ color: '#64748b' }} onClick={() => navigate('/edumeet')}>Cancel</Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (waitingStatus === 'rejected') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', px: 2 }}>
        <Paper sx={{ p: 5, borderRadius: 4, maxWidth: 440, textAlign: 'center', bgcolor: '#1e293b' }}>
          <Alert severity="error" sx={{ mb: 2 }}>The host declined your request to join.</Alert>
          <Button variant="contained" onClick={() => navigate('/edumeet')}>Back to EduMeet</Button>
        </Paper>
      </Box>
    );
  }

  if (waitingStatus === 'admitted') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', px: 2 }}>
        <Paper sx={{ p: 5, borderRadius: 4, maxWidth: 440, textAlign: 'center', bgcolor: '#1e293b' }}>
          <CheckCircle sx={{ fontSize: 56, color: '#22c55e', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} sx={{ color: '#f8fafc' }}>Admitted! Joining...</Typography>
          <CircularProgress size={24} sx={{ mt: 2, color: '#22c55e' }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 900, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

        {/* Left – Camera Preview */}
        <Box>
          <Box sx={{ position: 'relative', borderRadius: 4, overflow: 'hidden', bgcolor: '#020617', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cameraOn ? (
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Stack alignItems="center" spacing={1.5}>
                <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: '#334155' }}>
                  {(displayName || 'U')[0]?.toUpperCase()}
                </Avatar>
                <Typography sx={{ color: '#94a3b8' }}>Camera is off</Typography>
              </Stack>
            )}

            {/* Audio level bar */}
            {micOn && (
              <Box sx={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: '80%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${audioLevel}%`, bgcolor: audioLevel > 70 ? '#ef4444' : '#22c55e', borderRadius: 4, transition: 'width 80ms linear' }} />
              </Box>
            )}

            {/* Overlay name */}
            <Box sx={{ position: 'absolute', bottom: 24, left: 12, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
              <Typography variant="caption" sx={{ color: '#f8fafc', fontWeight: 700 }}>{displayName || 'You'}</Typography>
            </Box>
          </Box>

          {/* Camera + Mic quick toggles */}
          <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
            <Tooltip title={micOn ? 'Mute microphone' : 'Unmute microphone'}>
              <IconButton
                onClick={() => setMicOn((v) => !v)}
                sx={{ bgcolor: micOn ? 'rgba(255,255,255,0.08)' : '#ef4444', color: '#fff', '&:hover': { bgcolor: micOn ? 'rgba(255,255,255,0.15)' : '#dc2626' }, width: 52, height: 52 }}
              >
                {micOn ? <Mic /> : <MicOff />}
              </IconButton>
            </Tooltip>
            <Tooltip title={cameraOn ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton
                onClick={() => setCameraOn((v) => !v)}
                sx={{ bgcolor: cameraOn ? 'rgba(255,255,255,0.08)' : '#ef4444', color: '#fff', '&:hover': { bgcolor: cameraOn ? 'rgba(255,255,255,0.15)' : '#dc2626' }, width: 52, height: 52 }}
              >
                {cameraOn ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Device settings">
              <IconButton
                onClick={() => setShowDeviceSettings((v) => !v)}
                sx={{ bgcolor: showDeviceSettings ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }, width: 52, height: 52 }}
              >
                <Settings />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Device settings panel */}
          {showDeviceSettings && (
            <Paper sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid rgba(148,163,184,0.15)' }}>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>Device Settings</Typography>
              <Stack spacing={1.5}>
                {videoDevices.length > 0 && (
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#64748b' }}>Camera</InputLabel>
                    <Select value={selectedVideo} onChange={(e) => setSelectedVideo(e.target.value)} label="Camera" sx={{ color: '#e2e8f0', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } }}>
                      {videoDevices.map((d) => <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
                {audioDevices.length > 0 && (
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#64748b' }}>Microphone</InputLabel>
                    <Select value={selectedAudio} onChange={(e) => setSelectedAudio(e.target.value)} label="Microphone" sx={{ color: '#e2e8f0', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } }}>
                      {audioDevices.map((d) => <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
                {audioOutputDevices.length > 0 && (
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#64748b' }}>Speaker</InputLabel>
                    <Select value={selectedOutput} onChange={(e) => setSelectedOutput(e.target.value)} label="Speaker" sx={{ color: '#e2e8f0', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } }}>
                      {audioOutputDevices.map((d) => <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 6)}`}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ color: '#64748b' }}>Video Quality</InputLabel>
                  <Select value={quality} onChange={(e) => setQuality(e.target.value)} label="Video Quality" sx={{ color: '#e2e8f0', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } }}>
                    <MenuItem value="high">HD (1280×720)</MenuItem>
                    <MenuItem value="medium">SD (640×480)</MenuItem>
                    <MenuItem value="low">Low bandwidth (320×240)</MenuItem>
                  </Select>
                </FormControl>

                {/* Live mic level indicator */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Mic sx={{ color: '#64748b', fontSize: 18 }} />
                  <Box sx={{ flex: 1, height: 6, bgcolor: 'rgba(148,163,184,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${audioLevel}%`, bgcolor: audioLevel > 70 ? '#ef4444' : '#22c55e', borderRadius: 4, transition: 'width 80ms linear' }} />
                  </Box>
                  <VolumeUp sx={{ color: '#64748b', fontSize: 18 }} />
                </Stack>
              </Stack>
            </Paper>
          )}

          {mediaError && <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>{mediaError}</Alert>}
        </Box>

        {/* Right – Join form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Stack spacing={0.5} sx={{ mb: 3 }}>
            <Typography variant="overline" sx={{ color: '#4f46e5', fontWeight: 700, letterSpacing: 2 }}>EduMeet</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#f8fafc', lineHeight: 1.2 }}>
              {room?.title || 'Joining Session'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {room && (
                <>
                  <Chip label={room.status} size="small" color={room.status === 'live' ? 'success' : 'info'} />
                  <Chip label={room.conference_type?.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }} />
                  <Chip icon={<CameraAlt sx={{ fontSize: 14 }} />} label={`Code: ${room.room_code}`} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }} />
                </>
              )}
            </Stack>
          </Stack>

          <Stack spacing={2}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

            <TextField
              label="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ sx: { color: '#64748b' } }}
              InputProps={{ sx: { color: '#e2e8f0', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.5)' } } }}
              sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
            />

            {room?.is_password_protected && (
              <TextField
                label="Room password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ sx: { color: '#64748b' } }}
                InputProps={{ sx: { color: '#e2e8f0', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } } }}
                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
              />
            )}

            <Divider sx={{ borderColor: 'rgba(148,163,184,0.1)' }} />

            <Stack direction="row" spacing={1} alignItems="center">
              {micOn ? <Mic sx={{ color: '#22c55e', fontSize: 18 }} /> : <MicOff sx={{ color: '#ef4444', fontSize: 18 }} />}
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>{micOn ? 'Microphone on' : 'Microphone off'}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {cameraOn ? <Videocam sx={{ color: '#22c55e', fontSize: 18 }} /> : <VideocamOff sx={{ color: '#ef4444', fontSize: 18 }} />}
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>{cameraOn ? 'Camera on' : 'Camera off'}</Typography>
            </Stack>

            <Button
              variant="contained"
              size="large"
              onClick={handleJoin}
              disabled={joining || !displayName.trim()}
              sx={{ mt: 1, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, borderRadius: 3, py: 1.5, fontWeight: 700, fontSize: 16 }}
            >
              {joining ? <CircularProgress size={22} color="inherit" /> : 'Join Now'}
            </Button>

            <Button
              variant="text"
              onClick={() => navigate('/edumeet')}
              sx={{ color: '#64748b' }}
            >
              Back to EduMeet
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Code,
  Error as ErrorIcon,
  ExpandLess,
  ExpandMore,
  PlayArrow,
  Send,
  Timer,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import CodeEditor, { LANGUAGE_PLACEHOLDERS } from '../components/CodeEditor';
import { useAuth } from '../contexts/AuthContext';
import codeArenaService from '../services/codeArena';
import { createExecutionSocket } from '../services/codeArenaSocket';

// ─── Helpers ────────────────────────────────────────────────────────────────

const RESULT_COLOR = {
  accepted: 'success',
  wrong_answer: 'error',
  runtime_error: 'error',
  timeout: 'warning',
  compilation_error: 'error',
  pending: 'default',
};

const RESULT_LABEL = {
  accepted: 'Accepted ✓',
  wrong_answer: 'Wrong Answer',
  runtime_error: 'Runtime Error',
  timeout: 'Time Limit Exceeded',
  compilation_error: 'Compilation Error',
  pending: 'Pending',
};

const DIFFICULTY_COLOR = { basic: 'success', intermediate: 'warning', advanced: 'error' };

const padTime = (n) => String(n).padStart(2, '0');

const formatCountdown = (endsAt) => {
  if (!endsAt) return null;
  const diff = Math.max(0, new Date(endsAt) - new Date());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${h > 0 ? padTime(h) + ':' : ''}${padTime(m)}:${padTime(s)}`;
};

// ─── Problem Panel ────────────────────────────────────────────────────────────

const ProblemPanel = ({ problem, mode }) => {
  const [showSample, setShowSample] = useState(true);

  if (!problem) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Select a problem from the tabs above</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{problem.title}</Typography>
        <Chip label={problem.difficulty} size="small" color={DIFFICULTY_COLOR[problem.difficulty]} />
      </Box>

      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{problem.description}</Typography>

      {problem.constraints && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Constraints</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
            {problem.constraints}
          </Typography>
        </Box>
      )}

      {(problem.sample_input || problem.sample_output) && (
        <Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 0.5 }}
            onClick={() => setShowSample((v) => !v)}
          >
            <Typography variant="subtitle2">Sample I/O</Typography>
            <IconButton size="small">{showSample ? <ExpandLess /> : <ExpandMore />}</IconButton>
          </Box>
          {showSample && (
            <Stack spacing={1}>
              {problem.sample_input && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Input</Typography>
                  <Paper variant="outlined" sx={{ p: 1, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {problem.sample_input}
                  </Paper>
                </Box>
              )}
              {problem.sample_output && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Output</Typography>
                  <Paper variant="outlined" sx={{ p: 1, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {problem.sample_output}
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      )}

      {problem.test_cases && problem.test_cases.length > 0 && mode === 'practice' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Visible Test Cases</Typography>
          <Stack spacing={1}>
            {problem.test_cases.map((tc, i) => (
              <Paper key={tc.id} variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">Test {i + 1}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Input</Typography>
                    <Paper variant="outlined" sx={{ p: 0.75, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', bgcolor: 'action.hover' }}>
                      {tc.input_data || '(empty)'}
                    </Paper>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Expected</Typography>
                    <Paper variant="outlined" sx={{ p: 0.75, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', bgcolor: 'action.hover' }}>
                      {tc.expected_output}
                    </Paper>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

// ─── Results Panel ─────────────────────────────────────────────────────────

const ResultsPanel = ({ results, overallResult, executionTimeMs }) => {
  if (!results) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Chip
          label={RESULT_LABEL[overallResult] || overallResult}
          color={RESULT_COLOR[overallResult] || 'default'}
          size="small"
        />
        {executionTimeMs != null && (
          <Typography variant="caption" color="text.secondary">{executionTimeMs}ms total</Typography>
        )}
      </Box>
      <Stack spacing={1}>
        {results.map((r, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1, borderColor: r.is_passed ? 'success.main' : 'error.main', borderWidth: r.is_passed ? 1 : 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {r.is_passed
                ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                : <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />}
              <Typography variant="caption" fontWeight={600}>
                Test {i + 1} — {r.is_passed ? 'Passed' : (r.timed_out ? 'TLE' : 'Failed')}
              </Typography>
              {r.execution_time_ms != null && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{r.execution_time_ms}ms</Typography>
              )}
            </Box>
            {r.error_log && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'error.main', display: 'block', mt: 0.5 }}>
                {r.error_log}
              </Typography>
            )}
            {r.actual_output !== undefined && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Output: </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {r.actual_output || '(empty)'}
                </Typography>
              </Box>
            )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

// ─── Terminal Panel ───────────────────────────────────────────────────────────
//
// Renders a real-time interactive terminal:
//  • segments – array of { type, text } where text is a raw chunk (may include \n)
//  • sessionActive – true while the child process is alive; enables interactive input
//  • When sessionActive: pressing Enter sends the typed line to the running process
//  • When idle:          Ctrl+Enter triggers onRun
//  • onKill:            sends code:kill to stop a running process
//  • onClear:           clears the display (only when idle)

const SEG_COLOR = {
  stdout: '#e6edf3',
  stderr: '#f85149',
  stdin:  '#7ee787',
  system: '#6e7681',
};

const TerminalPanel = ({
  sessionActive,
  awaitingInput,   // true when program is running but produced no output for 2s (likely waiting for stdin)
  socketConnected,
  segments,
  inputValue,
  onInputChange,
  onInputSubmit,   // called when Enter pressed while sessionActive – sends stdin line
  onRun,           // called when Ctrl+Enter pressed while idle
  onKill,          // called when Kill button clicked while sessionActive
  onClear,
  disabled,
}) => {
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  // Auto-scroll to bottom whenever new output arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  // Focus input when session becomes active so user can type immediately
  useEffect(() => {
    if (sessionActive) inputRef.current?.focus();
  }, [sessionActive]);

  const handleKeyDown = (e) => {
    if (sessionActive) {
      // Enter (without Shift) sends the current line to the running process
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onInputSubmit(inputValue);
      }
    } else {
      // Ctrl+Enter triggers Run when no session is active
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!disabled) onRun();
      }
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: '#0d1117',
      overflow: 'hidden',
      fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code",monospace',
      fontSize: 12.5,
    }}>
      {/* Terminal chrome */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        py: 0.5,
        bgcolor: '#161b22',
        borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        {/* Traffic lights */}
        <Box sx={{ display: 'flex', gap: 0.5, mr: 1.5 }}>
          {['#f85149', '#f0c244', '#56d364'].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
          ))}
        </Box>
        <Typography sx={{ fontFamily: 'inherit', fontSize: 11, color: '#6e7681', flex: 1 }}>
          Terminal{' '}
          {sessionActive && <Box component="span" sx={{ color: '#56d364' }}>● running</Box>}
          {!sessionActive && !socketConnected && (
            <Box component="span" sx={{ color: '#f85149' }}>✕ disconnected — refresh to reconnect</Box>
          )}
        </Typography>

        {/* Spinner while session is active */}
        {sessionActive && <CircularProgress size={10} sx={{ color: '#58a6ff', mr: 1 }} />}

        {/* Kill button — only when session is live */}
        {sessionActive && (
          <Box
            component="span"
            sx={{ fontFamily: 'inherit', fontSize: 11, color: '#f85149', cursor: 'pointer', mr: 1, '&:hover': { color: '#ff7b72' } }}
            onClick={onKill}
          >
            ✕ kill
          </Box>
        )}

        {/* Clear — only when idle and there is output */}
        {!sessionActive && segments.length > 0 && (
          <Box
            component="span"
            sx={{ fontFamily: 'inherit', fontSize: 11, color: '#6e7681', cursor: 'pointer', '&:hover': { color: '#c9d1d9' } }}
            onClick={onClear}
          >
            clear
          </Box>
        )}
      </Box>

      {/* Output area */}
      <Box
        ref={scrollRef}
        sx={{ flex: 1, px: 1.5, py: 1, overflowY: 'auto', lineHeight: 1.65 }}
        onClick={() => inputRef.current?.focus()}
      >
        {segments.length === 0 && !sessionActive && (
          <Box component="span" sx={{ color: '#454c55', fontFamily: 'inherit', fontSize: 12 }}>
            # Click ▶ Run (or Ctrl+Enter) to execute your code
          </Box>
        )}

        {/* Render each segment as a <pre> — raw text with embedded \n rendered correctly */}
        {segments.map((seg, i) => (
          <Box
            key={i}
            component="pre"
            sx={{
              m: 0, p: 0,
              color: SEG_COLOR[seg.type] || '#e6edf3',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              display: 'inline',   // keeps stdout/stdin on same visual line when no \n
            }}
          >
            {seg.text}
          </Box>
        ))}

        {/* "Waiting for input" hint shown after 2s of no output while running */}
        {awaitingInput && sessionActive && (
          <Box sx={{
            mt: 1,
            px: 1,
            py: 0.5,
            bgcolor: '#1c2128',
            border: '1px solid #30363d',
            borderRadius: 1,
            fontFamily: 'inherit',
            fontSize: 11,
            color: '#f0c244',
            display: 'inline-block',
          }}>
            ⌨ Your program is waiting for input — type in the box below and press Enter
          </Box>
        )}
      </Box>

      {/* Interactive stdin input */}
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.75,
        px: 1.5,
        pt: 0.75,
        pb: 1,
        borderTop: '1px solid #21262d',
        bgcolor: '#0d1117',
        flexShrink: 0,
      }}>
        <Box component="span" sx={{
          color: sessionActive ? '#56d364' : '#454c55',
          fontFamily: 'inherit',
          fontSize: 13,
          lineHeight: '20px',
          mt: '1px',
          userSelect: 'none',
          flexShrink: 0,
          transition: 'color 0.2s',
        }}>
          {sessionActive ? '▶' : '$'}
        </Box>
        <Box
          ref={inputRef}
          component="textarea"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!sessionActive && disabled}
          placeholder={sessionActive ? 'Type input and press Enter…' : 'stdin (one value per line) — start by clicking ▶ Run'}
          rows={2}
          sx={{
            flex: 1,
            bgcolor: 'transparent',
            border: 'none',
            outline: 'none',
            color: sessionActive ? '#7ee787' : '#6e7681',
            fontFamily: 'inherit',
            fontSize: 12.5,
            lineHeight: 1.65,
            resize: 'none',
            caretColor: '#7ee787',
            '&::placeholder': { color: '#454c55' },
            '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
          }}
        />
      </Box>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CodeArenaRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isFaculty = ['faculty', 'school_admin'].includes(user?.role);

  const [room, setRoom] = useState(null);
  const [problems, setProblems] = useState([]);
  const [myParticipant, setMyParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGE_PLACEHOLDERS.python);

  // Terminal state
  const [terminalInput, setTerminalInput]     = useState('');
  const [terminalSegs, setTerminalSegs]       = useState([]);   // { type, text }[] — raw chunks
  const [sessionActive, setSessionActive]     = useState(false); // child process is alive
  const [socketConnected, setSocketConnected] = useState(false);
  const [awaitingInput, setAwaitingInput]     = useState(false); // hint: program waiting for stdin
  const awaitingInputTimer                    = useRef(null);

  // Socket ref — created once when the room loads, cleaned up on unmount
  const socketRef = useRef(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const [outputTab, setOutputTab] = useState(0); // 0=terminal, 1=test results

  const [countdown, setCountdown] = useState('');
  const countdownRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // ── Load room ────────────────────────────────────────────────────────────
  const loadRoom = useCallback(async () => {
    try {
      const data = await codeArenaService.getRoom(roomId);
      setRoom(data.room);
      setProblems(data.room?.problems || []);
      setMyParticipant(data.myParticipant);

      if (data.myParticipant?.status !== 'invited') {
        setJoined(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = createExecutionSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => {
      setSocketConnected(false);
      setSessionActive(false);
      setAwaitingInput(false);
      clearTimeout(awaitingInputTimer.current);
    });
    socket.on('connect_error', (err) => {
      setSocketConnected(false);
      console.warn('[CodeArena WS] connect error:', err.message);
    });

    // Stream output chunks — cancel the "awaiting input" hint on any output
    socket.on('code:output', ({ type, text }) => {
      setAwaitingInput(false);
      clearTimeout(awaitingInputTimer.current);
      setTerminalSegs((prev) => [...prev, { type, text }]);
    });

    // Session finished
    socket.on('code:done', ({ exitCode, executionTimeMs, timedOut, limitExceeded, killed }) => {
      setSessionActive(false);
      setAwaitingInput(false);
      clearTimeout(awaitingInputTimer.current);
      let summary;
      if (timedOut) {
        summary = `\nExecution timed out after ${executionTimeMs}ms.`
          + `\nTip: if your code calls input() / scanf / cin, make sure to type input in the box below and press Enter before the timeout.`
          + `\nAlso check for infinite loops.\n`;
      } else if (limitExceeded) {
        summary = `\nOutput limit exceeded (${executionTimeMs}ms) — reduce the amount your program prints.\n`;
      } else if (killed) {
        summary = `\nProcess killed by user (${executionTimeMs}ms)\n`;
      } else if (exitCode !== 0) {
        summary = `\nExited with code ${exitCode ?? '?'} — ${executionTimeMs}ms\n`;
      } else {
        summary = `\nFinished in ${executionTimeMs}ms\n`;
      }
      setTerminalSegs((prev) => [...prev, { type: 'system', text: summary }]);
    });

    // Startup / compile error (session never ran)
    socket.on('code:error', ({ message }) => {
      setSessionActive(false);
      setAwaitingInput(false);
      clearTimeout(awaitingInputTimer.current);
      const label = /[Ss]ecurity/.test(message) ? 'Security violation'
        : /[Cc]ompil/.test(message) ? 'Compilation error'
        : /[Uu]nsupported/.test(message) ? 'Unsupported language'
        : 'Error';
      setTerminalSegs((prev) => [...prev,
        { type: 'stderr', text: `\n[${label}] ${message || 'Unknown error'}\n` },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // run once on mount

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.ends_at) return;
    const tick = () => setCountdown(formatCountdown(room.ends_at));
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [room?.ends_at]);

  // ── Join room ────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    try {
      setJoinLoading(true);
      await codeArenaService.joinRoom(roomId);
      setJoined(true);
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to join room');
    } finally {
      setJoinLoading(false);
    }
  };

  // ── Run code via WebSocket ────────────────────────────────────────────────
  const handleRun = () => {
    if (!code.trim() || sessionActive || submitLoading) return;
    if (!socketRef.current?.connected) {
      setError('Terminal not connected. Please refresh the page.');
      return;
    }

    // Fresh terminal for each run; switch to terminal tab
    setTerminalSegs([{ type: 'system', text: `Running ${language}…\n` }]);
    setTerminalInput('');
    setOutputTab(0);
    setSessionActive(true);
    setAwaitingInput(false);
    clearTimeout(awaitingInputTimer.current);

    // If the program produces no output within 2s it is likely waiting for stdin
    awaitingInputTimer.current = setTimeout(() => setAwaitingInput(true), 2000);

    socketRef.current.emit('code:run', { language, code });
  };

  // ── Send interactive stdin ────────────────────────────────────────────────
  const handleInputSubmit = (line) => {
    if (!sessionActive || !socketRef.current?.connected) return;
    // Dismiss the "waiting for input" hint
    setAwaitingInput(false);
    clearTimeout(awaitingInputTimer.current);
    // Re-arm: if no new output arrives within 2s, show hint again
    awaitingInputTimer.current = setTimeout(() => setAwaitingInput(true), 2000);
    // Echo the typed line in the terminal
    setTerminalSegs((prev) => [...prev, { type: 'stdin', text: '> ' + line + '\n' }]);
    // Clear input field
    setTerminalInput('');
    // Send to the running process
    socketRef.current.emit('code:input', { line });
  };

  // ── Kill running session ──────────────────────────────────────────────────
  const handleKill = () => {
    if (!sessionActive || !socketRef.current?.connected) return;
    setAwaitingInput(false);
    clearTimeout(awaitingInputTimer.current);
    socketRef.current.emit('code:kill');
    // code:done will arrive from server and flip sessionActive → false
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const problem = problems[selectedProblemIdx];
    if (!problem || !code.trim()) return;
    if (!window.confirm(`Submit your ${language} solution for "${problem.title}"?`)) return;

    try {
      setSubmitLoading(true);
      setOutputTab(1);
      const result = await codeArenaService.submitSolution(roomId, problem.id, { language, code });
      setSubmitResult(result);
      await loadRoom();
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────
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
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/codearena')} sx={{ mt: 2 }}>
            Back to CodeArena
          </Button>
        </Box>
      </Layout>
    );
  }

  // Faculty view — redirect to faculty management
  if (isFaculty) {
    navigate(`/codearena/rooms/${roomId}/manage`);
    return null;
  }

  const currentProblem = problems[selectedProblemIdx];

  // Room not started yet
  if (room.status === 'draft') {
    return (
      <Layout>
        <Box sx={{ maxWidth: 500, mx: 'auto', p: 4, textAlign: 'center' }}>
          <Code sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>{room.title}</Typography>
          <Typography color="text.secondary" gutterBottom>This room hasn't started yet.</Typography>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/codearena')} sx={{ mt: 2 }}>
            Back
          </Button>
        </Box>
      </Layout>
    );
  }

  // Must join first
  if (!joined && room.status === 'active') {
    return (
      <Layout>
        <Box sx={{ maxWidth: 480, mx: 'auto', p: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>{room.title}</Typography>
            {room.description && <Typography color="text.secondary" sx={{ mb: 2 }}>{room.description}</Typography>}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip label={room.mode} size="small" color={room.mode === 'exam' ? 'warning' : 'info'} />
              <Chip label={`${room.duration_minutes} min`} size="small" />
              <Chip label={`${problems.length} problems`} size="small" />
            </Stack>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Button variant="contained" fullWidth onClick={handleJoin} disabled={joinLoading}>
              {joinLoading ? <CircularProgress size={20} /> : 'Enter Room'}
            </Button>
          </Paper>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout disablePadding>
      {/* Top bar */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', flexShrink: 0 }}>
        <IconButton size="small" onClick={() => navigate('/codearena')}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }} noWrap>{room.title}</Typography>
        <Chip label={room.mode} size="small" color={room.mode === 'exam' ? 'warning' : 'info'} />
        {room.status === 'active' && countdown && (
          <Chip icon={<Timer sx={{ fontSize: 14 }} />} label={countdown} size="small" color={countdown < '00:10:00' ? 'error' : 'default'} />
        )}
        {room.status === 'ended' && <Chip label="Ended" size="small" color="error" />}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mx: 2, mt: 1 }}>{error}</Alert>}

      {/* Main split layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 112px)' }}>
        {/* LEFT: Problem panel */}
        <Box sx={{
          width: isDesktop ? '40%' : '100%',
          borderRight: isDesktop ? '1px solid' : 'none',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Problem tabs */}
          {problems.length > 1 && (
            <Tabs
              value={selectedProblemIdx}
              onChange={(_, v) => setSelectedProblemIdx(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
            >
              {problems.map((p, i) => (
                <Tab key={p.id} label={`#${i + 1}`} sx={{ minHeight: 40, py: 0.5, fontSize: 12 }} />
              ))}
            </Tabs>
          )}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <ProblemPanel problem={currentProblem} mode={room.mode} />
          </Box>
        </Box>

        {/* RIGHT: Editor + Terminal */}
        {isDesktop && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Code editor */}
            <Box sx={{ flex: 1, p: 1.5, overflowY: 'auto' }}>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                onLanguageChange={(lang) => { setLanguage(lang); setCode(LANGUAGE_PLACEHOLDERS[lang] || ''); }}
                height={380}
                readOnly={room.status === 'ended'}
              />
            </Box>

            {/* Action buttons */}
            <Box sx={{ px: 1.5, py: 0.75, display: 'flex', gap: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={sessionActive ? <CircularProgress size={14} /> : <PlayArrow />}
                onClick={handleRun}
                disabled={sessionActive || submitLoading || !code.trim() || room.status !== 'active'}
              >
                {sessionActive ? 'Running…' : 'Run'}
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={submitLoading ? <CircularProgress size={14} /> : <Send />}
                onClick={handleSubmit}
                disabled={sessionActive || submitLoading || !code.trim() || room.status !== 'active' || !currentProblem}
              >
                Submit
              </Button>
            </Box>

            {/* Terminal + Test Results */}
            <Box sx={{ flex: '0 0 230px', borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Tabs
                value={outputTab}
                onChange={(_, v) => setOutputTab(v)}
                sx={{ minHeight: 34, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}
              >
                <Tab label="Terminal" sx={{ minHeight: 34, py: 0, fontSize: 12 }} />
                <Tab label="Test Results" sx={{ minHeight: 34, py: 0, fontSize: 12 }} />
              </Tabs>

              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {outputTab === 0 && (
                  <TerminalPanel
                    sessionActive={sessionActive}
                    awaitingInput={awaitingInput}
                    socketConnected={socketConnected}
                    segments={terminalSegs}
                    inputValue={terminalInput}
                    onInputChange={setTerminalInput}
                    onInputSubmit={handleInputSubmit}
                    onRun={handleRun}
                    onKill={handleKill}
                    onClear={() => setTerminalSegs([])}
                    disabled={room.status !== 'active' || !code.trim()}
                  />
                )}
                {outputTab === 1 && (
                  <Box sx={{ overflowY: 'auto', height: '100%' }}>
                    {submitResult
                      ? <ResultsPanel results={submitResult.test_results} overallResult={submitResult.result} executionTimeMs={submitResult.execution_time_ms} />
                      : <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2 }}>Submit your solution to see test results.</Typography>
                    }
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export default CodeArenaRoom;

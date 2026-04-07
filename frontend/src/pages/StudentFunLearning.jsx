import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import gamificationService from '../services/gamification';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Divider,
  LinearProgress, Paper, Skeleton, Tooltip, Typography,
} from '@mui/material';
import { useTheme as useMuiTheme, alpha } from '@mui/material/styles';
import {
  EmojiEvents, LocalFireDepartment, PlayArrow, Star,
  CheckCircle, LockOutlined, WorkspacePremium,
} from '@mui/icons-material';

// ── Level config (mirrors backend) ──────────────────────────────────────────
const LEVEL_CONFIG = [
  { level: 1, title: 'Novice',   minXp: 0    },
  { level: 2, title: 'Beginner', minXp: 100  },
  { level: 3, title: 'Learner',  minXp: 250  },
  { level: 4, title: 'Explorer', minXp: 500  },
  { level: 5, title: 'Thinker',  minXp: 800  },
  { level: 6, title: 'Scholar',  minXp: 1200 },
  { level: 7, title: 'Expert',   minXp: 1800 },
  { level: 8, title: 'Elite',    minXp: 2600 },
  { level: 9, title: 'Master',   minXp: 3600 },
  { level: 10, title: 'Legend',  minXp: 5000 },
];

const CATEGORY_META = {
  math:   { label: 'Math Games',    color: '#f59e0b', bg: '#fffbeb', icon: '🧮', desc: 'Speed arithmetic & mental math' },
  memory: { label: 'Memory Games',  color: '#8b5cf6', bg: '#f5f3ff', icon: '🃏', desc: 'Pattern recall & card matching' },
  logic:  { label: 'Logic Games',   color: '#06b6d4', bg: '#ecfeff', icon: '🧩', desc: 'Sequences, puzzles & reasoning' },
  coding: { label: 'Coding Quest',  color: '#10b981', bg: '#ecfdf5', icon: '💻', desc: 'Code reading & computational thinking' },
};

const LEVEL_NAMES = ['basic', 'intermediate', 'advanced'];

const calcLevel = (xp) => {
  let cur = LEVEL_CONFIG[0];
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_CONFIG[i].minXp) { cur = LEVEL_CONFIG[i]; break; }
  }
  const next = LEVEL_CONFIG.find(l => l.level === cur.level + 1);
  return {
    level: cur.level, title: cur.title,
    xpInLevel: xp - cur.minXp,
    xpNeeded: next ? next.minXp - cur.minXp : null,
    pct: next ? Math.min(100, ((xp - cur.minXp) / (next.minXp - cur.minXp)) * 100) : 100,
  };
};

const BADGE_COLOR = { bronze: '#cd7f32', silver: '#a8a9ad', gold: '#ffd700' };

// ── Sub-components ───────────────────────────────────────────────────────────

const XpBanner = ({ stats }) => {
  const lvl = calcLevel(stats.totalXp);
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9d174d 100%)',
        borderRadius: '16px',
        p: { xs: 3, md: 4 },
        color: 'white',
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      {['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.04)'].map((bg, i) => (
        <Box key={i} sx={{
          position: 'absolute', borderRadius: '50%',
          width: i === 0 ? 200 : 140, height: i === 0 ? 200 : 140,
          right: i === 0 ? -40 : 80, top: i === 0 ? -60 : -20,
          backgroundColor: bg,
        }} />
      ))}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', position: 'relative' }}>
        {/* Level badge */}
        <Box sx={{ textAlign: 'center', minWidth: 80 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', fontSize: '1.6rem', mx: 'auto' }}>
            {lvl.level}
          </Avatar>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, mt: 0.5, display: 'block' }}>
            {lvl.title}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {stats.totalXp.toLocaleString()} XP
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocalFireDepartment sx={{ fontSize: 20, color: '#fbbf24' }} />
              <Typography sx={{ fontWeight: 700 }}>{stats.currentStreak} day streak</Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={lvl.pct}
            sx={{
              height: 10, borderRadius: 5,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': { borderRadius: 5, backgroundColor: '#fbbf24' },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {lvl.xpInLevel} / {lvl.xpNeeded ?? '∞'} XP this level
            </Typography>
            {lvl.xpNeeded && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {lvl.xpNeeded - lvl.xpInLevel} XP to next level
              </Typography>
            )}
          </Box>
        </Box>

        {/* Stats chips */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Chip label={`📅 ${stats.weeklyXp} XP this week`}    size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }} />
          <Chip label={`📈 ${stats.monthlyXp} XP this month`}  size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }} />
          <Chip label={`🏆 Best streak: ${stats.longestStreak} days`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }} />
        </Box>
      </Box>
    </Box>
  );
};

const DailyChallengCard = ({ challenge, onPlay, isDark }) => {
  const meta = CATEGORY_META[challenge.category] || {};
  return (
    <Paper
      elevation={0}
      sx={{
        border: `2px solid ${challenge.completed ? (isDark ? alpha('#16a34a', 0.5) : '#bbf7d0') : meta.color + '40'}`,
        borderRadius: '12px',
        p: 2,
        flex: 1,
        minWidth: 180,
        background: challenge.completed ? (isDark ? alpha('#16a34a', 0.2) : '#f0fdf4') : (isDark ? alpha(meta.color, 0.14) : meta.bg),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: '1.5rem' }}>{meta.icon}</Typography>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
            Daily {challenge.category}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            {challenge.game_name}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Chip
          icon={<Star sx={{ fontSize: '14px !important' }} />}
          label={`+${challenge.bonus_xp} XP`}
          size="small"
          sx={{ bgcolor: meta.color, color: 'white', fontWeight: 700, fontSize: '0.7rem' }}
        />
        {challenge.completed
          ? <CheckCircle sx={{ color: '#16a34a', fontSize: 22 }} />
          : (
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrow sx={{ fontSize: '16px !important' }} />}
              onClick={() => onPlay(challenge)}
              sx={{
                background: meta.color,
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '6px',
                fontSize: '0.72rem',
                px: 1.5,
                py: 0.5,
                minWidth: 0,
              }}
            >
              Play
            </Button>
          )
        }
      </Box>
    </Paper>
  );
};

const GameCard = ({ game, progress, onPlay, isDark }) => {
  const meta = CATEGORY_META[game.category] || {};
  const levels = LEVEL_NAMES.map(l => ({
    name: l,
    data: progress[l] || null,
    locked: l === 'intermediate'
      ? !progress.basic?.completed
      : l === 'advanced'
        ? !progress.intermediate?.completed
        : false,
  }));
  const completedCount = levels.filter(l => l.data?.completed).length;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
      }}
    >
      {/* Card header */}
      <Box sx={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`, px: 3, py: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '2rem' }}>{game.icon}</Typography>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                {game.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {meta.label}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>
              {completedCount}/3
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>levels done</Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(completedCount / 3) * 100}
          sx={{
            mt: 1.5, height: 6, borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.25)',
            '& .MuiLinearProgress-bar': { bgcolor: 'white', borderRadius: 3 },
          }}
        />
      </Box>

      {/* Description */}
      <Box sx={{ px: 3, py: 1.5, bgcolor: isDark ? alpha(meta.color, 0.16) : meta.bg }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{game.description}</Typography>
      </Box>

      {/* Levels */}
      <Box sx={{ px: 3, pt: 1.5, pb: 2 }}>
        {levels.map(({ name, data, locked }) => {
          const xpReward = name === 'basic' ? game.base_xp_basic : name === 'intermediate' ? game.base_xp_intermediate : game.base_xp_advanced;
          return (
            <Box key={name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, borderBottom: name !== 'advanced' ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {locked
                  ? <LockOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                  : data?.completed
                    ? <CheckCircle sx={{ fontSize: 16, color: '#16a34a' }} />
                    : <PlayArrow sx={{ fontSize: 16, color: meta.color }} />
                }
                <Typography variant="body2" sx={{ fontWeight: 600, color: locked ? 'text.secondary' : 'text.primary', textTransform: 'capitalize' }}>
                  {name}
                </Typography>
                {data?.best_score > 0 && !locked && (
                  <Chip label={`${data.best_score}%`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'action.hover', color: 'text.primary' }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>+{xpReward} XP</Typography>
                <Button
                  size="small"
                  variant={locked ? 'outlined' : 'contained'}
                  disabled={locked}
                  onClick={() => !locked && onPlay(game, name)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    px: 1.5,
                    py: 0.4,
                    minWidth: 0,
                    borderRadius: '6px',
                    background: locked ? 'transparent' : meta.color,
                    borderColor: locked ? 'divider' : 'transparent',
                    '&:hover': { background: locked ? 'transparent' : meta.color + 'dd' },
                  }}
                >
                  {locked ? 'Locked' : data?.completed ? 'Replay' : 'Play'}
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

const AchievementBadge = ({ ach, isDark }) => (
  <Tooltip title={`${ach.name}: ${ach.description}`} placement="top">
    <Box sx={{
      width: 64, height: 64, borderRadius: '50%',
      bgcolor: ach.earned ? `${BADGE_COLOR[ach.category]}22` : (isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'),
      border: `2px solid ${ach.earned ? BADGE_COLOR[ach.category] : (isDark ? 'rgba(255,255,255,0.2)' : '#e5e7eb')}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.6rem', flexShrink: 0,
      opacity: ach.earned ? 1 : 0.4,
      cursor: 'default',
      transition: 'transform 0.2s',
      '&:hover': { transform: 'scale(1.1)' },
    }}>
      {ach.icon}
    </Box>
  </Tooltip>
);

// ── Main component ─────────────────────────────────────────────────────────-─

const StudentFunLearning = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const theme = useMuiTheme();
  const isDark = theme.palette.mode === 'dark';

  const [stats,        setStats]        = useState(null);
  const [games,        setGames]        = useState([]);
  const [challenges,   setChallenges]   = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [leaderPeriod, setLeaderPeriod] = useState('total');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, gamesRes, challengesRes, achievementsRes, leaderRes] = await Promise.all([
        gamificationService.getStats(),
        gamificationService.getGames(),
        gamificationService.getDailyChallenges(),
        gamificationService.getAchievements(),
        gamificationService.getLeaderboard('total'),
      ]);
      if (statsRes.success)        setStats(statsRes.stats);
      if (gamesRes.success)        setGames(gamesRes.games);
      if (challengesRes.success)   setChallenges(challengesRes.challenges);
      if (achievementsRes.success) setAchievements(achievementsRes.achievements);
      if (leaderRes.success)       setLeaderboard(leaderRes.leaderboard.slice(0, 5));
    } catch {
      setError('Failed to load Fun Learning data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshLeaderboard = async (period) => {
    setLeaderPeriod(period);
    const res = await gamificationService.getLeaderboard(period);
    if (res.success) setLeaderboard(res.leaderboard.slice(0, 5));
  };

  const handlePlayGame  = (game, level) => navigate(`/student/fun-learning/game/${game.slug}?level=${level}`);
  const handlePlayChallenge = (c) => navigate(`/student/fun-learning/game/${c.game_slug}?level=${c.level_name}&challengeId=${c.id}`);

  const byCategory = {};
  for (const g of games) {
    if (!byCategory[g.category]) byCategory[g.category] = [];
    byCategory[g.category].push(g);
  }

  if (loading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rounded" height={140} sx={{ mb: 3, borderRadius: '16px' }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={110} sx={{ flex: 1, borderRadius: '12px' }} />)}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 2 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={260} sx={{ borderRadius: '14px' }} />)}
          </Box>
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error" action={<Button onClick={load} size="small">Retry</Button>}>{error}</Alert>
        </Box>
      </Layout>
    );
  }

  const earnedAchievements  = achievements.filter(a => a.earned);
  const pendingAchievements = achievements.filter(a => !a.earned).slice(0, 4);

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, color: 'text.primary' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary' }}>
            🎮 Fun Learning
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Play games, earn XP, unlock achievements and climb the leaderboard!
          </Typography>
        </Box>

        {/* XP Banner */}
        {stats && <XpBanner stats={stats} />}

        {/* Daily Challenges */}
        {challenges.length > 0 && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: isDark ? alpha('#f59e0b', 0.5) : '#fde68a', borderRadius: '14px', p: 2.5, mb: 3, background: isDark ? alpha('#f59e0b', 0.12) : '#fffbeb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalFireDepartment sx={{ color: '#f59e0b' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#fde68a' : '#92400e' }}>Daily Challenges</Typography>
              <Chip label="Resets in 24h" size="small" sx={{ ml: 'auto', bgcolor: isDark ? alpha('#f59e0b', 0.2) : '#fef3c7', color: isDark ? '#fde68a' : '#92400e', fontWeight: 600, fontSize: '0.7rem' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {challenges.map(c => (
                <DailyChallengCard key={c.id} challenge={c} onPlay={handlePlayChallenge} isDark={isDark} />
              ))}
            </Box>
          </Paper>
        )}

        {/* Game Categories */}
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 2 }}>
          🕹️ Game Library
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 2.5, mb: 4 }}>
          {games.map(g => (
            <GameCard
              key={g.id}
              game={g}
              progress={g.progress || {}}
              onPlay={handlePlayGame}
              isDark={isDark}
            />
          ))}
        </Box>

        {/* Bottom row: Achievements + Leaderboard */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

          {/* Achievements */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WorkspacePremium sx={{ color: '#f59e0b' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>Achievements</Typography>
              <Chip label={`${earnedAchievements.length}/${achievements.length}`} size="small" sx={{ ml: 'auto', bgcolor: isDark ? alpha('#f59e0b', 0.2) : '#fef3c7', color: isDark ? '#fde68a' : '#92400e', fontWeight: 700 }} />
            </Box>

            {earnedAchievements.length > 0 && (
              <>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recently Earned</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 1, mb: 2, flexWrap: 'wrap' }}>
                  {earnedAchievements.slice(0, 6).map(a => (
                    <AchievementBadge key={a.id} ach={a} isDark={isDark} />
                  ))}
                </Box>
                <Divider sx={{ mb: 2 }} />
              </>
            )}

            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {earnedAchievements.length === 0 ? 'Start playing to earn badges!' : 'Next to unlock'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
              {pendingAchievements.map(a => (
                <AchievementBadge key={a.id} ach={a} isDark={isDark} />
              ))}
            </Box>
          </Paper>

          {/* Leaderboard */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEvents sx={{ color: '#fbbf24' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>Leaderboard</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {['total', 'weekly', 'monthly'].map(p => (
                <Chip
                  key={p}
                  label={p.charAt(0).toUpperCase() + p.slice(1)}
                  size="small"
                  clickable
                  onClick={() => refreshLeaderboard(p)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    bgcolor: leaderPeriod === p ? '#4f46e5' : 'action.hover',
                    color:   leaderPeriod === p ? 'white'   : 'text.secondary',
                  }}
                />
              ))}
            </Box>

            {leaderboard.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
                No players yet. Be the first!
              </Typography>
            ) : (
              leaderboard.map((entry, i) => {
                const isMe = entry.id === user?.id;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                return (
                  <Box
                    key={entry.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, py: 1,
                      borderBottom: i < leaderboard.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: isMe ? (isDark ? alpha('#4f46e5', 0.28) : '#ede9fe') : 'transparent',
                      borderRadius: isMe ? '8px' : 0,
                      px: isMe ? 1 : 0,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.1rem', width: 28, textAlign: 'center' }}>{medal}</Typography>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#4f46e5', fontSize: '0.75rem', flexShrink: 0 }}>
                      {entry.first_name?.[0]}{entry.last_name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: isMe ? 800 : 600, color: isMe ? '#a5b4fc' : 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.first_name} {entry.last_name} {isMe && '(You)'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {entry.levelInfo?.title} · Lv.{entry.levelInfo?.level}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem', flexShrink: 0 }}>
                      {entry.displayXp?.toLocaleString()} XP
                    </Typography>
                  </Box>
                );
              })
            )}

            <Button
              fullWidth
              size="small"
              onClick={() => navigate('/student/fun-learning/leaderboard')}
              sx={{ mt: 1.5, textTransform: 'none', color: '#4f46e5', fontWeight: 600 }}
            >
              View Full Leaderboard →
            </Button>
          </Paper>
        </Box>
      </Box>
    </Layout>
  );
};

export default StudentFunLearning;

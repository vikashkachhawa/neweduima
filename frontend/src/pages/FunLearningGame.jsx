import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import gamificationService from '../services/gamification';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Dialog, DialogContent, IconButton, LinearProgress,
  Paper, Tooltip, Typography,
} from '@mui/material';
import { useTheme as useMuiTheme, alpha } from '@mui/material/styles';
import {
  ArrowBack, CheckCircle, EmojiEvents, Lock,
  PlayArrow, Replay, Star, Timer,
} from '@mui/icons-material';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const nearbyWrongs = (answer, count = 3) => {
  const set = new Set();
  while (set.size < count) {
    const delta = Math.floor(Math.random() * 15) + 1;
    const candidate = answer + (Math.random() > 0.5 ? delta : -delta);
    if (candidate !== answer && candidate >= 0) set.add(candidate);
  }
  return [...set];
};

// ─────────────────────────────────────────────────────────────────────────────
// Game 1 — Math Blitz
// ─────────────────────────────────────────────────────────────────────────────
const MATH_TOTAL = 10;

const makeMathQuestion = (level) => {
  let a, b, op, answer;
  if (level === 'basic') {
    op = ['+', '−'][Math.random() > 0.5 ? 1 : 0];
    a  = Math.floor(Math.random() * 20) + 1;
    if (op === '+') { b = Math.floor(Math.random() * 20) + 1; answer = a + b; }
    else             { b = Math.floor(Math.random() * a) + 1;  answer = a - b; }
  } else if (level === 'intermediate') {
    op = ['+', '−', '×', '÷'][Math.floor(Math.random() * 4)];
    if      (op === '×') { a = Math.floor(Math.random() * 12) + 2; b = Math.floor(Math.random() * 12) + 2; answer = a * b; }
    else if (op === '÷') { b = Math.floor(Math.random() * 10) + 2; answer = Math.floor(Math.random() * 10) + 1; a = b * answer; }
    else { a = Math.floor(Math.random() * 50) + 10; b = Math.floor(Math.random() * 50) + 10;
           answer = op === '+' ? a + b : (a >= b ? a - b : (([a, b] = [b, a]), a - b)); }
  } else {
    op = ['+', '−', '×', '÷'][Math.floor(Math.random() * 4)];
    if      (op === '×') { a = Math.floor(Math.random() * 25) + 5; b = Math.floor(Math.random() * 20) + 5; answer = a * b; }
    else if (op === '÷') { b = Math.floor(Math.random() * 12) + 2; answer = Math.floor(Math.random() * 12) + 2; a = b * answer; }
    else { a = Math.floor(Math.random() * 200) + 50; b = Math.floor(Math.random() * 200) + 50;
           if (op === '−' && a < b) [a, b] = [b, a]; answer = op === '+' ? a + b : a - b; }
  }
  return { question: `${a} ${op} ${b} = ?`, answer, choices: shuffle([answer, ...nearbyWrongs(answer)]) };
};

const MathBlitzGame = ({ level, onComplete }) => {
  const TIME_LIMIT = level === 'basic' ? 60 : level === 'intermediate' ? 50 : 40;
  const [questions] = useState(() => Array.from({ length: MATH_TOTAL }, () => makeMathQuestion(level)));
  const [idx,        setIdx]        = useState(0);
  const [correct,    setCorrect]    = useState(0);
  const [chosen,     setChosen]     = useState(null);   // null | 'correct' | 'wrong'
  const [chosenVal,  setChosenVal]  = useState(null);
  const [timeLeft,   setTimeLeft]   = useState(TIME_LIMIT);
  const [done,       setDone]       = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); finishGame(correct); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done]);   // eslint-disable-line

  const finishGame = useCallback((finalCorrect) => {
    setDone(true);
    const score = Math.round((finalCorrect / MATH_TOTAL) * 100);
    onComplete(score, Math.round((Date.now() - startRef.current) / 1000));
  }, [onComplete]);

  const pickAnswer = (val) => {
    if (chosen) return;
    const isRight = val === questions[idx].answer;
    setChosenVal(val);
    setChosen(isRight ? 'correct' : 'wrong');
    const newCorrect = correct + (isRight ? 1 : 0);
    setCorrect(newCorrect);
    setTimeout(() => {
      setChosen(null); setChosenVal(null);
      if (idx + 1 >= MATH_TOTAL) finishGame(newCorrect);
      else setIdx(i => i + 1);
    }, 600);
  };

  const q = questions[idx];
  const timePct = (timeLeft / TIME_LIMIT) * 100;

  return (
    <Box>
      {/* Timer bar */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Question {idx + 1} / {MATH_TOTAL}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Timer sx={{ fontSize: 16, color: timeLeft < 10 ? '#dc2626' : 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: timeLeft < 10 ? '#dc2626' : 'text.secondary' }}>{timeLeft}s</Typography>
          </Box>
        </Box>
        <LinearProgress variant="determinate" value={timePct} sx={{ height: 6, borderRadius: 3, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: timeLeft < 10 ? '#dc2626' : '#4f46e5' } }} />
      </Box>

      {/* Score */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label={`${correct} correct`} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700 }} />
      </Box>

      {/* Question */}
      <Paper elevation={0} sx={{ textAlign: 'center', p: 4, mb: 3, borderRadius: '16px', bgcolor: 'background.paper', border: '2px solid', borderColor: 'divider' }}>
        <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.02em' }}>
          {q.question}
        </Typography>
      </Paper>

      {/* Choices */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {q.choices.map((c, i) => {
          const isChosen = chosenVal === c;
          const color = !chosen ? '#4f46e5' : isChosen && chosen === 'correct' ? '#16a34a' : isChosen && chosen === 'wrong' ? '#dc2626' : !isChosen && chosen && c === q.answer ? '#16a34a' : '#4f46e5';
          return (
            <Button
              key={i}
              variant="outlined"
              onClick={() => pickAnswer(c)}
              sx={{
                py: 2, fontWeight: 800, fontSize: '1.2rem', borderRadius: '12px',
                borderColor: color, color: color,
                bgcolor: !chosen ? 'background.paper' : isChosen && chosen === 'correct' ? '#dcfce7' : isChosen && chosen === 'wrong' ? '#fee2e2' : 'background.paper',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'action.hover', borderColor: '#4f46e5' },
              }}
            >
              {c}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Game 2 — Card Memory
// ─────────────────────────────────────────────────────────────────────────────
const EMOJI_POOL = ['🍎','🍌','🍇','🍓','🍒','🥝','🍊','🌟','🎵','🦋','🌈','🐬','🦊','🐧','🌸','🎯'];

const makeDeck = (pairs) => {
  const emojis = EMOJI_POOL.slice(0, pairs);
  return shuffle([...emojis, ...emojis]).map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
};

const CardMemoryGame = ({ level, onComplete }) => {
  const CFG = {
    basic:        { pairs: 4, time: 120, cols: 4 },
    intermediate: { pairs: 6, time:  90, cols: 4 },
    advanced:     { pairs: 8, time:  60, cols: 4 },
  }[level];

  const [cards,    setCards]    = useState(() => makeDeck(CFG.pairs));
  const [flipped,  setFlipped]  = useState([]);  // up to 2 card indices
  const [matched,  setMatched]  = useState(0);
  const [moves,    setMoves]    = useState(0);
  const [timeLeft, setTimeLeft] = useState(CFG.time);
  const [locked,   setLocked]   = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (matched === CFG.pairs) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); finishGame(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [matched]); // eslint-disable-line

  const finishGame = useCallback(() => {
    const pairs = matched;  // captured by closure
    const score = Math.round((pairs / CFG.pairs) * 100);
    onComplete(score, Math.round((Date.now() - startRef.current) / 1000));
  }, [matched, CFG.pairs, onComplete]);

  useEffect(() => {
    if (matched === CFG.pairs) {
      setTimeout(() => finishGame(), 600);
    }
  }, [matched]); // eslint-disable-line

  const flip = (idx) => {
    if (locked || cards[idx].flipped || cards[idx].matched) return;
    const newCards = [...cards];
    newCards[idx] = { ...newCards[idx], flipped: true };
    setCards(newCards);
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        const matched2 = newCards.map((c, i) => i === a || i === b ? { ...c, matched: true } : c);
        setTimeout(() => {
          setCards(matched2);
          setMatched(m => m + 1);
          setFlipped([]);
          setLocked(false);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(c => c.map((card, i) => i === a || i === b ? { ...card, flipped: false } : card));
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Chip label={`${matched}/${CFG.pairs} pairs`} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700 }} />
        <Chip label={`${moves} moves`} size="small" sx={{ bgcolor: '#ede9fe', color: '#4f46e5', fontWeight: 700 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Timer sx={{ fontSize: 16, color: timeLeft < 15 ? '#dc2626' : 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: timeLeft < 15 ? '#dc2626' : 'text.secondary' }}>{timeLeft}s</Typography>
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={(timeLeft / CFG.time) * 100} sx={{ mb: 2.5, height: 6, borderRadius: 3, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: timeLeft < 15 ? '#dc2626' : '#8b5cf6' } }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${CFG.cols}, 1fr)`, gap: 1.5, maxWidth: 380, mx: 'auto' }}>
        {cards.map((card, i) => (
          <Box
            key={i}
            onClick={() => flip(i)}
            sx={{
              aspectRatio: '1',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: card.flipped || card.matched ? '1.8rem' : '1rem',
              cursor: card.matched ? 'default' : 'pointer',
              bgcolor: card.matched ? '#bbf7d0' : card.flipped ? 'background.paper' : '#4f46e5',
              border: `2px solid ${card.matched ? '#16a34a' : card.flipped ? '#c7d2fe' : '#4338ca'}`,
              transition: 'all 0.2s',
              userSelect: 'none',
              '&:hover': { transform: !card.matched && !card.flipped ? 'scale(1.05)' : 'none' },
            }}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Game 3 — Pattern Logic
// ─────────────────────────────────────────────────────────────────────────────
const SEQUENCES = {
  basic: [
    { seq: [2,4,6,8],         answer: 10,  hint: '+2' },
    { seq: [5,10,15,20],      answer: 25,  hint: '+5' },
    { seq: [100,90,80,70],    answer: 60,  hint: '−10' },
    { seq: [3,6,9,12],        answer: 15,  hint: '+3' },
    { seq: [1,4,9,16],        answer: 25,  hint: 'squares' },
    { seq: [2,4,8,16],        answer: 32,  hint: '×2' },
    { seq: [50,45,40,35],     answer: 30,  hint: '−5' },
    { seq: [1,3,5,7],         answer: 9,   hint: '+2 (odd)' },
  ],
  intermediate: [
    { seq: [1,2,4,7,11],      answer: 16,  hint: '+1,+2,+3,+4,+5' },
    { seq: [2,6,18,54],       answer: 162, hint: '×3' },
    { seq: [3,5,9,15,23],     answer: 33,  hint: '+2,+4,+6,+8,+10' },
    { seq: [1,8,27,64],       answer: 125, hint: 'cubes' },
    { seq: [7,14,28,56],      answer: 112, hint: '×2' },
    { seq: [1,1,2,3,5],       answer: 8,   hint: 'Fibonacci' },
    { seq: [4,8,24,48,144],   answer: 288, hint: '×2,×3,×2,×3' },
    { seq: [100,50,25],       answer: 13,  hint: '÷2 (rounded)' },
  ],
  advanced: [
    { seq: [2,3,5,7,11],               answer: 13,  hint: 'primes' },
    { seq: [0,1,3,6,10,15],            answer: 21,  hint: 'triangular numbers' },
    { seq: [1,2,6,24,120],             answer: 720, hint: 'n! factorial' },
    { seq: [1,5,14,30,55],             answer: 91,  hint: 'sum of squares' },
    { seq: [3,1,4,1,5,9],              answer: 2,   hint: 'digits of π' },
    { seq: [2,5,10,17,26],             answer: 37,  hint: 'n²+1' },
    { seq: [1,4,13,40,121],             answer: 364, hint: '×3+1' },
    { seq: [6,28,496],                 answer: 8128, hint: 'perfect numbers' },
  ],
};

const PATTERN_TOTAL = 8;

const PatternLogicGame = ({ level, onComplete }) => {
  const pool     = shuffle([...SEQUENCES[level]]).slice(0, PATTERN_TOTAL);
  const [questions] = useState(pool.map(q => ({
    ...q,
    choices: shuffle([q.answer, ...nearbyWrongs(q.answer, 3)]),
  })));
  const [idx,       setIdx]       = useState(0);
  const [correct,   setCorrect]   = useState(0);
  const [feedback,  setFeedback]  = useState(null); // 'correct'|'wrong'|null
  const [chosenVal, setChosenVal] = useState(null);
  const [timeLeft,  setTimeLeft]  = useState(level === 'advanced' ? 90 : 120);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(t); finishGame(correct); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  const finishGame = useCallback((c) => {
    const score = Math.round((c / PATTERN_TOTAL) * 100);
    onComplete(score, Math.round((Date.now() - startRef.current) / 1000));
  }, [onComplete]);

  const pick = (val) => {
    if (feedback) return;
    const isRight = val === questions[idx].answer;
    setChosenVal(val); setFeedback(isRight ? 'correct' : 'wrong');
    const nc = correct + (isRight ? 1 : 0);
    setCorrect(nc);
    setTimeout(() => {
      setFeedback(null); setChosenVal(null);
      if (idx + 1 >= PATTERN_TOTAL) finishGame(nc);
      else setIdx(i => i + 1);
    }, 700);
  };

  const q = questions[idx];
  const seqDisplay = [...q.seq, '?'].join('  →  ');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Question {idx+1}/{PATTERN_TOTAL}</Typography>
        <Chip icon={<Timer sx={{ fontSize: '14px !important' }} />} label={`${timeLeft}s`} size="small" sx={{ bgcolor: timeLeft < 15 ? '#fee2e2' : 'action.hover', color: timeLeft < 15 ? '#dc2626' : 'text.secondary', fontWeight: 700 }} />
      </Box>
      <LinearProgress variant="determinate" value={(idx / PATTERN_TOTAL) * 100} sx={{ mb: 3, height: 6, borderRadius: 3, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: '#06b6d4' } }} />

      <Paper elevation={0} sx={{ p: 3.5, mb: 3, borderRadius: '16px', textAlign: 'center', bgcolor: '#ecfeff', border: '2px solid #cffafe' }}>
        <Typography variant="caption" sx={{ color: '#0891b2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', mb: 1 }}>
          Find the next number
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          {seqDisplay}
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {q.choices.map((c, i) => {
          const isChosen = chosenVal === c;
          const bg = !feedback ? 'background.paper'
            : isChosen && feedback === 'correct' ? '#dcfce7'
            : isChosen && feedback === 'wrong'   ? '#fee2e2'
            : !isChosen && feedback && c === q.answer ? '#dcfce7'
            : 'background.paper';
          return (
            <Button key={i} variant="outlined" onClick={() => pick(c)} sx={{
              py: 2, fontWeight: 800, fontSize: '1.1rem', borderRadius: '12px', bgcolor: bg,
              borderColor: !feedback ? '#06b6d4' : isChosen && feedback === 'correct' ? '#16a34a' : isChosen ? '#dc2626' : c === q.answer && feedback ? '#16a34a' : '#06b6d4',
              color: 'text.primary', '&:hover': { bgcolor: 'action.hover', borderColor: '#0284c7' },
            }}>
              {c}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Game 4 — Code Quest
// ─────────────────────────────────────────────────────────────────────────────
const CODE_QUESTIONS = {
  basic: [
    { code: 'x = 10\ny = 5\nprint(x + y)', answer: '15', choices: ['15', '105', '50', '5'] },
    { code: 'name = "Alice"\nage = 12\nprint(age)', answer: '12', choices: ['12', 'Alice', 'age', '0'] },
    { code: 'a = 8\nb = 3\nprint(a - b)', answer: '5', choices: ['5', '11', '83', '3'] },
    { code: 'n = 4\nprint(n * n)', answer: '16', choices: ['16', '8', '44', '12'] },
    { code: 'x = 7\nif x > 5:\n  print("big")\nelse:\n  print("small")', answer: '"big"', choices: ['"big"', '"small"', '7', 'x'] },
    { code: 'total = 0\nfor i in [1,2,3]:\n  total = total + i\nprint(total)', answer: '6', choices: ['6', '3', '0', '123'] },
    { code: 'print(2 ** 3)', answer: '8', choices: ['8', '6', '9', '5'] },
    { code: 'words = ["hi","bye"]\nprint(len(words))', answer: '2', choices: ['2', '5', '0', '1'] },
  ],
  intermediate: [
    { code: 'nums = [1,2,3,4,5]\nprint(nums[2])', answer: '3', choices: ['3', '2', '4', '1'] },
    { code: 'count = 0\nfor i in range(5):\n  if i % 2 == 0:\n    count += 1\nprint(count)', answer: '3', choices: ['3', '2', '5', '1'] },
    { code: 'def double(n):\n  return n * 2\nprint(double(6))', answer: '12', choices: ['12', '6', '3', '62'] },
    { code: 'x = 10\nx += 5\nx -= 3\nprint(x)', answer: '12', choices: ['12', '10', '15', '8'] },
    { code: 'result = ""\nfor c in "cat":\n  result = c + result\nprint(result)', answer: '"tac"', choices: ['"tac"', '"cat"', '"act"', '"atc"'] },
    { code: 'n = 0\nwhile n < 3:\n  n += 1\nprint(n)', answer: '3', choices: ['3', '2', '4', '0'] },
    { code: 's = [3,1,4,1,5]\nprint(max(s))', answer: '5', choices: ['5', '4', '3', '1'] },
    { code: 'a, b = 2, 3\na, b = b, a\nprint(a, b)', answer: '3 2', choices: ['3 2', '2 3', '5 5', '0 0'] },
  ],
  advanced: [
    { code: 'def fib(n):\n  if n <= 1: return n\n  return fib(n-1)+fib(n-2)\nprint(fib(7))', answer: '13', choices: ['13', '8', '21', '12'] },
    { code: 'x = [i**2 for i in range(4)]\nprint(x)', answer: '[0,1,4,9]', choices: ['[0,1,4,9]', '[1,4,9,16]', '[0,2,4,8]', '[1,2,3,4]'] },
    { code: 'def f(n,acc=1):\n  if n==0: return acc\n  return f(n-1,acc*n)\nprint(f(5))', answer: '120', choices: ['120', '25', '60', '110'] },
    { code: 'nums = [1,2,3,4,5]\nresult = list(filter(lambda x: x>2, nums))\nprint(len(result))', answer: '3', choices: ['3', '2', '5', '4'] },
    { code: 'def mystery(lst):\n  return lst[::-1]\nprint(mystery([1,2,3]))', answer: '[3,2,1]', choices: ['[3,2,1]', '[1,2,3]', '[3,1,2]', '[2,1,3]'] },
    { code: 'a = {1:\'a\',2:\'b\',3:\'c\'}\nprint(a.get(5,\'x\'))', answer: '"x"', choices: ['"x"', '"None"', '"5"', '"b"'] },
    { code: 'total=0\nfor i in range(1,6):\n  total+=i\nprint(total/5)', answer: '3.0', choices: ['3.0', '15.0', '5.0', '2.5'] },
    { code: 'def count(lst,x):\n  return sum(1 for i in lst if i==x)\nprint(count([1,2,1,3,1],1))', answer: '3', choices: ['3', '1', '5', '2'] },
  ],
};

const CODE_TOTAL = 8;

const CodeQuestGame = ({ level, onComplete }) => {
  const [questions] = useState(() => shuffle([...CODE_QUESTIONS[level]]).slice(0, CODE_TOTAL));
  const [idx,       setIdx]       = useState(0);
  const [correct,   setCorrect]   = useState(0);
  const [feedback,  setFeedback]  = useState(null);
  const [chosenVal, setChosenVal] = useState(null);
  const [timeLeft,  setTimeLeft]  = useState(level === 'advanced' ? 90 : 120);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(t); finishGame(correct); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  const finishGame = useCallback((c) => {
    onComplete(Math.round((c / CODE_TOTAL) * 100), Math.round((Date.now() - startRef.current) / 1000));
  }, [onComplete]);

  const pick = (val) => {
    if (feedback) return;
    const isRight = val === questions[idx].answer;
    setChosenVal(val); setFeedback(isRight ? 'correct' : 'wrong');
    const nc = correct + (isRight ? 1 : 0);
    setCorrect(nc);
    setTimeout(() => {
      setFeedback(null); setChosenVal(null);
      if (idx + 1 >= CODE_TOTAL) finishGame(nc);
      else setIdx(i => i + 1);
    }, 700);
  };

  const q = questions[idx];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Question {idx+1}/{CODE_TOTAL}</Typography>
        <Chip icon={<Timer sx={{ fontSize: '14px !important' }} />} label={`${timeLeft}s`} size="small" sx={{ bgcolor: timeLeft < 15 ? '#fee2e2' : 'action.hover', color: timeLeft < 15 ? '#dc2626' : 'text.secondary', fontWeight: 700 }} />
      </Box>
      <LinearProgress variant="determinate" value={(idx / CODE_TOTAL) * 100} sx={{ mb: 2.5, height: 6, borderRadius: 3, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />

      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1.5 }}>What does this code print?</Typography>
      <Box sx={{ bgcolor: '#0f172a', borderRadius: '12px', p: 2.5, mb: 3, fontFamily: 'monospace', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
        {q.code}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {q.choices.map((c, i) => {
          const isChosen = chosenVal === c;
          return (
            <Button key={i} variant="outlined" onClick={() => pick(c)} sx={{
              py: 1.5, fontWeight: 700, fontSize: '0.95rem', borderRadius: '10px', fontFamily: 'monospace',
              bgcolor: !feedback ? 'background.paper' : isChosen && feedback === 'correct' ? '#dcfce7' : isChosen ? '#fee2e2' : c === q.answer && feedback ? '#dcfce7' : 'background.paper',
              borderColor: !feedback ? '#10b981' : isChosen && feedback === 'correct' ? '#16a34a' : isChosen ? '#dc2626' : c === q.answer && feedback ? '#16a34a' : '#10b981',
              color: 'text.primary', '&:hover': { bgcolor: 'action.hover', borderColor: '#059669' },
            }}>
              {c}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Game Page
// ─────────────────────────────────────────────────────────────────────────────
const LEVEL_ORDER  = ['basic', 'intermediate', 'advanced'];
const LEVEL_COLORS = { basic: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' };
const LEVEL_XP     = { basic: 10, intermediate: 25, advanced: 50 };

const GAME_COMPONENTS = {
  'math-blitz':    MathBlitzGame,
  'card-memory':   CardMemoryGame,
  'pattern-logic': PatternLogicGame,
  'code-quest':    CodeQuestGame,
};

const FunLearningGame = () => {
  const { gameSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useMuiTheme();
  const isDark = theme.palette.mode === 'dark';

  const defaultLevel   = searchParams.get('level') || 'basic';
  const challengeId    = searchParams.get('challengeId');

  const [gameData,   setGameData]   = useState(null);
  const [progress,   setProgress]   = useState({});
  const [level,      setLevel]      = useState(defaultLevel);
  const [phase,      setPhase]      = useState('select');   // 'select' | 'playing' | 'result'
  const [result,     setResult]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadErr,    setLoadErr]    = useState('');

  useEffect(() => {
    gamificationService.getGames().then(res => {
      if (res.success) {
        const g = res.games.find(g => g.slug === gameSlug);
        if (g) { setGameData(g); setProgress(g.progress || {}); }
        else setLoadErr('Game not found.');
      }
    }).catch(() => setLoadErr('Failed to load game.'));
  }, [gameSlug]);

  const isLocked = (lvl) => {
    if (lvl === 'basic') return false;
    const prev = lvl === 'intermediate' ? 'basic' : 'intermediate';
    return !progress[prev]?.completed;
  };

  const handleGameComplete = async (score, timeSpent) => {
    setPhase('result');
    setSubmitting(true);
    try {
      const res = await gamificationService.submitScore(gameData.id, { gameId: gameData.id, level, score, timeSpent });
      setResult({ score, timeSpent, ...res });

      if (challengeId) {
        await gamificationService.completeDailyChallenge(challengeId, score).catch(() => {});
      }

      // Refresh progress
      const gRes = await gamificationService.getGames();
      if (gRes.success) {
        const g = gRes.games.find(g => g.slug === gameSlug);
        if (g) setProgress(g.progress || {});
      }
    } catch (err) {
      setResult({ score, timeSpent, xpEarned: 0, error: 'Could not save score.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplay = () => { setPhase('select'); setResult(null); };

  const GameComp = GAME_COMPONENTS[gameSlug];

  if (loadErr) return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{loadErr}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/student/fun-learning')} sx={{ mt: 2, textTransform: 'none' }}>Back to Hub</Button>
      </Box>
    </Layout>
  );

  if (!gameData) return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
    </Layout>
  );

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 700, mx: 'auto', color: 'text.primary' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Tooltip title="Back to Fun Learning">
            <IconButton onClick={() => navigate('/student/fun-learning')} sx={{ color: 'text.secondary' }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {gameData.icon} {gameData.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{gameData.description}</Typography>
          </Box>
        </Box>

        {/* Level selector */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {LEVEL_ORDER.map(lvl => {
            const locked  = isLocked(lvl);
            const done    = progress[lvl]?.completed;
            const active  = level === lvl;
            return (
              <Tooltip key={lvl} title={locked ? 'Complete previous level first' : done ? `Best: ${progress[lvl].best_score}%` : 'Click to select'}>
                <Button
                  onClick={() => !locked && setLevel(lvl)}
                  startIcon={locked ? <Lock fontSize="small" /> : done ? <CheckCircle fontSize="small" /> : null}
                  variant={active ? 'contained' : 'outlined'}
                  sx={{
                    flex: 1,
                    textTransform: 'capitalize',
                    fontWeight: 700,
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    background: active ? LEVEL_COLORS[lvl] : 'transparent',
                    borderColor: LEVEL_COLORS[lvl],
                    color: active ? 'white' : locked ? 'text.secondary' : LEVEL_COLORS[lvl],
                    borderStyle: locked ? 'dashed' : 'solid',
                    '&:hover': { background: active ? LEVEL_COLORS[lvl] : LEVEL_COLORS[lvl] + '15' },
                  }}
                >
                  {lvl}
                  <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>
                    (+{LEVEL_XP[lvl]} XP)
                  </Typography>
                </Button>
              </Tooltip>
            );
          })}
        </Box>

        {/* Phase: Select */}
        {phase === 'select' && !isLocked(level) && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>{gameData.icon}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
              Ready to play {gameData.name}?
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Level: <strong style={{ textTransform: 'capitalize' }}>{level}</strong> · Earn up to <strong>{LEVEL_XP[level]} XP</strong>
            </Typography>
            {progress[level]?.best_score > 0 && (
              <Chip label={`Your best: ${progress[level].best_score}%`} size="small" sx={{ mb: 2, bgcolor: isDark ? alpha('#7c3aed', 0.25) : '#ede9fe', color: isDark ? '#c4b5fd' : '#7c3aed', fontWeight: 700 }} />
            )}
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayArrow />}
                onClick={() => setPhase('playing')}
                sx={{ background: LEVEL_COLORS[level], px: 5, py: 1.5, fontWeight: 800, fontSize: '1rem', borderRadius: '12px', textTransform: 'none' }}
              >
                Start Game
              </Button>
            </Box>
          </Paper>
        )}

        {/* Phase: Playing */}
        {phase === 'playing' && GameComp && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 3 }}>
            <GameComp key={`${gameSlug}-${level}`} level={level} onComplete={handleGameComplete} />
          </Paper>
        )}

        {/* Phase: Result overlay */}
        {phase === 'result' && (
          <Paper
            elevation={0}
            sx={{
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: '16px',
              p: 4,
              textAlign: 'center',
              background: isDark
                ? `linear-gradient(135deg, ${alpha('#1f2937', 0.9)} 0%, ${alpha('#374151', 0.9)} 100%)`
                : 'linear-gradient(135deg, #f8fafc 0%, #f3f4f6 100%)',
            }}
          >
            {submitting ? (
              <Box>
                <CircularProgress sx={{ color: '#4f46e5' }} />
                <Typography sx={{ mt: 2, color: 'text.secondary' }}>Saving your score…</Typography>
              </Box>
            ) : (
              <>
                <Typography sx={{ fontSize: '3.5rem', mb: 1 }}>
                  {result?.score >= 90 ? '🎉' : result?.score >= 70 ? '🌟' : result?.score >= 50 ? '👍' : '💪'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mb: 0.5 }}>
                  {result?.score}%
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                  {result?.completed ? 'Level Completed!' : 'Keep practising!'}
                </Typography>

                {result?.error && <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>{result.error}</Alert>}

                {!result?.error && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                    <Chip icon={<Star sx={{ fontSize: '14px !important', color: '#fbbf24 !important' }} />} label={`+${result?.xpEarned ?? 0} XP earned`} sx={{ bgcolor: isDark ? alpha('#f59e0b', 0.2) : '#fef3c7', color: isDark ? '#fde68a' : '#92400e', fontWeight: 700 }} />
                    {result?.streakBonus > 0 && <Chip label={`🔥 +${result.streakBonus} streak bonus!`} sx={{ bgcolor: isDark ? alpha('#ef4444', 0.2) : '#fee2e2', color: isDark ? '#fca5a5' : '#dc2626', fontWeight: 700 }} />}
                    {result?.currentStreak > 1 && <Chip label={`🔥 ${result.currentStreak} day streak`} sx={{ bgcolor: isDark ? alpha('#f97316', 0.2) : '#ffedd5', color: isDark ? '#fdba74' : '#c2410c', fontWeight: 700 }} />}
                  </Box>
                )}

                {/* New achievements */}
                {result?.newAchievements?.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                      🏅 New Achievement{result.newAchievements.length > 1 ? 's' : ''} Unlocked!
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {result.newAchievements.map(a => (
                        <Chip key={a.id} label={`${a.icon} ${a.name}`} sx={{ bgcolor: isDark ? alpha('#f59e0b', 0.2) : '#fef3c7', color: isDark ? '#fde68a' : '#92400e', fontWeight: 700 }} />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Level info */}
                {result?.levelInfo && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Level {result.levelInfo.level} {result.levelInfo.title} · {result?.totalXp?.toLocaleString()} total XP
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" startIcon={<Replay />} onClick={handleReplay} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: '#4f46e5', color: '#4f46e5' }}>
                    Play Again
                  </Button>
                  {result?.completed && level !== 'advanced' && !isLocked(LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1]) && (
                    <Button
                      variant="contained"
                      startIcon={<EmojiEvents />}
                      onClick={() => { setLevel(LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1]); handleReplay(); }}
                      sx={{ background: '#10b981', textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                    >
                      Next Level!
                    </Button>
                  )}
                  <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/student/fun-learning')} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
                    Back to Hub
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        )}
      </Box>
    </Layout>
  );
};

export default FunLearningGame;

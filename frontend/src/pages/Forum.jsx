import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
  InputAdornment,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import Layout from '../components/Layout';
import { forumService } from '../services/forum';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/errorHandling';

const parseTagInput = (value) => {
  return [...new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 15);
};

const truncateText = (text, maxLength = 150) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

const AskQuestionDialog = ({ open, onClose, onSubmit, loading }) => {
  const [title, setTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionTagsInput, setQuestionTagsInput] = useState('');
  const [audience, setAudience] = useState('students');

  const parsedQuestionTags = parseTagInput(questionTagsInput);
  const titleLength = title.trim().length;
  const bodyLength = questionText.trim().length;

  const qualityScore = useMemo(() => {
    let score = 0;
    if (titleLength >= 15) score += 35;
    if (bodyLength >= 80) score += 40;
    if (parsedQuestionTags.length >= 1) score += 25;
    return Math.min(100, score);
  }, [titleLength, bodyLength, parsedQuestionTags.length]);

  const handleSubmit = async () => {
    if (!title.trim() || !questionText.trim()) {
      alert('Title and question are required');
      return;
    }

    if (titleLength < 15) {
      alert('Title must be at least 15 characters');
      return;
    }

    await onSubmit({
      title: title.trim(),
      question: questionText.trim(),
      interests: parsedQuestionTags,
      audience
    });

    // Reset form
    setTitle('');
    setQuestionText('');
    setQuestionTagsInput('');
    setAudience('students');
  };

  const handleClose = () => {
    if (!loading) {
      setTitle('');
      setQuestionText('');
      setQuestionTagsInput('');
      setAudience('students');
      onClose();
    }
  };

  const handleAudienceChange = (_, value) => {
    if (value) {
      setAudience(value);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 700, pt: 3 }}>
        Ask a Question
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            {audience === 'school'
              ? 'Ask operational questions for school updates, events, or administration.'
              : 'Ask academic questions about studies, projects, exams, and learning paths.'}
          </Alert>

          <ToggleButtonGroup
            size="small"
            value={audience}
            exclusive
            onChange={handleAudienceChange}
            fullWidth
          >
            <ToggleButton value="students">For Students</ToggleButton>
            <ToggleButton value="school">For School</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Question title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            helperText={`${titleLength}/120 characters. Be specific and imagine you're asking a question to another person (minimum 15 characters).`}
            inputProps={{ maxLength: 120 }}
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Question"
            value={questionText}
            onChange={(event) => setQuestionText(event.target.value)}
            multiline
            minRows={6}
            helperText={`${bodyLength} characters. Include context, what you tried, and expected result.`}
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Tags"
            value={questionTagsInput}
            onChange={(event) => setQuestionTagsInput(event.target.value)}
            helperText="Add tags by entering them individually, separated by commas"
            fullWidth
            variant="outlined"
          />

          {parsedQuestionTags.length > 0 && (
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
              {parsedQuestionTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => {
                    const updated = parsedQuestionTags.filter((t) => t !== tag);
                    setQuestionTagsInput(updated.join(', '));
                  }}
                />
              ))}
            </Stack>
          )}

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
              <Typography variant="caption" color="text.secondary">Question quality</Typography>
              <Typography variant="caption" color="text.secondary">{qualityScore}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={qualityScore} sx={{ height: 8, borderRadius: 999 }} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || qualityScore < 35}
        >
          {loading ? 'Posting...' : 'Post Question'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Forum = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [askDialogOpen, setAskDialogOpen] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await forumService.listQuestions(query, 50);
      setQuestions(data.questions || []);
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to load forum questions'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAskQuestion = async (formData) => {
    try {
      setPosting(true);
      await forumService.createQuestion({
        title: formData.title,
        question: formData.question,
        interests: formData.interests
      });
      setAskDialogOpen(false);
      await loadQuestions();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to post question'));
    } finally {
      setPosting(false);
    }
  };

  const handleQuestionClick = (questionId) => {
    navigate(`/forum/${questionId}`);
  };

  return (
    <Layout>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Stack Forum
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                Ask interest-based questions and discuss with threaded replies, similar to Stack Overflow.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAskDialogOpen(true)}
              sx={{
                backgroundColor: '#10b981',
                '&:hover': { backgroundColor: '#059669' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              Ask Question
            </Button>
          </Stack>
        </Paper>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search questions..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
              },
            }}
          />
        </Box>

        {/* Questions List */}
        {loading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : questions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '8px' }}>
            <Typography color="text.secondary" variant="body1">
              No questions found. Be the first to ask!
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {questions.map((question) => (
              <Paper
                key={question.id}
                sx={{
                  p: 2.5,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #e5e7eb',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    borderColor: '#3b82f6',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => handleQuestionClick(question.id)}
              >
                <Stack spacing={1.5}>
                  {/* Top Stats Row */}
                  <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ minWidth: 80, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                        {question.replies_count || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(question.replies_count || 0) === 1 ? 'answer' : 'answers'}
                      </Typography>
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#111827' }}>
                        {question.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.5, mb: 1 }}>
                        {truncateText(question.question_text, 200)}
                      </Typography>

                      {/* Tags */}
                      {question.interest_tags && question.interest_tags.length > 0 && (
                        <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                          {question.interest_tags.slice(0, 5).map((tag) => (
                            <Chip key={`${question.id}-${tag}`} label={tag} size="small" variant="outlined" />
                          ))}
                          {question.interest_tags.length > 5 && (
                            <Typography variant="caption" sx={{ color: '#9ca3af', pt: 0.5 }}>
                              +{question.interest_tags.length - 5} more
                            </Typography>
                          )}
                        </Stack>
                      )}

                      {/* Meta */}
                      <Typography variant="caption" color="text.secondary">
                        asked by <strong>{question.author_name}</strong> ({question.role}) on{' '}
                        {new Date(question.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Ask Question Dialog */}
      <AskQuestionDialog
        open={askDialogOpen}
        onClose={() => setAskDialogOpen(false)}
        onSubmit={handleAskQuestion}
        loading={posting}
      />
    </Layout>
  );
};

export default Forum;

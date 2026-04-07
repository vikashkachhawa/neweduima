import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBack, ThumbUp, Delete } from '@mui/icons-material';
import Layout from '../components/Layout';
import { forumService } from '../services/forum';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/errorHandling';

const ReplyEditor = ({ questionId, parentReplyId, onDone, placeholder }) => {
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await forumService.createReply(questionId, {
        reply: replyText.trim(),
        parentReplyId
      });
      setReplyText('');
      onDone?.();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to post reply'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <TextField
        fullWidth
        value={replyText}
        onChange={(event) => setReplyText(event.target.value)}
        placeholder={placeholder}
        multiline
        minRows={4}
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            border: '2px solid #e5e7eb',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#3b82f6',
              backgroundColor: '#fff',
            },
            '&.Mui-focused': {
              borderColor: '#3b82f6',
              backgroundColor: '#fff',
              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
            },
          },
          '& .MuiOutlinedInput-input': {
            padding: '12px',
          },
        }}
        InputProps={{
          endAdornment: (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                pr: 1,
                pb: 1,
                alignItems: 'flex-end',
              }}
            >
              <Button
                variant="contained"
                size="small"
                disabled={!replyText.trim() || submitting}
                onClick={handleReply}
                sx={{
                  background: replyText.trim() && !submitting
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'
                    : '#9ca3af',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '6px',
                }}
              >
                {submitting ? 'Posting...' : 'Reply'}
              </Button>
            </Box>
          ),
        }}
      />
    </Box>
  );
};

const ForumQuestion = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [replyMap, setReplyMap] = useState({});
  const [replyInputFor, setReplyInputFor] = useState({});

  const loadQuestion = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const data = await forumService.getQuestion(questionId);
      setQuestion(data);
    } catch (error) {
      setPageError(getErrorMessage(error, 'Failed to load question'));
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  const loadReplies = async () => {
    try {
      const replies = await forumService.getReplies(questionId);
      setReplyMap({ [questionId]: replies });
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to load replies'));
    }
  };

  useEffect(() => {
    loadQuestion();
    loadReplies();
  }, [loadQuestion]);

  const buildReplyTree = useCallback((replies) => {
    const byId = new Map();
    replies.forEach((reply) => byId.set(reply.id, { ...reply, children: [] }));

    const roots = [];
    byId.forEach((reply) => {
      if (reply.parent_reply_id && byId.has(reply.parent_reply_id)) {
        byId.get(reply.parent_reply_id).children.push(reply);
      } else {
        roots.push(reply);
      }
    });

    return roots;
  }, []);

  const replyTree = useMemo(() => {
    return buildReplyTree(replyMap[questionId] || []);
  }, [replyMap, questionId, buildReplyTree]);

  const renderReply = (reply, level = 0) => {
    const showReplyInput = Boolean(replyInputFor[reply.id]);
    const children = reply.children || [];

    return (
      <Box key={reply.id} sx={{ ml: level > 0 ? 4 : 0, mt: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {reply.author_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(reply.created_at).toLocaleString()}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={reply.user_marked_helpful ? 'Remove helpful mark' : `${reply.helpful_count || 0} people found this helpful`}>
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      const result = await forumService.markReplyHelpful(reply.id);
                      setReplyMap((prev) => ({
                        ...prev,
                        [questionId]: (prev[questionId] || []).map((r) =>
                          r.id === reply.id
                            ? { ...r, helpful_count: result.helpful_count, user_marked_helpful: result.user_marked }
                            : r
                        ),
                      }));
                    } catch (error) {
                      alert(getErrorMessage(error, 'Failed to mark as helpful'));
                    }
                  }}
                  sx={{ color: reply.user_marked_helpful ? '#1d4ed8' : '#9ca3af' }}
                >
                  <ThumbUp fontSize="small" />
                </IconButton>
              </Tooltip>
              {reply.helpful_count > 0 && (
                <Typography variant="caption" sx={{ color: '#3b82f6', minWidth: 12 }}>
                  {reply.helpful_count}
                </Typography>
              )}
              {user?.id === reply.author_user_id && (
                <Tooltip title="Delete reply">
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this reply?')) {
                        try {
                          await forumService.deleteReply(reply.id);
                          await loadReplies();
                          await loadQuestion();
                        } catch (error) {
                          alert(getErrorMessage(error, 'Failed to delete reply'));
                        }
                      }
                    }}
                    sx={{ color: '#ef4444' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
          <Typography variant="body2" sx={{ mt: 1.2, lineHeight: 1.6 }}>
            {reply.reply_text}
          </Typography>
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => setReplyInputFor((prev) => ({ ...prev, [reply.id]: !prev[reply.id] }))}
          >
            {showReplyInput ? 'Cancel' : 'Reply'}
          </Button>
          {showReplyInput && (
            <ReplyEditor
              questionId={questionId}
              parentReplyId={reply.id}
              placeholder="Reply to this answer"
              onDone={async () => {
                setReplyInputFor((prev) => ({ ...prev, [reply.id]: false }));
                await loadReplies();
                await loadQuestion();
              }}
            />
          )}
        </Paper>
        {children.map((child) => renderReply(child, level + 1))}
      </Box>
    );
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

  if (pageError || !question) {
    return (
      <Layout>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/forum')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back to Forum
          </Button>
        </Box>
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          {pageError || 'Question not found'}
        </Alert>
      </Layout>
    );
  }

  const replies = replyMap[questionId] || [];

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        {/* Back button */}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/forum')}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#3b82f6' }}
          >
            Back to Forum
          </Button>
        </Box>

        {/* Question Card */}
        <Paper sx={{ borderRadius: '12px', overflow: 'hidden', mb: 3 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              px: 3,
              py: 2.5,
              color: 'white',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              {question.title}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2">
                asked by <strong>{question.author_name}</strong> ({question.role})
              </Typography>
              <Typography variant="body2">
                {new Date(question.created_at).toLocaleString()}
              </Typography>
            </Stack>
          </Box>

          <CardContent sx={{ px: 3, py: 2.5 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.8, mb: 2 }}>
              {question.question_text}
            </Typography>

            {question.interest_tags && question.interest_tags.length > 0 && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                {question.interest_tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 2 }}>
              <Tooltip title={question.user_marked_helpful ? 'Remove helpful mark' : `${question.helpful_count || 0} people found this helpful`}>
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      const result = await forumService.markQuestionHelpful(question.id);
                      setQuestion((prev) => ({
                        ...prev,
                        helpful_count: result.helpful_count,
                        user_marked_helpful: result.user_marked,
                      }));
                    } catch (error) {
                      alert(getErrorMessage(error, 'Failed to mark as helpful'));
                    }
                  }}
                  sx={{ color: question.user_marked_helpful ? '#1d4ed8' : '#9ca3af' }}
                >
                  <ThumbUp fontSize="small" />
                </IconButton>
              </Tooltip>
              {question.helpful_count > 0 && (
                <Typography variant="caption" sx={{ color: '#3b82f6', mr: 1 }}>
                  {question.helpful_count}
                </Typography>
              )}
              {user?.id === question.author_user_id && (
                <Tooltip title="Delete question">
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this question? This cannot be undone.')) {
                        try {
                          await forumService.deleteQuestion(question.id);
                          navigate('/forum');
                        } catch (error) {
                          alert(getErrorMessage(error, 'Failed to delete question'));
                        }
                      }
                    }}
                    sx={{ color: '#ef4444' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </CardContent>
        </Paper>

        {/* Replies Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {replies.length} {replies.length === 1 ? 'Answer' : 'Answers'}
          </Typography>

          <Box sx={{ mb: 3 }}>
            <ReplyEditor
              questionId={questionId}
              placeholder="Share your answer..."
              onDone={async () => {
                await loadReplies();
                await loadQuestion();
              }}
            />
          </Box>

          {replyTree.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No answers yet. Be the first to answer!
            </Typography>
          ) : (
            <Box>
              {replyTree.map((reply) => renderReply(reply))}
            </Box>
          )}
        </Box>
      </Box>
    </Layout>
  );
};

export default ForumQuestion;

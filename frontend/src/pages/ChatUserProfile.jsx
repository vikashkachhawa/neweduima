import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import { chatService } from '../services/chat';
import { getErrorMessage } from '../utils/errorHandling';

const getInitials = (firstName, lastName, email = '') => {
  const first = String(firstName || '').trim().charAt(0).toUpperCase();
  const last = String(lastName || '').trim().charAt(0).toUpperCase();
  const initials = `${first}${last}`;
  if (initials) return initials;

  const emailInitial = String(email || '').trim().charAt(0).toUpperCase();
  return emailInitial || 'U';
};

const ChatUserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const targetUserId = Number(userId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const list = await chatService.getConnections();
        setConnections(list);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load profile'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const profile = useMemo(() => {
    return connections.find((item) => Number(item.user_id) === targetUserId) || null;
  }, [connections, targetUserId]);

  return (
    <Layout>
      <Box sx={{ maxWidth: 760, mx: 'auto', py: 2 }}>
        <Button
          onClick={() => navigate('/chat')}
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, mb: 2 }}
        >
          Back to Chat
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !profile ? (
          <Alert severity="info">This user profile is not available in your connections.</Alert>
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Avatar
                  src={profile.profile_image_url || ''}
                  sx={{ width: 86, height: 86, fontSize: '1.8rem', fontWeight: 800, bgcolor: '#1d4ed8' }}
                >
                  {getInitials(profile.first_name, profile.last_name, profile.email)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {profile.first_name} {profile.last_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {profile.email || 'Email not available'}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                    <Chip label={profile.role || 'user'} size="small" />
                    <Chip label={profile.school_name || 'School not set'} size="small" variant="outlined" />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Layout>
  );
};

export default ChatUserProfile;

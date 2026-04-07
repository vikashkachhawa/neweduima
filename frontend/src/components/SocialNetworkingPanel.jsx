import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Tab,
  Tabs,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Group,
  Search,
  School,
  Send
} from '@mui/icons-material';
import { socialService } from '../services/social';

const SocialNetworkingPanel = ({ compact = false }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchFilter, setSearchFilter] = useState('users');
  const [summary, setSummary] = useState({
    connections: 0,
    incomingRequests: 0,
    outgoingRequests: 0,
    pagesFollowing: 0
  });
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [pageResults, setPageResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const getAvatarProps = (item) => {
    const src = item.profile_photo || item.profile_picture || item.avatar_url || item.image_url || '';
    const initial = item.first_name?.[0] || item.email?.[0] || 'U';

    return {
      src: src || undefined,
      sx: { width: 40, height: 40, bgcolor: '#0f766e' },
      children: initial.toUpperCase()
    };
  };

  const visibleConnections = useMemo(() => {
    if (compact) {
      return connections.slice(0, 4);
    }

    return connections.slice(0, 10);
  }, [compact, connections]);

  const filteredResults = useMemo(() => {
    if (searchFilter === 'pages') {
      return pageResults;
    }

    return peopleResults;
  }, [pageResults, peopleResults, searchFilter]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryData, connectionsData, requestData] = await Promise.all([
        socialService.getSummary(),
        socialService.getConnections(),
        socialService.getRequests()
      ]);

      setSummary(summaryData);
      setConnections(connectionsData);
      setRequests(requestData);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load social data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const runUnifiedSearch = async (query) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setPeopleResults([]);
      setPageResults([]);
      return;
    }

    try {
      setSearching(true);
      const [users, pages] = await Promise.all([
        socialService.searchUsers(trimmedQuery),
        socialService.searchPages(trimmedQuery)
      ]);
      setPeopleResults(users);
      setPageResults(pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to search users and pages');
    } finally {
      setSearching(false);
    }
  };

  const handleUnifiedSearch = async () => {
    await runUnifiedSearch(searchQuery);
  };

  const handleConnect = async (userId) => {
    try {
      await socialService.sendConnectionRequest(userId);
      await Promise.all([loadDashboard(), runUnifiedSearch(searchQuery)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send connection request');
    }
  };

  const handleRespond = async (requestId, action) => {
    try {
      await socialService.respondToRequest(requestId, action);
      await Promise.all([loadDashboard(), runUnifiedSearch(searchQuery)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to respond to request');
    }
  };

  const handleTogglePageFollow = async (schoolId, isFollowing) => {
    try {
      if (isFollowing) {
        await socialService.unfollowPage(schoolId);
      } else {
        await socialService.followPage(schoolId);
      }

      await Promise.all([loadDashboard(), runUnifiedSearch(searchQuery)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update page follow');
    }
  };

  if (loading) {
    return (
      <Card elevation={1}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={26} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="warning">{error}</Alert>}

      <Card elevation={1}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            Connect Hub
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<Group />} label={`Connections: ${summary.connections}`} color="primary" variant="outlined" />
            <Chip icon={<Send />} label={`Incoming: ${summary.incomingRequests}`} color="warning" variant="outlined" />
            <Chip icon={<School />} label={`Pages: ${summary.pagesFollowing}`} color="success" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={1}>
        <Box
          sx={{
            px: 2,
            pt: 2,
            background: 'linear-gradient(180deg, rgba(15,118,110,0.08) 0%, rgba(255,255,255,0) 100%)'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, nextTab) => setActiveTab(nextTab)}
            variant="fullWidth"
          >
            <Tab label="Connections" />
            <Tab label="Find New" />
          </Tabs>
        </Box>
        <CardContent>
          {activeTab === 0 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Connected With You
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  People you are already connected with appear here by default.
                </Typography>
              </Box>

              {visibleConnections.length > 0 ? (
                <Stack spacing={1}>
                  {visibleConnections.map((connection) => (
                    <Box
                      key={`${connection.id}-${connection.user_id}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.2,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar {...getAvatarProps(connection)} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {connection.first_name} {connection.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {connection.school_name || 'School not added'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip size="small" color="success" icon={<CheckCircle />} label="Connected" />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No connections yet. Open Find New to discover people.</Alert>
              )}

              {requests.incoming.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Incoming Requests
                  </Typography>
                  <Stack spacing={1}>
                    {requests.incoming.slice(0, compact ? 2 : 5).map((request) => (
                      <Box
                        key={request.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1.2,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {request.first_name} {request.last_name}
                        </Typography>
                        <Stack direction="row" spacing={0.8}>
                          <Button size="small" variant="contained" onClick={() => handleRespond(request.id, 'accept')}>Accept</Button>
                          <Button size="small" variant="outlined" onClick={() => handleRespond(request.id, 'reject')}>Reject</Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          )}

          {activeTab === 1 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Find New Connections
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Search once, then switch between people and pages.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleUnifiedSearch();
                    }
                  }}
                  placeholder="Search users and pages"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleUnifiedSearch}
                  disabled={searching}
                >
                  {searching ? <CircularProgress size={16} color="inherit" /> : 'Search'}
                </Button>
              </Stack>

              <Typography variant="caption" color="text.secondary">
                People show a Connect button. Pages show a Follow button.
              </Typography>

              <Tabs
                value={searchFilter}
                onChange={(_, value) => setSearchFilter(value)}
                variant="standard"
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    minWidth: 84,
                    px: 1.5,
                    py: 0.5,
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }
                }}
              >
                <Tab value="users" label={`Users${peopleResults.length ? ` (${peopleResults.length})` : ''}`} />
                <Tab value="pages" label={`Pages${pageResults.length ? ` (${pageResults.length})` : ''}`} />
              </Tabs>

              <Stack spacing={1}>
                {searchFilter === 'users' && filteredResults.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.2,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                      <Avatar {...getAvatarProps(item)} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                          {item.first_name} {item.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {item.school_name || 'School not added'}
                        </Typography>
                      </Box>
                    </Stack>

                    {item.relationship === 'connected' ? (
                      <Chip size="small" color="success" icon={<CheckCircle />} label="Connected" />
                    ) : item.relationship === 'outgoing_pending' ? (
                      <Chip size="small" color="warning" label="Request Sent" />
                    ) : item.relationship === 'incoming_pending' ? (
                      <Stack direction="row" spacing={0.6}>
                        <Button size="small" variant="contained" onClick={() => handleRespond(item.connection_id, 'accept')}>Accept</Button>
                        <Button size="small" variant="outlined" onClick={() => handleRespond(item.connection_id, 'reject')}>Reject</Button>
                      </Stack>
                    ) : (
                      <Button size="small" variant="contained" startIcon={<Add />} onClick={() => handleConnect(item.id)}>
                        Connect
                      </Button>
                    )}
                  </Box>
                ))}

                {searchFilter === 'pages' && filteredResults.map((page) => (
                  <Box
                    key={page.school_id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.2,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {page.school_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        Followers: {page.follower_count || 0}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={page.is_following ? 'outlined' : 'contained'}
                      onClick={() => handleTogglePageFollow(page.school_id, page.is_following)}
                    >
                      {page.is_following ? 'Following' : 'Follow'}
                    </Button>
                  </Box>
                ))}

                {searchQuery.trim().length >= 2 && !searching && filteredResults.length === 0 && (
                  <Alert severity="info">
                    {searchFilter === 'users' ? 'No users found.' : 'No pages found.'}
                  </Alert>
                )}
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default SocialNetworkingPanel;

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { schoolService } from '../services';
import { platformControlsService } from '../services/platformControls';
import { useAuth } from '../contexts/AuthContext';
import { 
  Alert,
  Box, 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  CircularProgress,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  List,
  ListItem, 
  ListItemText, 
  Stack,
  TextField,
  Typography 
} from '@mui/material';
import { Add, Campaign } from '@mui/icons-material';

const Announcements = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '' });

    const isSuperAdmin = user?.role === 'super_admin';

    const normalizeAnnouncements = (items = []) => items.map((announcement) => ({
        ...announcement,
        message: announcement.message || announcement.content || ''
    }));

    useEffect(() => {
        const loadAnnouncements = async () => {
            setLoading(true);
            setError('');
            try {
                const data = isSuperAdmin
                    ? await platformControlsService.getAllAnnouncements()
                    : await schoolService.getAnnouncements();
                setAnnouncements(normalizeAnnouncements(data.announcements || []));
            } catch (err) {
                console.error('Failed to load announcements', err);
                setError('Unable to load announcements.');
            } finally {
                setLoading(false);
            }
        };
        loadAnnouncements();
    }, [isSuperAdmin]);

    const handlePublish = async () => {
        setError('');
        setMessage('');

        if (!formData.title || !formData.message) {
            setError('Title and message are required.');
            return;
        }

        setCreating(true);
        try {
            if (isSuperAdmin) {
                await platformControlsService.createAnnouncement({
                    title: formData.title,
                    content: formData.message,
                    type: 'notice',
                    priority: 'medium'
                });
            } else {
                await schoolService.createAnnouncement(formData);
            }
            setMessage('Announcement published.');
            setFormData({ title: '', message: '' });
            setOpen(false);
            // Reload announcements
            const data = isSuperAdmin
                ? await platformControlsService.getAllAnnouncements()
                : await schoolService.getAnnouncements();
            setAnnouncements(normalizeAnnouncements(data.announcements || []));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to publish announcement.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <Layout>
            <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                            Announcements
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            School-wide messages and updates
                        </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
                        New Announcement
                    </Button>
                </Box>

                {(error || message) && (
                    <Box sx={{ mb: 2 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        {message && <Alert severity="success">{message}</Alert>}
                    </Box>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Card elevation={2}>
                        <CardContent sx={{ p: 3 }}>
                            {announcements.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No announcements yet.
                                </Typography>
                            ) : (
                                <List sx={{ width: '100%' }}>
                                    {announcements.map((ann, idx) => (
                                        <ListItem key={ann.id || idx} sx={{ borderBottom: idx < announcements.length - 1 ? '1px solid' : 'none', borderColor: 'divider', py: 2 }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <Campaign sx={{ color: 'primary.main', fontSize: 20 }} />
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {ann.title}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {ann.message}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                            Posted on {new Date(ann.created_at || Date.now()).toLocaleDateString()}
                                                        </Typography>
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Dialog open={open} onClose={() => { setOpen(false); setError(''); }} maxWidth="sm" fullWidth>
                    <DialogTitle>Create New Announcement</DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                label="Message"
                                multiline
                                rows={4}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                            {error && <Alert severity="error">{error}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { setOpen(false); setError(''); }}>Cancel</Button>
                        <Button variant="contained" onClick={handlePublish} disabled={creating}>
                            {creating ? 'Publishing...' : 'Publish'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};

export default Announcements;

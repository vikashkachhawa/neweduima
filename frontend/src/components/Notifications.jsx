import React, { useEffect, useMemo, useState } from 'react';
import { 
    IconButton, 
    Badge, 
    Menu, 
    MenuItem, 
    Typography, 
    Box, 
    Divider,
    Chip,
    List,
    ListItem,
    ListItemText,
    Button,
    CircularProgress
} from '@mui/material';
import { 
    Notifications as NotificationsIcon, 
    CheckCircle,
    Comment,
    Favorite,
    PersonAdd,
    Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notifications';
import { getErrorMessage } from '../utils/errorHandling';

const Notifications = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadNotifications = async ({ silent = false } = {}) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            setError('');
            const data = await notificationService.getNotifications(25, 0);
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load notifications'));
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadNotifications();

        const intervalId = window.setInterval(() => {
            loadNotifications({ silent: true });
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, []);

    const visibleNotifications = useMemo(() => notifications.slice(0, 20), [notifications]);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        loadNotifications({ silent: true });
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const getIcon = (type) => {
        switch(type) {
            case 'connection_request':
            case 'incoming_request':
                return <PersonAdd sx={{ color: 'primary.main', fontSize: 20 }} />;
            case 'post_like':
                return <Favorite sx={{ color: 'error.main', fontSize: 20 }} />;
            case 'post_comment':
                return <Comment sx={{ color: 'info.main', fontSize: 20 }} />;
            case 'profile_visit':
                return <Visibility sx={{ color: 'success.main', fontSize: 20 }} />;
            default:
                return <CheckCircle sx={{ color: 'text.secondary', fontSize: 20 }} />;
        }
    };

    const formatRelativeTime = (value) => {
        const date = new Date(value);
        const diffInSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day ago`;
        return date.toLocaleDateString();
    };

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.is_read) {
                await notificationService.markRead(notification.id);
                setNotifications((prev) => prev.map((item) => (
                    item.id === notification.id ? { ...item, is_read: 1, read_at: new Date().toISOString() } : item
                )));
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }

            handleClose();

            if (notification.metadata?.path) {
                navigate(notification.metadata.path);
            }
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to update notification'));
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
            setUnreadCount(0);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to mark notifications as read'));
        }
    };

    return (
        <>
            <IconButton 
                onClick={handleClick}
                sx={{ 
                    color: 'inherit',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                }}
            >
                <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: 360,
                        maxHeight: 500,
                        mt: 1.5
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Notifications
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {unreadCount > 0 && (
                            <Chip label={`${unreadCount} new`} size="small" color="primary" />
                        )}
                        <Button size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                            Mark all read
                        </Button>
                    </Box>
                </Box>
                <Divider />

                {error && (
                    <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="caption" color="error">
                            {error}
                        </Typography>
                    </Box>
                )}
                
                <List sx={{ p: 0 }}>
                    {loading ? (
                        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={22} />
                        </Box>
                    ) : visibleNotifications.length === 0 ? (
                        <MenuItem>
                            <Typography variant="body2" color="text.secondary">
                                No notifications
                            </Typography>
                        </MenuItem>
                    ) : (
                        visibleNotifications.map((notification) => (
                            <ListItem 
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                sx={{ 
                                    cursor: 'pointer',
                                    backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    py: 1.5,
                                    '&:hover': { backgroundColor: 'action.selected' }
                                }}
                            >
                                <Box sx={{ mr: 1.5 }}>
                                    {getIcon(notification.type)}
                                </Box>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 400 : 600 }}>
                                            {notification.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                                {notification.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatRelativeTime(notification.created_at)}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))
                    )}
                </List>
                
                <Divider />
                <Box sx={{ p: 1 }}>
                    <MenuItem onClick={() => { handleClose(); loadNotifications({ silent: true }); }} sx={{ justifyContent: 'center', color: 'primary.main' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Refresh Notifications
                        </Typography>
                    </MenuItem>
                </Box>
            </Menu>
        </>
    );
};

export default Notifications;

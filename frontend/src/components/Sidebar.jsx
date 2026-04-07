import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import ThemeToggle from './ThemeToggle';
import Notifications from './Notifications';
import { chatService } from '../services/chat';
import groupManagementService from '../services/groupManagement';
import { 
    Box, 
    Drawer, 
    List, 
    ListItem, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText, 
    Divider, 
    Typography,
    Avatar,
    Badge,
    IconButton,
    Chip,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { 
    Dashboard as DashboardIcon,
    School as SchoolIcon,
    Public as PublicIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    SportsEsports as SportsEsportsIcon,
    Class as ClassIcon,
    Assignment as AssignmentIcon,
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    Forum as ForumIcon,
    TrendingUp as TrendingUpIcon,
    CheckCircle as CheckCircleIcon,
    Grade as GradeIcon,
    MenuBook as MenuBookIcon,
    Logout as LogoutIcon,
    Payment as PaymentIcon,
    Settings as SettingsIcon,
    Security as SecurityIcon,
    Analytics as AnalyticsIcon,
    Campaign as CampaignIcon,
    AdminPanelSettings as AdminPanelSettingsIcon,
    Menu as MenuIcon,
    Close as CloseIcon,
    EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);

    useEffect(() => {
        const canUseChat = ['school_admin', 'faculty', 'student'].includes(user?.role);
        if (!canUseChat) {
            setChatUnreadCount(0);
            return undefined;
        }

        let isMounted = true;

        const loadUnreadCount = async () => {
            try {
                const [chatUnread, groupResponse] = await Promise.all([
                    chatService.getUnreadCount(),
                    groupManagementService.getMyGroups({ sort: 'latest', limit: 100 })
                ]);

                const groups = Array.isArray(groupResponse?.groups)
                    ? groupResponse.groups
                    : Array.isArray(groupResponse)
                        ? groupResponse
                        : [];

                const groupUnread = groups.reduce(
                    (total, group) => total + Number(group?.unread_count || 0),
                    0
                );

                if (isMounted) {
                    setChatUnreadCount(Number(chatUnread || 0) + groupUnread);
                }
            } catch {
                if (isMounted) {
                    setChatUnreadCount(0);
                }
            }
        };

        loadUnreadCount();
        const intervalId = window.setInterval(loadUnreadCount, 5000);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [user?.role]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const canAccessSuperAdminLink = (permission) => {
        if (user?.role === 'super_admin') {
            return true;
        }

        return permission ? hasPermission(permission) : true;
    };

    const getSidebarLinks = () => {
        const links = [];
        
        // Add role-specific dashboard
        if (user?.role === 'faculty') {
            // Faculty uses their own dashboard, no generic dashboard
        } else if (user?.role === 'student') {
            // Student uses their own dashboard, no generic dashboard
        } else {
            // Admin roles use generic dashboard
            links.push({ path: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard', permission: null });
        }

        // Super Admin links
        if (canAccessSuperAdminLink('school.list')) {
            links.push({ path: '/schools', icon: <SchoolIcon />, label: 'Schools', permission: 'school.list' });
        }
        if (canAccessSuperAdminLink('user.list')) {
            links.push({ path: '/users', icon: <PeopleIcon />, label: 'Users', permission: 'user.list' });
        }
        if (canAccessSuperAdminLink('role.list')) {
            links.push({ path: '/roles', icon: <AdminPanelSettingsIcon />, label: 'Roles & Permissions', permission: 'role.list' });
        }
        if (canAccessSuperAdminLink('report.view')) {
            links.push({ path: '/analytics', icon: <AnalyticsIcon />, label: 'Analytics', permission: 'report.view' });
        }

        // Generic links
        if (hasPermission('announcement.list') || user?.role === 'super_admin') {
            links.push({ path: '/announcements', icon: <CampaignIcon />, label: 'Announcements', permission: 'announcement.list' });
        }
        if (user?.role === 'super_admin') {
            links.push({ path: '/templates', icon: <MenuBookIcon />, label: 'Templates', permission: null });
            links.push({ path: '/subscriptions', icon: <PaymentIcon />, label: 'Subscriptions', permission: null });
            links.push({ path: '/system-settings', icon: <SettingsIcon />, label: 'System Settings', permission: null });
            links.push({ path: '/security', icon: <SecurityIcon />, label: 'Security', permission: null });
        }

        // School Admin links
        if (user?.role === 'school_admin') {
            links.push({ path: '/school-admin', icon: <PeopleIcon />, label: 'School Users', permission: null });
            links.push({ path: '/template-library', icon: <MenuBookIcon />, label: 'Template Library', permission: null });
            const adminSchoolId = user?.schoolId || user?.school_id;
            links.push({ path: `/school-page/${adminSchoolId || ''}`, icon: <CampaignIcon />, label: 'School Page', permission: null });
            links.push({ path: '/social-hub', icon: <PublicIcon />, label: 'Connect Hub', permission: null });
            links.push({ path: '/forum', icon: <ForumIcon />, label: 'Forum', permission: null });
            links.push({ path: '/chat', icon: <ChatBubbleOutlineIcon />, label: 'Chat', permission: null, showChatUnread: true });
            links.push({ path: '/codearena', icon: <EmojiEventsIcon />, label: 'CodeArena', permission: null });
        }

        // Faculty links
        if (user?.role === 'faculty') {
            links.push({ path: '/faculty/profile', icon: <PersonIcon />, label: 'Profile', permission: null });
            links.push({ path: '/faculty/classes', icon: <ClassIcon />, label: 'My Classes', permission: null });
            links.push({ path: '/faculty/students', icon: <PeopleIcon />, label: 'Students', permission: null });
            links.push({ path: '/faculty/assignments', icon: <AssignmentIcon />, label: 'Assignments', permission: null });
            links.push({ path: '/faculty/attendance', icon: <CheckCircleIcon />, label: 'Attendance', permission: null });
            links.push({ path: '/faculty/schedule', icon: <MenuBookIcon />, label: 'Schedule', permission: null });
            links.push({ path: '/social-hub', icon: <PublicIcon />, label: 'Connect Hub', permission: null });
            links.push({ path: '/forum', icon: <ForumIcon />, label: 'Forum', permission: null });
            links.push({ path: '/chat', icon: <ChatBubbleOutlineIcon />, label: 'Chat', permission: null, showChatUnread: true });
            links.push({ path: '/codearena', icon: <EmojiEventsIcon />, label: 'CodeArena', permission: null });
        }

        // Student links
        if (user?.role === 'student') {
            links.push({ path: '/student/profile', icon: <PersonIcon />, label: 'Profile', permission: null });
            links.push({ path: '/student/fun-learning', icon: <SportsEsportsIcon />, label: 'Fun Learning', permission: null });
            links.push({ path: '/social-hub', icon: <PublicIcon />, label: 'Connect Hub', permission: null });
            links.push({ path: '/forum', icon: <ForumIcon />, label: 'Forum', permission: null });
            links.push({ path: '/chat', icon: <ChatBubbleOutlineIcon />, label: 'Chat', permission: null, showChatUnread: true });
            links.push({ path: '/codearena', icon: <EmojiEventsIcon />, label: 'CodeArena', permission: null });
        }

        return links;
    };

    const links = getSidebarLinks();

    const drawerContent = (
        <>
            {/* Logo/Brand */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                        sx={{
                            width: 40,
                            height: 40,
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                        }}
                    >
                        <SchoolIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#f9fafb' }}>
                            EduIMA
                        </Typography>
                        <Chip
                            label={user?.role?.replace('_', ' ')}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                                color: '#38bdf8',
                            }}
                        />
                    </Box>
                </Box>
                {isMobile && (
                    <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#f9fafb' }}>
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>

            {/* Navigation Links */}
            <List sx={{ flexGrow: 1, py: 2, px: 2 }}>
                {links.map((link) => (
                    <ListItem key={link.path} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            component={NavLink}
                            to={link.path}
                            onClick={() => isMobile && setMobileOpen(false)}
                            sx={{
                                borderRadius: 2,
                                color: '#d1d5db',
                                '&.active': {
                                    bgcolor: 'primary.main',
                                    color: '#ffffff',
                                    '&:hover': {
                                        bgcolor: 'primary.dark',
                                    },
                                    '& .MuiListItemIcon-root': {
                                        color: '#ffffff',
                                    },
                                },
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                                {link.showChatUnread ? (
                                    <Badge color="error" badgeContent={chatUnreadCount} invisible={chatUnreadCount === 0}>
                                        {link.icon}
                                    </Badge>
                                ) : (
                                    link.icon
                                )}
                            </ListItemIcon>
                            <ListItemText 
                                primary={link.label} 
                                primaryTypographyProps={{ 
                                    fontWeight: 500,
                                    fontSize: '0.95rem',
                                }} 
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

            {/* User Info & Actions */}
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 44,
                            height: 44,
                            bgcolor: 'primary.main',
                            fontWeight: 700,
                        }}
                    >
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, color: '#f9fafb' }} noWrap>
                            {user?.firstName} {user?.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }} noWrap>
                            {user?.email}
                        </Typography>
                        {user?.schoolName && (
                            <Typography variant="caption" sx={{ color: '#9ca3af' }} display="block" noWrap>
                                {user.schoolName}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                        <ThemeToggle />
                    </Box>
                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Notifications />
                    </Box>
                    <IconButton
                        onClick={handleLogout}
                        size="small"
                        sx={{
                            border: '1px solid',
                            borderColor: '#ef4444',
                            color: '#ef4444',
                            '&:hover': {
                                bgcolor: '#ef4444',
                                color: '#ffffff',
                            },
                        }}
                    >
                        <LogoutIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
        </>
    );

    return (
        <>
            {isMobile && (
                <IconButton 
                    onClick={() => setMobileOpen(true)}
                    sx={{ 
                        position: 'fixed', 
                        top: 16, 
                        left: 16, 
                        zIndex: 1200,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                    }}
                >
                    <MenuIcon />
                </IconButton>
            )}

            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={() => isMobile && setMobileOpen(false)}
                sx={{
                    width: 280,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 280,
                        boxSizing: 'border-box',
                        borderRight: '1px solid',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        backgroundColor: '#1f2937',
                        color: '#f9fafb',
                    },
                }}
            >
                {drawerContent}
            </Drawer>
        </>
    );
};

export default Sidebar;

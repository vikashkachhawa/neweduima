import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import EmojiPicker from 'emoji-picker-react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { socialService } from '../services/social';
import { getCroppedImage } from '../utils/cropImage';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    InputBase,
    Paper,
    Slider,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import {
    AddPhotoAlternate,
    Assignment,
    BookmarkBorder,
    CalendarMonth,
    CameraAlt,
    CheckCircle,
    Class,
    Close,
    Comment,
    EmojiEmotions,
    FavoriteBorder,
    GitHub,
    Home,
    Image,
    Info,
    Language,
    LinkedIn,
    MenuBook,
    MoreHoriz,
    OndemandVideo,
    Schedule,
    Send,
    Settings,
    Share,
    School,
    Star,
    Workspaces,
    EmojiEvents,
    Code,
    Psychology,
    Group,
    ThumbUp
} from '@mui/icons-material';

const StudentProfile = () => {
    const { studentId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const coverInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    const [coverImage, setCoverImage] = useState('');
    const [avatarImage, setAvatarImage] = useState('');

    // ── Create post state ────────────────────────────────────────────────
    const postMediaInputRef = useRef(null);
    const [postText, setPostText] = useState('');
    const [postMediaPreviews, setPostMediaPreviews] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postSubmitting, setPostSubmitting] = useState(false);
    const [posts, setPosts] = useState([]);
    const [imageEditorOpen, setImageEditorOpen] = useState(false);
    const [imageEditorType, setImageEditorType] = useState('avatar');
    const [imageEditorSource, setImageEditorSource] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [flipX, setFlipX] = useState(false);
    const [flipY, setFlipY] = useState(false);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageApplying, setImageApplying] = useState(false);

    const handlePostMediaSelect = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        const previews = files.map((file) => ({
            id: Math.random().toString(36).slice(2),
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video') ? 'video' : 'image',
            name: file.name
        }));
        setPostMediaPreviews((prev) => [...prev, ...previews]);
        e.target.value = '';
    }, []);

    const removePostMedia = useCallback((id) => {
        setPostMediaPreviews((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const handleEmojiClick = useCallback((emojiData) => {
        setPostText((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    }, []);

    const handleSubmitPost = useCallback(() => {
        if (!postText.trim() && postMediaPreviews.length === 0) return;
        setPostSubmitting(true);
        setTimeout(() => {
            const newPost = {
                id: Date.now(),
                text: postText,
                media: postMediaPreviews[0]?.url || '',
                mediaType: postMediaPreviews[0]?.type || 'image',
                extraMedia: postMediaPreviews.slice(1),
                likes: 0,
                comments: 0,
                shares: 0,
                time: 'Just now'
            };
            setPosts((prev) => [newPost, ...prev]);
            setPostText('');
            setPostMediaPreviews([]);
            setPostSubmitting(false);
            setShowEmojiPicker(false);
        }, 600);
    }, [postText, postMediaPreviews]);

    const profile = {
        bio: 'Student creator sharing projects, notes, and campus moments.',
        classInfo: 'Grade 10 - Section A',
        rollNo: '2024-001',
        joined: 'Joined April 2024'
    };

    const targetStudentId = Number(studentId || user?.id || 0);
    const chatUser = location.state?.chatUser;
    const isOwnProfile = Number(user?.id) === targetStudentId;
    const displayUser = {
        firstName: chatUser?.first_name || user?.firstName || 'Student',
        lastName: chatUser?.last_name || user?.lastName || '',
        schoolName: chatUser?.school_name || user?.schoolName || 'School not available'
    };

    const timelinePosts = useMemo(
        () => [
            {
                id: 1,
                text: 'Finished our robotics mini project today. Next goal is line-following optimization.',
                media: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80',
                likes: 48,
                comments: 12,
                shares: 5,
                time: '2 hrs ago'
            },
            {
                id: 2,
                text: 'Sharing my chemistry quick revision board. Hope this helps before the weekly test.',
                media: '',
                likes: 36,
                comments: 9,
                shares: 3,
                time: 'Yesterday'
            },
            {
                id: 3,
                text: 'Class debate day highlights. Loved the energy from everyone in Section A.',
                media: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
                likes: 67,
                comments: 21,
                shares: 7,
                time: '3 days ago'
            }
        ],
        []
    );

    const [connectionSummary, setConnectionSummary] = useState({
        connections: 0,
        incomingRequests: 0,
        pagesFollowing: 0
    });
    const [profileRelationship, setProfileRelationship] = useState('none');
    const [relationshipLoading, setRelationshipLoading] = useState(false);
    const [relationshipActionLoading, setRelationshipActionLoading] = useState(false);

    React.useEffect(() => {
        let mounted = true;

        const loadSummary = async () => {
            try {
                const summary = await socialService.getSummary();
                if (mounted) {
                    setConnectionSummary({
                        connections: summary.connections || 0,
                        incomingRequests: summary.incomingRequests || 0,
                        pagesFollowing: summary.pagesFollowing || 0
                    });
                }
            } catch (error) {
                console.error('Failed to load social summary:', error);
            }
        };

        loadSummary();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadProfileRelationship = async () => {
            if (isOwnProfile || !targetStudentId) {
                if (mounted) {
                    setProfileRelationship('none');
                }
                return;
            }

            try {
                setRelationshipLoading(true);
                const [connections, requests] = await Promise.all([
                    socialService.getConnections(),
                    socialService.getRequests()
                ]);

                const isConnected = connections.some((item) => Number(item.user_id) === Number(targetStudentId));
                const hasOutgoingRequest = (requests?.outgoing || []).some((item) => Number(item.recipient_id) === Number(targetStudentId));
                const hasIncomingRequest = (requests?.incoming || []).some((item) => Number(item.requester_id) === Number(targetStudentId));

                if (!mounted) return;

                if (isConnected) {
                    setProfileRelationship('connected');
                } else if (hasOutgoingRequest) {
                    setProfileRelationship('outgoing_pending');
                } else if (hasIncomingRequest) {
                    setProfileRelationship('incoming_pending');
                } else {
                    setProfileRelationship('none');
                }
            } catch (error) {
                if (mounted) {
                    setProfileRelationship('none');
                }
            } finally {
                if (mounted) {
                    setRelationshipLoading(false);
                }
            }
        };

        loadProfileRelationship();

        return () => {
            mounted = false;
        };
    }, [isOwnProfile, targetStudentId]);

    const handleConnectRequestFromProfile = useCallback(async () => {
        if (!targetStudentId || relationshipActionLoading) return;

        try {
            setRelationshipActionLoading(true);
            await socialService.sendConnectionRequest(targetStudentId);
            // If there was an incoming pending request, backend auto-accepts; otherwise it stays pending.
            if (profileRelationship === 'incoming_pending') {
                setProfileRelationship('connected');
            } else {
                setProfileRelationship('outgoing_pending');
            }
        } catch (error) {
            // Keep current state if request fails.
        } finally {
            setRelationshipActionLoading(false);
        }
    }, [targetStudentId, relationshipActionLoading, profileRelationship]);

    const handleMessageFromProfile = useCallback(() => {
        navigate('/chat');
    }, [navigate]);

    const dashboardStats = [
        { title: 'Enrolled Courses', value: 24, icon: <Class />, color: '#0ea5e9' },
        { title: 'Completed Assignments', value: 5, icon: <CheckCircle />, color: '#10b981' },
        { title: 'Pending Assignments', value: 3, icon: <Assignment />, color: '#f59e0b' },
        { title: 'Upcoming Classes', value: 3, icon: <Schedule />, color: '#8b5cf6' }
    ];

    const defaultProfileDetails = useMemo(() => ({
        stream: 'Science Stream',
        grade: 'Senior (Grade 11)',
        clubs: ['Robotics', 'Chess'],
        skills: ['Python', 'C++', 'Robotics'],
        interests: ['AI/ML', 'IoT', 'Game Dev'],
        achievements: [
            { title: 'Merit Award 2025', subtitle: 'Academic Excellence' },
            { title: 'Science Olympiad', subtitle: '2nd Place - State Level' },
            { title: 'Robotics Competition', subtitle: '1st Place - Inter-school' }
        ],
        events: [
            { title: 'AI & Future Tech Summit', date: 'March 2025' },
            { title: 'Web Development Workshop', date: 'February 2025' }
        ],
        links: {
            github: '',
            linkedin: '',
            website: ''
        },
        collaboration: {
            projects: true,
            studyGroups: true,
            mentoring: false
        }
    }), []);

    const [profileDetails, setProfileDetails] = useState(defaultProfileDetails);
    const [editDetailsOpen, setEditDetailsOpen] = useState(false);
    const [editDraft, setEditDraft] = useState(null);

    useEffect(() => {
        if (isOwnProfile && user?.id) {
            const key = `student_profile_details_${user.id}`;
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    setProfileDetails({ ...defaultProfileDetails, ...parsed });
                } else {
                    setProfileDetails(defaultProfileDetails);
                }
            } catch {
                setProfileDetails(defaultProfileDetails);
            }
            return;
        }

        setProfileDetails(defaultProfileDetails);
    }, [isOwnProfile, user?.id, defaultProfileDetails]);

    const openEditDetails = useCallback(() => {
        setEditDraft({
            stream: profileDetails.stream,
            grade: profileDetails.grade,
            clubs: profileDetails.clubs.join(', '),
            skills: profileDetails.skills.join(', '),
            interests: profileDetails.interests.join(', '),
            achievements: profileDetails.achievements.map((item) => `${item.title}|${item.subtitle}`).join('\n'),
            events: profileDetails.events.map((item) => `${item.title}|${item.date}`).join('\n'),
            github: profileDetails.links.github,
            linkedin: profileDetails.links.linkedin,
            website: profileDetails.links.website,
            projects: profileDetails.collaboration.projects,
            studyGroups: profileDetails.collaboration.studyGroups,
            mentoring: profileDetails.collaboration.mentoring
        });
        setEditDetailsOpen(true);
    }, [profileDetails]);

    const parseList = (value) => String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const parsePairLines = (value) => String(value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [title, subtitle] = line.split('|').map((part) => part?.trim() || '');
            return { title: title || 'Untitled', subtitle: subtitle || '' };
        });

    const saveEditDetails = useCallback(() => {
        if (!editDraft) return;

        const nextDetails = {
            ...profileDetails,
            stream: editDraft.stream || defaultProfileDetails.stream,
            grade: editDraft.grade || defaultProfileDetails.grade,
            clubs: parseList(editDraft.clubs),
            skills: parseList(editDraft.skills),
            interests: parseList(editDraft.interests),
            achievements: parsePairLines(editDraft.achievements),
            events: parsePairLines(editDraft.events).map((item) => ({ title: item.title, date: item.subtitle })),
            links: {
                github: String(editDraft.github || '').trim(),
                linkedin: String(editDraft.linkedin || '').trim(),
                website: String(editDraft.website || '').trim()
            },
            collaboration: {
                projects: Boolean(editDraft.projects),
                studyGroups: Boolean(editDraft.studyGroups),
                mentoring: Boolean(editDraft.mentoring)
            }
        };

        setProfileDetails(nextDetails);

        if (isOwnProfile && user?.id) {
            const key = `student_profile_details_${user.id}`;
            localStorage.setItem(key, JSON.stringify(nextDetails));
        }

        setEditDetailsOpen(false);
    }, [defaultProfileDetails.grade, defaultProfileDetails.stream, editDraft, isOwnProfile, profileDetails, user?.id]);

    const ProfileStatCard = ({ title, value, icon, color }) => (
        <Card
            sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
                border: `1px solid ${color}30`
            }}
        >
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 8px 16px ${color}40`
                        }}
                    >
                        {React.cloneElement(icon, { sx: { fontSize: 24, color: '#ffffff' } })}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color }}>
                        {value}
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );

    const resetImageEditor = useCallback(() => {
        if (imageEditorSource?.startsWith('blob:')) {
            URL.revokeObjectURL(imageEditorSource);
        }

        setImageEditorOpen(false);
        setImageEditorType('avatar');
        setImageEditorSource('');
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setFlipX(false);
        setFlipY(false);
        setCroppedAreaPixels(null);
        setImageApplying(false);
    }, [imageEditorSource]);

    const handleCropComplete = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleImageUpload = (event, type) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setImageEditorType(type);
        setImageEditorSource(previewUrl);
        setImageEditorOpen(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setFlipX(false);
        setFlipY(false);
        setCroppedAreaPixels(null);

        event.target.value = '';
    };

    const handleApplyImageEdits = useCallback(async () => {
        if (!imageEditorSource || !croppedAreaPixels) {
            return;
        }

        try {
            setImageApplying(true);
            const croppedImage = await getCroppedImage(imageEditorSource, croppedAreaPixels, rotation, {
                brightness,
                contrast,
                saturation,
                flipX,
                flipY
            });

            if (imageEditorType === 'cover') {
                setCoverImage(croppedImage);
            } else {
                setAvatarImage(croppedImage);
            }

            resetImageEditor();
        } catch (error) {
            console.error('Failed to apply image edits:', error);
            setImageApplying(false);
        }
    }, [brightness, contrast, croppedAreaPixels, flipX, flipY, imageEditorSource, imageEditorType, resetImageEditor, rotation, saturation]);

    const editorAspect = imageEditorType === 'cover' ? 16 / 5 : 1;
    const editorCropShape = imageEditorType === 'cover' ? 'rect' : 'round';

    return (
        <Layout>
            {/*
              ─── Full-width wrapper ───────────────────────────────────────────
              Negative margins cancel the padding Layout injects so the profile
              bleeds edge-to-edge inside the main content area.
            */}
            <Box sx={{ mx: { xs: -2, sm: -3 }, mt: { xs: -2, sm: -3 } }}>

                <Dialog
                    open={imageEditorOpen}
                    onClose={imageApplying ? undefined : resetImageEditor}
                    fullWidth
                    maxWidth="sm"
                >
                    <DialogTitle>
                        {imageEditorType === 'cover' ? 'Edit banner image' : 'Edit profile photo'}
                    </DialogTitle>
                    <DialogContent sx={{ pb: 2 }}>
                        <Box
                            sx={{
                                position: 'relative',
                                height: { xs: 280, sm: 360 },
                                mt: 1,
                                borderRadius: 2,
                                overflow: 'hidden',
                                background: '#111827',
                                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                            }}
                        >
                            {imageEditorSource && (
                                <Cropper
                                    image={imageEditorSource}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={editorAspect}
                                    cropShape={editorCropShape}
                                    showGrid={imageEditorType === 'cover'}
                                    onCropChange={setCrop}
                                    onCropComplete={handleCropComplete}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                />
                            )}
                        </Box>

                        <Stack spacing={2.5} sx={{ mt: 3 }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button size="small" variant={flipX ? 'contained' : 'outlined'} onClick={() => setFlipX((v) => !v)} disabled={imageApplying}>
                                    Flip Horizontal
                                </Button>
                                <Button size="small" variant={flipY ? 'contained' : 'outlined'} onClick={() => setFlipY((v) => !v)} disabled={imageApplying}>
                                    Flip Vertical
                                </Button>
                                <Button
                                    size="small"
                                    variant="text"
                                    disabled={imageApplying}
                                    onClick={() => {
                                        setZoom(1);
                                        setRotation(0);
                                        setBrightness(100);
                                        setContrast(100);
                                        setSaturation(100);
                                        setFlipX(false);
                                        setFlipY(false);
                                    }}
                                >
                                    Reset Adjustments
                                </Button>
                            </Stack>

                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Zoom
                                </Typography>
                                <Slider
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(_, value) => setZoom(value)}
                                    valueLabelDisplay="auto"
                                    disabled={imageApplying}
                                />
                            </Box>

                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Rotate
                                </Typography>
                                <Slider
                                    min={0}
                                    max={360}
                                    step={1}
                                    value={rotation}
                                    onChange={(_, value) => setRotation(value)}
                                    valueLabelDisplay="auto"
                                    disabled={imageApplying}
                                />
                            </Box>

                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Brightness
                                </Typography>
                                <Slider
                                    min={50}
                                    max={150}
                                    step={1}
                                    value={brightness}
                                    onChange={(_, value) => setBrightness(value)}
                                    valueLabelDisplay="auto"
                                    disabled={imageApplying}
                                />
                            </Box>

                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Contrast
                                </Typography>
                                <Slider
                                    min={50}
                                    max={150}
                                    step={1}
                                    value={contrast}
                                    onChange={(_, value) => setContrast(value)}
                                    valueLabelDisplay="auto"
                                    disabled={imageApplying}
                                />
                            </Box>

                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Saturation
                                </Typography>
                                <Slider
                                    min={50}
                                    max={150}
                                    step={1}
                                    value={saturation}
                                    onChange={(_, value) => setSaturation(value)}
                                    valueLabelDisplay="auto"
                                    disabled={imageApplying}
                                />
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={resetImageEditor} disabled={imageApplying}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleApplyImageEdits}
                            disabled={imageApplying || !croppedAreaPixels}
                        >
                            {imageApplying ? 'Applying...' : 'Apply Changes'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={editDetailsOpen} onClose={() => setEditDetailsOpen(false)} fullWidth maxWidth="md">
                    <DialogTitle>Edit Profile Details</DialogTitle>
                    <DialogContent dividers>
                        {editDraft && (
                            <Stack spacing={2} sx={{ mt: 0.5 }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        label="Stream"
                                        fullWidth
                                        value={editDraft.stream}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, stream: e.target.value }))}
                                    />
                                    <TextField
                                        label="Grade"
                                        fullWidth
                                        value={editDraft.grade}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, grade: e.target.value }))}
                                    />
                                </Stack>

                                <TextField
                                    label="Clubs (comma separated)"
                                    fullWidth
                                    value={editDraft.clubs}
                                    onChange={(e) => setEditDraft((prev) => ({ ...prev, clubs: e.target.value }))}
                                />

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        label="Skills (comma separated)"
                                        fullWidth
                                        value={editDraft.skills}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, skills: e.target.value }))}
                                    />
                                    <TextField
                                        label="Interests (comma separated)"
                                        fullWidth
                                        value={editDraft.interests}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, interests: e.target.value }))}
                                    />
                                </Stack>

                                <TextField
                                    label="Achievements (one per line: title|subtitle)"
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    value={editDraft.achievements}
                                    onChange={(e) => setEditDraft((prev) => ({ ...prev, achievements: e.target.value }))}
                                />

                                <TextField
                                    label="Events (one per line: event|date)"
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    value={editDraft.events}
                                    onChange={(e) => setEditDraft((prev) => ({ ...prev, events: e.target.value }))}
                                />

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        label="GitHub URL"
                                        fullWidth
                                        value={editDraft.github}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, github: e.target.value }))}
                                    />
                                    <TextField
                                        label="LinkedIn URL"
                                        fullWidth
                                        value={editDraft.linkedin}
                                        onChange={(e) => setEditDraft((prev) => ({ ...prev, linkedin: e.target.value }))}
                                    />
                                </Stack>

                                <TextField
                                    label="Portfolio / Website URL"
                                    fullWidth
                                    value={editDraft.website}
                                    onChange={(e) => setEditDraft((prev) => ({ ...prev, website: e.target.value }))}
                                />

                                <Divider />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Collaboration Preferences</Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Switch checked={Boolean(editDraft.projects)} onChange={(e) => setEditDraft((prev) => ({ ...prev, projects: e.target.checked }))} />
                                        <Typography variant="body2">Open to projects</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Switch checked={Boolean(editDraft.studyGroups)} onChange={(e) => setEditDraft((prev) => ({ ...prev, studyGroups: e.target.checked }))} />
                                        <Typography variant="body2">Study groups</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Switch checked={Boolean(editDraft.mentoring)} onChange={(e) => setEditDraft((prev) => ({ ...prev, mentoring: e.target.checked }))} />
                                        <Typography variant="body2">Mentoring</Typography>
                                    </Stack>
                                </Stack>
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
                        <Button variant="contained" onClick={saveEditDetails}>Save Details</Button>
                    </DialogActions>
                </Dialog>

                {/* ── HEADER: cover + avatar + name/bio/stats ─────────────── */}
                <Paper elevation={0} square sx={{ overflow: 'hidden', bgcolor: 'background.paper' }}>

                    {/* Cover photo */}
                    <Box
                        sx={{
                            height: { xs: 180, md: 280 },
                            position: 'relative',
                            backgroundImage: coverImage
                                ? `url(${coverImage})`
                                : 'linear-gradient(120deg, #0f766e 0%, #0369a1 45%, #0ea5e9 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(event) => handleImageUpload(event, 'cover')}
                        />
                        {isOwnProfile && (
                            <Tooltip title="Update cover photo" placement="left">
                                <IconButton
                                    onClick={() => coverInputRef.current?.click()}
                                    sx={{
                                        position: 'absolute',
                                        right: 14,
                                        bottom: 14,
                                        bgcolor: 'rgba(255,255,255,0.92)',
                                        color: '#111827',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                                        '&:hover': { bgcolor: '#ffffff', transform: 'scale(1.08)' }
                                    }}
                                >
                                    <CameraAlt />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {/* Avatar + name + bio + chips + connection stats */}
                    <Box sx={{ px: { xs: 2, md: 4 }, pb: 3 }}>

                        {/* Avatar overlapping banner with connection stats aligned beside it */}
                        <Box
                            sx={{
                                mt: { xs: '-48px', md: '-72px' },
                                mb: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: { xs: 2, md: 4 },
                                flexWrap: 'wrap'
                            }}
                        >
                            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(event) => handleImageUpload(event, 'avatar')}
                                />
                                <Avatar
                                    src={avatarImage}
                                    sx={{
                                        width: { xs: 96, md: 144 },
                                        height: { xs: 96, md: 144 },
                                        border: '4px solid #fff',
                                        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                                        fontSize: { xs: 32, md: 48 },
                                        bgcolor: '#0284c7'
                                    }}
                                >
                                    {displayUser.firstName?.[0]}
                                </Avatar>
                                {isOwnProfile && (
                                    <Tooltip title="Update profile photo" placement="bottom">
                                        <IconButton
                                            size="small"
                                            onClick={() => avatarInputRef.current?.click()}
                                            sx={{
                                                position: 'absolute',
                                                bottom: 4,
                                                right: 4,
                                                width: 32,
                                                height: 32,
                                                bgcolor: '#111827',
                                                color: '#fff',
                                                border: '2px solid #fff',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                                '&:hover': { bgcolor: '#1f2937', transform: 'scale(1.1)' }
                                            }}
                                        >
                                            <CameraAlt sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>

                            <Stack
                                direction="row"
                                spacing={{ xs: 2, md: 3 }}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ mt: '80px' }}
                            >
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{connectionSummary.connections}</Typography>
                                    <Typography variant="body2" color="text.secondary">Connections</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{connectionSummary.incomingRequests}</Typography>
                                    <Typography variant="body2" color="text.secondary">Incoming Requests</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{connectionSummary.pagesFollowing}</Typography>
                                    <Typography variant="body2" color="text.secondary">Following Pages</Typography>
                                </Box>
                            </Stack>
                        </Box>

                        {/* Name, bio, chips */}
                        <Box sx={{ mt: 1.5 }}>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                {displayUser.firstName} {displayUser.lastName}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
                                {profile.bio}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={profile.classInfo} color="primary" variant="outlined" />
                                <Chip label={`Roll No: ${profile.rollNo}`} variant="outlined" />
                                <Chip label={profile.joined} variant="outlined" />
                            </Stack>
                        </Box>

                        <Divider sx={{ my: 2.5 }} />

                        {/* Academic stats - Only show on own profile */}
                        {isOwnProfile && (
                        <Grid container spacing={2}>
                            {dashboardStats.map((stat) => (
                                <Grid key={stat.title} size={{ xs: 12, sm: 6 }}>
                                    <ProfileStatCard
                                        title={stat.title}
                                        value={stat.value}
                                        icon={stat.icon}
                                        color={stat.color}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                        )}
                    </Box>
                </Paper>

                <Divider />

                {/*
                  ── 3-COLUMN BODY ────────────────────────────────────────────
                  Left and right columns use alignSelf:"flex-start" on the Grid
                  item (required for position:sticky inside a flex container).
                  Center column scrolls naturally with the page.
                */}
                <Grid container spacing={0} columns={12} sx={{
                        bgcolor: 'background.default',
                        width: '100%',
                        m: 0,
                        position: { md: 'sticky' },
                        top: { md: 16 },
                        height: { xs: 'auto', md: 'calc(100vh - 16px)' },
                        overflow: { xs: 'visible', md: 'hidden' },
                        zIndex: { md: 10 }
                    }}>

                    {/* LEFT — profile quick info */}
                    <Grid
                        size={{ xs: 12, md: 3 }}
                        sx={{ height: { xs: 'auto', md: '100%' }, overflowY: { xs: 'visible', md: 'auto' }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, p: { xs: 2, md: 2 } }}
                    >
                            <Stack spacing={2}>
                                {isOwnProfile && (
                                    <Button variant="outlined" onClick={openEditDetails} sx={{ borderRadius: 2 }}>
                                        Edit Profile Details
                                    </Button>
                                )}
                                {/* About */}
                                <Card elevation={1} sx={{ width: '100%' }}>
                                    <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>About</Typography>
                                                <Info fontSize="small" color="action" />
                                            </Stack>
                                            <Stack spacing={1.5}>
                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                    <School fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                                                    <Stack spacing={0.25}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>School</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{displayUser.schoolName}</Typography>
                                                    </Stack>
                                                </Stack>
                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                    <MenuBook fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                                                    <Stack spacing={0.25}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Stream</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{profileDetails.stream}</Typography>
                                                    </Stack>
                                                </Stack>
                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                    <Class fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                                                    <Stack spacing={0.25}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Grade</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{profileDetails.grade}</Typography>
                                                    </Stack>
                                                </Stack>
                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                    <Workspaces fontSize="small" color="primary" sx={{ mt: 0.3 }} />
                                                    <Stack spacing={0.25}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Clubs</Typography>
                                                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                                            {profileDetails.clubs.map((club) => (
                                                                <Chip key={club} label={club} size="small" variant="outlined" />
                                                            ))}
                                                        </Stack>
                                                    </Stack>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* Skills & Interests */}
                                <Card elevation={1} sx={{ width: '100%' }}>
                                    <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                                        <Stack spacing={1.5}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Skills & Interests</Typography>
                                                <Code fontSize="small" color="action" />
                                            </Stack>
                                            <Stack spacing={1}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Technical Skills</Typography>
                                                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                                                        {profileDetails.skills.map((skill) => (
                                                            <Chip key={skill} label={skill} size="small" variant="outlined" />
                                                        ))}
                                                    </Stack>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Interests</Typography>
                                                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                                                        {profileDetails.interests.map((interest) => (
                                                            <Chip key={interest} label={interest} size="small" variant="outlined" color="primary" />
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Stack>
                    </Grid>

                    {/* CENTER — scrollable timeline feed */}
                    <Grid
                        size={{ xs: 12, md: 6 }}
                        sx={{
                            height: { xs: 'auto', md: '100%' },
                            overflowY: { xs: 'visible', md: 'auto' },
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                            p: { xs: 2, md: 2 },
                            borderLeft: { md: '1px solid' },
                            borderRight: { md: '1px solid' },
                            borderColor: { md: 'divider' }
                        }}
                    >
                        <Stack spacing={2}>

                            {/* ── CREATE POST CARD ───────────────────────── */}
                            {isOwnProfile && (
                            <Card elevation={1}>
                                <CardContent sx={{ pb: '16px !important' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                        <Avatar src={avatarImage} sx={{ bgcolor: '#0284c7', mt: 0.5 }}>
                                            {displayUser.firstName?.[0]}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <InputBase
                                                multiline
                                                minRows={2}
                                                maxRows={8}
                                                fullWidth
                                                placeholder="What's on your mind?"
                                                value={postText}
                                                onChange={(e) => setPostText(e.target.value)}
                                                sx={{
                                                    fontSize: '0.95rem',
                                                    lineHeight: 1.6,
                                                    '& textarea': { resize: 'none' },
                                                    p: 1.5,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 2,
                                                    bgcolor: 'action.hover',
                                                    width: '100%',
                                                    '&:focus-within': { borderColor: 'primary.main', bgcolor: 'background.paper' }
                                                }}
                                            />

                                            {/* Media previews */}
                                            {postMediaPreviews.length > 0 && (
                                                <Box
                                                    sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: postMediaPreviews.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                                        gap: 1,
                                                        mt: 1.5
                                                    }}
                                                >
                                                    {postMediaPreviews.map((media) => (
                                                        <Box key={media.id} sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
                                                            {media.type === 'video' ? (
                                                                <Box
                                                                    component="video"
                                                                    src={media.url}
                                                                    controls
                                                                    sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block', bgcolor: '#000' }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    component="img"
                                                                    src={media.url}
                                                                    alt={media.name}
                                                                    sx={{ width: '100%', height: postMediaPreviews.length === 1 ? 240 : 160, objectFit: 'cover', display: 'block' }}
                                                                />
                                                            )}
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => removePostMedia(media.id)}
                                                                sx={{
                                                                    position: 'absolute', top: 6, right: 6,
                                                                    bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
                                                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                                                                }}
                                                            >
                                                                <Close fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}

                                            {/* Emoji picker */}
                                            <Collapse in={showEmojiPicker}>
                                                <Box sx={{ mt: 1.5, '& .EmojiPickerReact': { width: '100% !important', boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 2 } }}>
                                                    <EmojiPicker
                                                        onEmojiClick={handleEmojiClick}
                                                        lazyLoadEmojis
                                                        searchPlaceholder="Search emoji..."
                                                        width="100%"
                                                        height={340}
                                                    />
                                                </Box>
                                            </Collapse>

                                            <Divider sx={{ my: 1.5 }} />

                                            {/* Bottom toolbar */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Stack direction="row" spacing={0.5}>
                                                    <input
                                                        ref={postMediaInputRef}
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        multiple
                                                        hidden
                                                        onChange={handlePostMediaSelect}
                                                    />
                                                    <Tooltip title="Add photo">
                                                        <IconButton size="small" color="primary" onClick={() => postMediaInputRef.current?.click()}>
                                                            <Image />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Add video">
                                                        <IconButton size="small" color="secondary" onClick={() => postMediaInputRef.current?.click()}>
                                                            <OndemandVideo />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={showEmojiPicker ? 'Hide emoji picker' : 'Add emoji'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setShowEmojiPicker((v) => !v)}
                                                            sx={{ color: showEmojiPicker ? 'warning.main' : 'action.active' }}
                                                        >
                                                            <EmojiEmotions />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>

                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    endIcon={postSubmitting ? <CircularProgress size={14} color="inherit" /> : <Send sx={{ fontSize: 16 }} />}
                                                    disabled={postSubmitting || (!postText.trim() && postMediaPreviews.length === 0)}
                                                    onClick={handleSubmitPost}
                                                    sx={{ borderRadius: 6, px: 2.5 }}
                                                >
                                                    Post
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>                            )}
                            {/* ── TIMELINE ────────────────────────────────── */}
                            {[...posts, ...timelinePosts].map((post) => (
                                <Card key={post.id} elevation={1}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar src={avatarImage} sx={{ bgcolor: '#0284c7' }}>
                                                    {displayUser.firstName?.[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 700 }}>
                                                        {displayUser.firstName} {displayUser.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {post.time}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Button size="small" sx={{ minWidth: 32, p: 0.5 }}>
                                                <MoreHoriz />
                                            </Button>
                                        </Stack>

                                        <Typography variant="body1" sx={{ mb: post.media ? 2 : 1 }}>
                                            {post.text}
                                        </Typography>

                                        {post.media && (
                                            <Box
                                                sx={{
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    mb: 1.5
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={post.media}
                                                    alt="Post media"
                                                    sx={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
                                                />
                                            </Box>
                                        )}

                                        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                            <Typography variant="caption" color="text.secondary">{post.likes} likes</Typography>
                                            <Typography variant="caption" color="text.secondary">{post.comments} comments</Typography>
                                            <Typography variant="caption" color="text.secondary">{post.shares} shares</Typography>
                                        </Stack>

                                        <Divider sx={{ my: 1 }} />

                                        <Stack direction="row" justifyContent="space-between">
                                            <Button startIcon={<FavoriteBorder />} size="small">Like</Button>
                                            <Button startIcon={<Comment />} size="small">Comment</Button>
                                            <Button startIcon={<Share />} size="small">Share</Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </Grid>

                    {/* RIGHT — highlights */}
                    <Grid
                        size={{ xs: 12, md: 3 }}
                        sx={{ height: { xs: 'auto', md: '100%' }, overflowY: { xs: 'visible', md: 'auto' }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, p: { xs: 2, md: 2 } }}
                    >
                            <Stack spacing={2}>
                                        {/* Achievements & Awards */}
                                        <Card elevation={1} sx={{ width: '100%' }}>
                                            <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                                                <Stack spacing={1.5}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Achievements</Typography>
                                                        <Star fontSize="small" color="action" />
                                                    </Stack>
                                                    <Stack spacing={1}>
                                                        {profileDetails.achievements.map((item, index) => (
                                                            <Stack key={`${item.title}-${index}`} direction="row" spacing={1} alignItems="flex-start">
                                                                <ThumbUp fontSize="small" color="success" sx={{ mt: 0.3 }} />
                                                                <Stack spacing={0.25} sx={{ flex: 1 }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.title}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.subtitle}</Typography>
                                                                </Stack>
                                                            </Stack>
                                                        ))}
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>

                                        {/* COLLABORATION STATUS */}
                                        <Card elevation={1} sx={{ width: '100%', background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                            <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                                                <Stack spacing={1.5}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Collaboration</Typography>
                                                        <Group fontSize="small" color="success" />
                                                    </Stack>
                                                    <Stack spacing={0.75}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="body2" sx={{ color: profileDetails.collaboration.projects ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
                                                                {profileDetails.collaboration.projects ? '✓' : '-'}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: profileDetails.collaboration.projects ? 'text.primary' : 'text.secondary' }}>
                                                                Open to collaborate on projects
                                                            </Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="body2" sx={{ color: profileDetails.collaboration.studyGroups ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
                                                                {profileDetails.collaboration.studyGroups ? '✓' : '-'}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: profileDetails.collaboration.studyGroups ? 'text.primary' : 'text.secondary' }}>
                                                                Available for study groups
                                                            </Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="body2" sx={{ color: profileDetails.collaboration.mentoring ? 'success.main' : 'text.secondary', fontWeight: 600 }}>
                                                                {profileDetails.collaboration.mentoring ? '✓' : '-'}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: profileDetails.collaboration.mentoring ? 'text.primary' : 'text.secondary' }}>
                                                                Mentoring {profileDetails.collaboration.mentoring ? '(Available)' : '(Not available)'}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>

                                        {/* EVENTS & ACTIVITIES */}
                                        <Card elevation={1} sx={{ width: '100%' }}>
                                            <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                                                <Stack spacing={1.5}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Events & Workshops</Typography>
                                                        <EmojiEvents fontSize="small" color="action" />
                                                    </Stack>
                                                    <Stack spacing={0.75}>
                                                        {profileDetails.events.map((event, index) => (
                                                            <Stack key={`${event.title}-${index}`} direction="row" spacing={1} alignItems="flex-start">
                                                                <CheckCircle fontSize="small" color="success" sx={{ mt: 0.3 }} />
                                                                <Stack spacing={0.25} sx={{ flex: 1 }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{event.title}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{event.date}</Typography>
                                                                </Stack>
                                                            </Stack>
                                                        ))}
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>

                                        {/* EXTERNAL LINKS */}
                                        <Card elevation={1} sx={{ width: '100%' }}>
                                            <CardContent sx={{ width: '100%', boxSizing: 'border-box' }}>
                                                <Stack spacing={1}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Connect</Typography>
                                                    <Stack direction="row" spacing={1}>
                                                        <Tooltip title="GitHub">
                                                            <IconButton component="a" href={profileDetails.links.github || undefined} target="_blank" rel="noreferrer" size="small" sx={{ border: '1px solid', borderColor: 'divider', color: 'text.secondary', '&:hover': { color: 'primary.main', borderColor: 'primary.main' } }} disabled={!profileDetails.links.github}>
                                                                <GitHub fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="LinkedIn">
                                                            <IconButton component="a" href={profileDetails.links.linkedin || undefined} target="_blank" rel="noreferrer" size="small" sx={{ border: '1px solid', borderColor: 'divider', color: 'text.secondary', '&:hover': { color: 'primary.main', borderColor: 'primary.main' } }} disabled={!profileDetails.links.linkedin}>
                                                                <LinkedIn fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Portfolio">
                                                            <IconButton component="a" href={profileDetails.links.website || undefined} target="_blank" rel="noreferrer" size="small" sx={{ border: '1px solid', borderColor: 'divider', color: 'text.secondary', '&:hover': { color: 'primary.main', borderColor: 'primary.main' } }} disabled={!profileDetails.links.website}>
                                                                <Language fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>

                                        {/* ACTION BUTTONS — only for other profiles */}
                                        {!isOwnProfile && (
                                        <Stack spacing={1}>
                                            {relationshipLoading ? (
                                                <Button variant="outlined" fullWidth disabled sx={{ borderRadius: 2 }} startIcon={<CircularProgress size={14} />}>
                                                    Loading
                                                </Button>
                                            ) : profileRelationship === 'connected' ? (
                                                <Button variant="outlined" fullWidth sx={{ borderRadius: 2 }} onClick={handleMessageFromProfile}>
                                                    Message
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="contained"
                                                    fullWidth
                                                    sx={{ borderRadius: 2 }}
                                                    onClick={handleConnectRequestFromProfile}
                                                    disabled={relationshipActionLoading || profileRelationship === 'outgoing_pending'}
                                                    startIcon={relationshipActionLoading ? <CircularProgress size={14} color="inherit" /> : null}
                                                >
                                                    {profileRelationship === 'outgoing_pending' ? 'Request Sent' : 'Connect Request'}
                                                </Button>
                                            )}
                                        </Stack>
                                        )}
                            </Stack>
                    </Grid>

                </Grid>
            </Box>
        </Layout>
    );
};

export default StudentProfile;

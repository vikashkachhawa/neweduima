import { createServer }       from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import superAdminRoutes from './routes/superAdmin.js';
import schoolRoutes from './routes/school.js';
import rbacRoutes from './routes/rbac.js';
import subscriptionRoutes from './routes/subscription.js';
import platformControlsRoutes from './routes/platformControls.js';
import analyticsRoutes from './routes/analytics.js';
import superAdminTemplatesRoutes from './routes/superAdminTemplates.js';
import schoolSetupTemplatesRoutes from './routes/schoolSetupTemplates.js';
import schoolPageRoutes from './routes/schoolPage.js';
import facultyProfileRoutes from './routes/facultyProfile.js';
import socialRoutes from './routes/social.js';
import forumRoutes from './routes/forum.js';
import chatRoutes from './routes/chat.js';
import groupChatRoutes from './routes/groupChat.js';
import groupManagementRoutes from './routes/groupManagement.js';
import broadcastRoutes from './routes/broadcast.js';
import notificationRoutes from './routes/notifications.js';
import passwordResetRoutes from './routes/passwordResetRoutes.js';
import gamificationRoutes from './routes/gamification.js';
import codeArenaRoutes from './routes/codeArena.js';
import eduMeetRoutes from './routes/eduMeet.js';
import { startSession, sendInput, killSession, killAllSessions } from './services/interactiveExecutionService.js';
import { registerEduMeetSocket } from './services/eduMeetSocketService.js';
import { cleanupExpiredEduMeetRecordings } from './services/eduMeetRecordingService.js';
import errorHandler from './middleware/errorHandler.js';
import { logError, trackPerformance } from './middleware/analytics.js';
import Subscription from './models/Subscription.js';
import MonitoringService from './services/MonitoringService.js';
import { ensureAnalyticsSchema } from './database/ensureAnalyticsSchema.js';
import { ensureSubscriptionSchema } from './database/ensureSubscriptionSchema.js';
import { ensurePlatformContentSchema } from './database/ensurePlatformContentSchema.js';
import { ensurePasswordResetSchema } from './database/ensurePasswordResetSchema.js';
import { ensureSchoolPageSchema } from './database/ensureSchoolPageSchema.js';
import { ensureSocialSchema } from './database/ensureSocialSchema.js';
import { ensureForumSchema } from './database/ensureForumSchema.js';
import { ensureChatSchema } from './database/ensureChatSchema.js';
import { ensureGroupChatSchema } from './database/ensureGroupChatSchema.js';
import { ensureBroadcastSchema } from './database/ensureBroadcastSchema.js';
import { ensureNotificationsSchema } from './database/ensureNotificationsSchema.js';
import { ensureFacultyProfileSchema } from './database/ensureFacultyProfileSchema.js';
import { ensureGamificationSchema } from './database/ensureGamificationSchema.js';
import { ensureRBACSchema } from './database/ensureRBACSchema.js';
import { ensureCodeArenaSchema } from './database/ensureCodeArenaSchema.js';
import { ensureEduMeetSchema } from './database/ensureEduMeetSchema.js';
import './config/database.js';

dotenv.config();

const app        = express();
const httpServer = createServer(app);
const PORT       = process.env.PORT || 5000;

const parseOrigins = (value) => {
    if (!value) return [];
    return String(value)
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const allowedOrigins = new Set([
    ...parseOrigins(process.env.FRONTEND_URLS),
    process.env.FRONTEND_URL,
    'https://app.eduima.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
].filter(Boolean));

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) { callback(null, true); return; }
            callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
    },
});

// CodeArena interactive-execution namespace  (/codearena)
const codeArenaIO = io.of('/codearena');

codeArenaIO.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.id || decoded.userId || decoded.email;
        next();
    } catch {
        next(new Error('Invalid auth token'));
    }
});

codeArenaIO.on('connection', (socket) => {
    const sessionId = socket.id;
    console.log(`[CodeArena WS] connected  ${socket.id} user:${socket.data.userId}`);

    // Buffer stdin lines that arrive while startSession() is still setting up the
    // child process (writing temp files, spawning, etc.).  Without this queue,
    // input sent immediately after "Run" would be silently dropped because
    // sessions.get(sessionId) returns undefined until setup completes.
    let sessionStarting = false;
    const pendingInputQueue = [];

    socket.on('code:run', async ({ language, code }) => {
        // Clear any leftover input from a previous run
        pendingInputQueue.length = 0;
        sessionStarting = true;

        await startSession(sessionId, language, String(code || ''), {
            onOutput: (type, text) => socket.emit('code:output', { type, text }),
            onDone:   (result)     => socket.emit('code:done',   result),
            onError:  (message)    => { sessionStarting = false; socket.emit('code:error', { message }); },
        });

        // Session is now registered — replay any buffered stdin lines
        sessionStarting = false;
        for (const line of pendingInputQueue.splice(0)) {
            sendInput(sessionId, line);
        }
    });

    socket.on('code:input', ({ line }) => {
        if (typeof line === 'string') {
            const safeLine = line.substring(0, 10_000);
            if (sessionStarting) {
                // Session not yet ready — queue the input to be replayed shortly
                pendingInputQueue.push(safeLine);
            } else {
                sendInput(sessionId, safeLine);
            }
        }
    });

    socket.on('code:kill', () => {
        sessionStarting = false;
        pendingInputQueue.length = 0;
        killSession(sessionId);
        // the 'close' event on the process will emit code:done; no need to emit here
    });

    socket.on('disconnect', () => {
        sessionStarting = false;
        pendingInputQueue.length = 0;
        killSession(sessionId);
        console.log(`[CodeArena WS] disconnected ${socket.id}`);
    });
});

registerEduMeetSocket(io);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Performance tracking middleware
app.use(trackPerformance);

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/platform-controls', platformControlsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/super-admin/templates', superAdminTemplatesRoutes);
app.use('/api/school-setup/templates', schoolSetupTemplatesRoutes);
app.use('/api/school-page', schoolPageRoutes);
app.use('/api/faculty-profile', facultyProfileRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/group-chat', groupChatRoutes);
app.use('/api/group-management', groupManagementRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/codearena', codeArenaRoutes);
app.use('/api/edumeet', eduMeetRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error logging middleware (before error handler)
app.use(logError);

// Error handler
app.use(errorHandler);

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

// Auto-suspend expired subscriptions every day at midnight UTC
cron.schedule('0 0 * * *', async () => {
    try {
        console.log(`[${new Date().toISOString()}] Running auto-suspend job...`);
        const count = await Subscription.autoSuspendExpired();
        console.log(`✓ Auto-suspended ${count} expired subscriptions`);
    } catch (error) {
        console.error('✗ Auto-suspend job failed:', error.message);
    }
});

// Collect analytics and monitoring data every day at 1 AM UTC
cron.schedule('0 1 * * *', async () => {
    try {
        console.log(`[${new Date().toISOString()}] Running daily monitoring...`);
        await MonitoringService.runDailyMonitoring();
        console.log(`✓ Daily monitoring completed`);
    } catch (error) {
        console.error('✗ Daily monitoring failed:', error.message);
    }
});

// Check storage alerts every 4 hours
cron.schedule('0 */4 * * *', async () => {
    try {
        console.log(`[${new Date().toISOString()}] Checking storage alerts...`);
        await MonitoringService.checkStorageAlerts();
        console.log(`✓ Storage alerts checked`);
    } catch (error) {
        console.error('✗ Storage alert check failed:', error.message);
    }
});

// Remove EduMeet recordings after 24 hours
cron.schedule('0 * * * *', async () => {
    try {
        const count = await cleanupExpiredEduMeetRecordings();
        if (count > 0) {
            console.log(`✓ Deleted ${count} expired EduMeet recording(s)`);
        }
    } catch (error) {
        console.error('✗ EduMeet recording cleanup failed:', error.message);
    }
});

// Start server
const startServer = async () => {
    await ensurePasswordResetSchema();
    await ensureSchoolPageSchema();
    await ensureFacultyProfileSchema();
    await ensureSubscriptionSchema();
    await ensurePlatformContentSchema();
    await ensureSocialSchema();
    await ensureForumSchema();
    await ensureChatSchema();
    await ensureGroupChatSchema();
    await ensureBroadcastSchema();
    await ensureNotificationsSchema();
    await ensureAnalyticsSchema();
    await ensureGamificationSchema();
    await ensureRBACSchema();
    await ensureCodeArenaSchema();
    await ensureEduMeetSchema();

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log(`🔌 WebSocket (CodeArena) namespace: /codearena`);
        console.log(`🎥 WebSocket (EduMeet) namespace: /edumeet`);
    });

    // Graceful shutdown — clean up any running child processes
    process.on('SIGTERM', () => { killAllSessions(); });
    process.on('SIGINT',  () => { killAllSessions(); });
};

startServer().catch((error) => {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
});

export default app;

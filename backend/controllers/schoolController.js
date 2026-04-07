import User from '../models/User.js';
import Announcement from '../models/Announcement.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AuditLog from '../models/AuditLog.js';

// Get single school user by ID
export const getSchoolUser = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.school_id !== schoolId) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Get school user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get school users
export const getSchoolUsers = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const users = await User.findBySchoolId(schoolId);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get school users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Create user (school_admin only)
export const createUser = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const { first_name, last_name, email, password, role } = req.body;

        if (!first_name || !last_name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required.'
            });
        }

        if (!['faculty', 'student'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role.'
            });
        }

        // Check if user already exists
        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Email already in use.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, school_id, role, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, hashedPassword, schoolId, role, true]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            user: {
                id: result.insertId,
                first_name,
                last_name,
                email,
                school_id: schoolId,
                role,
                is_active: true
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const role = req.user.role;

        // Get user counts by role
        const users = await User.findBySchoolId(schoolId);
        const stats = {
            totalUsers: users.length,
            faculty: users.filter(u => u.role === 'faculty').length,
            students: users.filter(u => u.role === 'student').length,
            activeUsers: users.filter(u => u.is_active).length
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get announcements for school
export const getAnnouncements = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const announcements = await Announcement.findBySchoolId(schoolId);

        res.json({
            success: true,
            announcements
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Create announcement (school_admin only)
export const createAnnouncement = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Title and message are required.'
            });
        }

        const announcement = await Announcement.create(schoolId, title, message);

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully.',
            announcement
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Reset user password (school_admin only)
export const resetUserPassword = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify the user belongs to the same school
        if (user.school_id !== schoolId) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }

        // Generate new temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Update user password
        await User.update(userId, {
            password_hash: hashedPassword,
            must_change_password: true
        });

        // Log audit event
        await AuditLog.log(
            req.user.id,
            'user_password_reset',
            'user',
            userId,
            { email: user.email },
            req
        );

        res.json({
            success: true,
            message: 'Password reset successfully',
            tempPassword
        });
    } catch (error) {
        console.error('Reset password error:', error);
        await AuditLog.log(req.user.id, 'user_password_reset', 'user', req.params.userId, null, req, 'failure', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Toggle user active status (school_admin only)
export const toggleUserStatus = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify the user belongs to the same school
        if (user.school_id !== schoolId) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }

        await User.update(userId, {
            is_active: isActive
        });

        // Log audit event
        await AuditLog.log(
            req.user.id,
            'user_status_changed',
            'user',
            userId,
            { email: user.email, is_active: isActive },
            req
        );

        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        await AuditLog.log(req.user.id, 'user_status_changed', 'user', req.params.userId, null, req, 'failure', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

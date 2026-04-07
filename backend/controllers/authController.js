import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import School from '../models/School.js';
import { validationResult } from 'express-validator';
import db from '../config/database.js';

const parseProfileInterests = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return value
                .split(',')
                .map((item) => item.trim().toLowerCase())
                .filter(Boolean);
        }
    }
    return [];
};

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            subdomain: user.subdomain
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
};

// Login
export const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check school status for non-super admins
        if (user.role !== 'super_admin' && user.school_id) {
            const school = await School.findById(user.school_id);
            if (!school) {
                return res.status(403).json({ success: false, message: 'School not found or removed' });
            }
            const status = school.status || (school.is_active ? 'active' : 'suspended');
            if (status === 'suspended') {
                return res.status(403).json({ success: false, message: 'School is suspended. Contact support.' });
            }
            if (status === 'deleted') {
                return res.status(403).json({ success: false, message: 'School is deleted. Contact support.' });
            }
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Generate token
        const token = generateToken(user);

        // Remove sensitive data
        delete user.password_hash;
        delete user.temp_password;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                schoolId: user.school_id,
                subdomain: user.subdomain,
                schoolName: user.school_name,
                mustChangePassword: user.must_change_password,
                profileInterests: parseProfileInterests(user.profile_interests)
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                schoolId: user.school_id,
                subdomain: user.subdomain,
                schoolName: user.school_name,
                mustChangePassword: user.must_change_password,
                profileInterests: parseProfileInterests(user.profile_interests)
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Change password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get user with password
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password (if not forced change)
        if (!user.must_change_password) {
            const userWithPassword = await User.findByEmail(user.email);
            const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.updatePassword(userId, hashedPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Logout
export const logout = async (req, res) => {
    try {
        // In a production environment, you might want to blacklist the token
        // For now, we'll just send a success response
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

export const updateProfileInterests = async (req, res) => {
    try {
        const interests = Array.isArray(req.body?.interests)
            ? [...new Set(req.body.interests
                .map((item) => String(item || '').trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 15))]
            : [];

        if (interests.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one interest'
            });
        }

        await db.query(
            'UPDATE users SET profile_interests = ? WHERE id = ?',
            [JSON.stringify(interests), req.user.id]
        );

        const updatedUser = await User.findById(req.user.id);

        return res.json({
            success: true,
            message: 'Profile interests updated successfully',
            profileInterests: parseProfileInterests(updatedUser?.profile_interests || null)
        });
    } catch (error) {
        console.error('Update profile interests error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile interests'
        });
    }
};

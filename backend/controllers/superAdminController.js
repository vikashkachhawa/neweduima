import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import School from '../models/School.js';
import AuditLog from '../models/AuditLog.js';
import Subscription from '../models/Subscription.js';
import UsageTracker from '../models/UsageTracker.js';
import db from '../config/database.js';

// Get all schools
export const getAllSchools = async (req, res) => {
    try {
        const schools = await School.findAll();

        // Get user count for each school
        const schoolsWithCounts = await Promise.all(
            schools.map(async (school) => {
                const userCount = await School.getUserCount(school.id);
                return {
                    ...school,
                    modules: School.hydrateModules(school.modules),
                    userCount
                };
            })
        );

        res.json({
            success: true,
            schools: schoolsWithCounts
        });
    } catch (error) {
        console.error('Get schools error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Create new school
export const createSchool = async (req, res) => {
    try {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Please fix the highlighted validation errors',
                errors: validationErrors.array().map((err) => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        const { 
            name, 
            location, 
            email, 
            countryCode,
            phoneNumber,
            address, 
            timezone,
            academicYearStart,
            academicYearEnd,
            gradingScheme,
            modules,
            adminEmail, 
            adminFirstName, 
            adminLastName 
        } = req.body;

        const trimmedName = name.trim();
        const trimmedLocation = location.trim();
        const trimmedEmail = email?.trim() || null;
        const trimmedAddress = address?.trim() || null;
        const trimmedAdminEmail = adminEmail.trim().toLowerCase();
        const trimmedAdminFirstName = adminFirstName.trim();
        const trimmedAdminLastName = adminLastName.trim();
        const normalizedPhone = `${countryCode.trim()}${phoneNumber.trim()}`;

        // Generate subdomain
        const subdomain = School.generateSubdomain(trimmedName, trimmedLocation);

        // Check if subdomain already exists
        const existingSchool = await School.findBySubdomain(subdomain);
        if (existingSchool) {
            return res.status(400).json({
                success: false,
                message: 'A school with this name and location already exists',
                errors: [
                    {
                        field: 'name',
                        message: 'A school with this name and location already exists'
                    }
                ]
            });
        }

        const existingAdmin = await User.findByEmail(trimmedAdminEmail);
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin email already exists',
                errors: [
                    {
                        field: 'adminEmail',
                        message: 'Admin email already exists'
                    }
                ]
            });
        }

        // Create school
        const schoolId = await School.create({
            name: trimmedName,
            location: trimmedLocation,
            subdomain,
            email: trimmedEmail,
            phone: normalizedPhone,
            address: trimmedAddress,
            timezone,
            academic_year_start: academicYearStart,
            academic_year_end: academicYearEnd,
            grading_scheme: gradingScheme,
            modules
        });

        // Generate temporary password for admin
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create school admin
        const adminId = await User.create({
            school_id: schoolId,
            email: trimmedAdminEmail,
            password_hash: hashedPassword,
            first_name: trimmedAdminFirstName,
            last_name: trimmedAdminLastName,
            role: 'school_admin',
            must_change_password: true
        });

        res.status(201).json({
            success: true,
            message: 'School created successfully',
            school: {
                id: schoolId,
                name: trimmedName,
                location: trimmedLocation,
                subdomain,
                url: `https://${subdomain}.mydomain.com`,
                status: 'active',
                phone: normalizedPhone,
                modules: School.hydrateModules(modules)
            },
            admin: {
                id: adminId,
                email: trimmedAdminEmail,
                tempPassword
            }
        });
    } catch (error) {
        console.error('Create school error:', error);

        if (error?.code === 'ER_DUP_ENTRY') {
            const duplicateMessage = error.sqlMessage || 'Duplicate record already exists';
            const duplicateField = duplicateMessage.includes('users.email')
                ? 'adminEmail'
                : duplicateMessage.includes('schools.subdomain')
                    ? 'name'
                    : 'general';

            return res.status(400).json({
                success: false,
                message: 'Duplicate data detected. Please use different values.',
                errors: [
                    {
                        field: duplicateField,
                        message: duplicateMessage
                    }
                ]
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while creating school',
            errors: [
                {
                    field: 'general',
                    message: 'Unexpected server error. Please try again.'
                }
            ]
        });
    }
};

// Get school by ID
export const getSchoolById = async (req, res) => {
    try {
        const { id } = req.params;
        const school = await School.findById(id);

        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            });
        }

        const userCount = await School.getUserCount(id);

        res.json({
            success: true,
            school: {
                ...school,
                modules: School.hydrateModules(school.modules),
                userCount
            }
        });
    } catch (error) {
        console.error('Get school error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const { schoolId } = req.query;

        let users;
        if (schoolId) {
            users = await User.findBySchoolId(schoolId);
        } else {
            // Get all users (super admin only)
            const [rows] = await db.query(
                `SELECT u.id, u.school_id, u.email, u.first_name, u.last_name, 
                        u.role, u.is_active, u.created_at, s.name as school_name
                 FROM users u
                 LEFT JOIN schools s ON u.school_id = s.id
                 ORDER BY u.created_at DESC`
            );
            users = rows;
        }

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Create user
export const createUser = async (req, res) => {
    try {
        const { schoolId, email, firstName, lastName, role, sendTempPassword } = req.body;

        // Check if email already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Check subscription is active
        const isActive = await Subscription.isSubscriptionActive(schoolId);
        if (!isActive) {
            return res.status(402).json({
                success: false,
                message: 'Subscription required to create users',
                error: 'Subscription expired or inactive'
            });
        }

        // Check if school has exceeded user limit
        const exceeded = await UsageTracker.isLimitExceeded(schoolId, 'users_created');
        if (exceeded) {
            const usage = await UsageTracker.getUsage(schoolId, 'users_created');
            return res.status(402).json({
                success: false,
                message: 'User limit reached for your subscription plan',
                currentUsers: usage.current_value,
                maxUsers: usage.plan_limit,
                error: 'Upgrade your subscription to add more users'
            });
        }

        // Generate password
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user
        const userId = await User.create({
            school_id: schoolId,
            email,
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            role,
            must_change_password: true
        });

        // Increment usage counter
        await UsageTracker.incrementUsage(schoolId, 'users_created', 1);

        // Log the action
        await AuditLog.log(
            req.user.id,
            'user_created',
            'user',
            userId,
            { email, firstName, lastName, role },
            req,
            'success'
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: userId,
                email,
                tempPassword: sendTempPassword ? tempPassword : undefined
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

// Suspend or activate school
export const setSchoolStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body; // 'active' | 'suspended' | 'deleted' with optional reason

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ success: false, message: 'School not found' });
        }

        const targetStatus = ['active', 'suspended', 'deleted'].includes(status) ? status : 'suspended';

        // Require reason for suspended or deleted actions
        if ((targetStatus === 'suspended' || targetStatus === 'deleted') && (!reason || !String(reason).trim())) {
            return res.status(400).json({ success: false, message: 'Reason is required to suspend or delete a school' });
        }

        await School.updateStatus(id, targetStatus, reason || null);

        // Deactivate all users if school is suspended/deleted, reactivate if activated
        if (targetStatus === 'suspended' || targetStatus === 'deleted') {
            await User.deactivateBySchoolId(id);
        } else if (targetStatus === 'active') {
            await User.activateBySchoolId(id);
        }

        // Log audit event
        await AuditLog.log(
            req.user.id,
            `school_${targetStatus}`,
            'school',
            id,
            { old_status: school.status, new_status: targetStatus },
            req,
            'success',
            reason
        );

        res.json({ success: true, message: `School ${targetStatus}`, reason: reason || null });
    } catch (error) {
        console.error('Set school status error:', error);
        await AuditLog.log(req.user.id, `school_status_change`, 'school', id, req.body, req, 'failure', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update modules
export const updateSchoolModules = async (req, res) => {
    try {
        const { id } = req.params;
        const { modules } = req.body;

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ success: false, message: 'School not found' });
        }

        const merged = { ...School.hydrateModules(school.modules), ...modules };
        await School.updateModules(id, merged);

        res.json({ success: true, modules: merged });
    } catch (error) {
        console.error('Update school modules error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Clone school setup
export const cloneSchool = async (req, res) => {
    try {
        const { sourceId } = req.params;
        const { name, location, email, phone, address, timezone, academicYearStart, academicYearEnd, gradingScheme } = req.body;

        const source = await School.findById(sourceId);
        if (!source) {
            return res.status(404).json({ success: false, message: 'Source school not found' });
        }

        const subdomain = School.generateSubdomain(name, location);
        const existing = await School.findBySubdomain(subdomain);
        if (existing) {
            return res.status(400).json({ success: false, message: 'A school with this name/location already exists' });
        }

        const newSchoolId = await School.cloneFrom(source, {
            name,
            location,
            subdomain,
            email,
            phone,
            address,
            timezone,
            academic_year_start: academicYearStart,
            academic_year_end: academicYearEnd,
            grading_scheme: gradingScheme
        });

        res.status(201).json({
            success: true,
            message: 'School cloned successfully',
            school: {
                id: newSchoolId,
                name,
                location,
                subdomain,
                url: `https://${subdomain}.mydomain.com`,
                cloned_from: source.id,
                modules: School.hydrateModules(source.modules)
            }
        });
    } catch (error) {
        console.error('Clone school error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Reset user password
export const resetUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
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

// Toggle user active status
export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.update(userId, {
            is_active: isActive
        });

        // Log audit event
        await AuditLog.log(
            req.user.id,
            isActive ? 'user_activated' : 'user_deactivated',
            'user',
            userId,
            { email: user.email, new_status: isActive },
            req
        );

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        await AuditLog.log(req.user.id, 'user_status_toggle', 'user', req.params.userId, req.body, req, 'failure', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

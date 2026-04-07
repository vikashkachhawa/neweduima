import User from '../models/User.js';
import db from '../config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Generate a temporary password
const generateTemporaryPassword = () => {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
};

// Super Admin: Reset password for any user
export const superAdminResetPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const { sendEmail = false } = req.body;

        // Verify super admin
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only super admins can reset all user passwords'
            });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Update user with temporary password
        await db.query(
            `UPDATE users SET 
                password_hash = ?,
                is_temporary_password = TRUE,
                must_change_password = TRUE,
                password_reset_at = CURRENT_TIMESTAMP,
                password_reset_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)
             WHERE id = ?`,
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password reset successfully',
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                temporaryPassword: temporaryPassword
            }
        });
    } catch (error) {
        console.error('Super admin password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// School Admin: Reset password for users in their school
export const schoolAdminResetPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const schoolAdminId = req.user.id;
        const adminSchoolId = req.user.school_id;

        // Verify school admin
        if (req.user.role !== 'school_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only school admins can reset user passwords'
            });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify user is in same school and is faculty or student
        if (user.school_id !== adminSchoolId) {
            return res.status(403).json({
                success: false,
                message: 'Can only reset passwords for users in your school'
            });
        }

        if (!['faculty', 'student'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Can only reset passwords for faculty and student accounts'
            });
        }

        // Generate temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Update user with temporary password
        await db.query(
            `UPDATE users SET 
                password_hash = ?,
                is_temporary_password = TRUE,
                must_change_password = TRUE,
                password_reset_at = CURRENT_TIMESTAMP,
                password_reset_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)
             WHERE id = ?`,
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password reset successfully',
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                temporaryPassword: temporaryPassword
            }
        });
    } catch (error) {
        console.error('School admin password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// Faculty: Reset password for students in their classes
export const facultyResetPassword = async (req, res) => {
    try {
        const { studentId } = req.params;
        const facultyId = req.user.id;

        // Verify faculty
        if (req.user.role !== 'faculty') {
            return res.status(403).json({
                success: false,
                message: 'Only faculty can reset student passwords'
            });
        }

        // Get student details
        const [student] = await db.query(
            'SELECT id, email, first_name, last_name, role FROM users WHERE id = ? AND role = "student"',
            [studentId]
        );

        if (!student || student.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const studentData = student[0];

        // Verify faculty teaches this student (check class enrollment)
        const [classEnrollment] = await db.query(
            `SELECT ce.id FROM class_enrollments ce
             INNER JOIN classes c ON ce.class_id = c.id
             WHERE ce.student_id = ? AND c.faculty_id = ?`,
            [studentId, facultyId]
        );

        if (!classEnrollment || classEnrollment.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'This student is not enrolled in any of your classes'
            });
        }

        // Generate temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Update student password
        await db.query(
            `UPDATE users SET 
                password_hash = ?,
                is_temporary_password = TRUE,
                must_change_password = TRUE,
                password_reset_at = CURRENT_TIMESTAMP,
                password_reset_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)
             WHERE id = ?`,
            [hashedPassword, studentId]
        );

        res.json({
            success: true,
            message: 'Password reset successfully',
            user: {
                id: studentData.id,
                email: studentData.email,
                name: `${studentData.first_name} ${studentData.last_name}`,
                temporaryPassword: temporaryPassword
            }
        });
    } catch (error) {
        console.error('Faculty password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// Change password on first login (using temporary password)
export const changePasswordOnFirstLogin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password and clear temporary flags
        await db.query(
            `UPDATE users SET 
                password_hash = ?,
                is_temporary_password = FALSE,
                must_change_password = FALSE,
                password_reset_at = NULL
             WHERE id = ?`,
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
};

// Get all users (Super Admin)
export const getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only super admins can view all users'
            });
        }

        const [users] = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
                    u.is_temporary_password, u.must_change_password, s.name as school_name
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             ORDER BY u.created_at DESC`
        );

        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Get school users (School Admin)
export const getSchoolUsers = async (req, res) => {
    try {
        const schoolId = req.user.school_id;

        if (req.user.role !== 'school_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only school admins can view school users'
            });
        }

        const [users] = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
                    u.is_temporary_password, u.must_change_password
             FROM users u
             WHERE u.school_id = ? AND u.role IN ('faculty', 'student')
             ORDER BY u.created_at DESC`,
            [schoolId]
        );

        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Get school users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Get faculty's students (Faculty)
export const getFacultyStudents = async (req, res) => {
    try {
        const facultyId = req.user.id;

        if (req.user.role !== 'faculty') {
            return res.status(403).json({
                success: false,
                message: 'Only faculty can view their students'
            });
        }

        const [students] = await db.query(
            `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.is_active,
                    u.is_temporary_password, u.must_change_password
             FROM users u
             INNER JOIN class_enrollments ce ON u.id = ce.student_id
             INNER JOIN classes c ON ce.class_id = c.id
             WHERE c.faculty_id = ? AND u.role = 'student'
             ORDER BY u.first_name, u.last_name`,
            [facultyId]
        );

        res.json({
            success: true,
            students: students
        });
    } catch (error) {
        console.error('Get faculty students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
};

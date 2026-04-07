import db from '../config/database.js';

class User {
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT u.id, u.school_id, u.email, u.first_name, u.last_name, u.role, 
                    u.profile_interests, u.is_active, u.must_change_password, s.subdomain, s.name as school_name
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             WHERE u.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async findByEmail(email) {
        const [rows] = await db.query(
            `SELECT u.*, s.subdomain, s.name as school_name
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             WHERE u.email = ?`,
            [email]
        );
        return rows[0];
    }

    static async create(userData) {
        const { school_id, email, password_hash, first_name, last_name, role, must_change_password } = userData;
        const [result] = await db.query(
            `INSERT INTO users (school_id, email, password_hash, first_name, last_name, role, must_change_password)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [school_id, email, password_hash, first_name, last_name, role, must_change_password || false]
        );
        return result.insertId;
    }

    static async updatePassword(userId, newPasswordHash) {
        await db.query(
            'UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?',
            [newPasswordHash, userId]
        );
    }

    static async updateLastLogin(userId) {
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
    }

    static async findBySchoolId(schoolId) {
        const [rows] = await db.query(
            `SELECT id, email, first_name, last_name, role, is_active, created_at
             FROM users
             WHERE school_id = ?
             ORDER BY created_at DESC`,
            [schoolId]
        );
        return rows;
    }

    static async update(userId, updates) {
        const fields = [];
        const values = [];

        Object.entries(updates).forEach(([key, value]) => {
            fields.push(`${key} = ?`);
            values.push(value);
        });

        if (fields.length === 0) return;

        values.push(userId);
        await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    }

    static async deactivateBySchoolId(schoolId) {
        await db.query(
            'UPDATE users SET is_active = FALSE WHERE school_id = ?',
            [schoolId]
        );
    }

    static async activateBySchoolId(schoolId) {
        await db.query(
            'UPDATE users SET is_active = TRUE WHERE school_id = ?',
            [schoolId]
        );
    }

    // Role Management Methods
    static async getUserRoles(userId) {
        const [roles] = await db.query(
            `SELECT r.id, r.name, r.scope, ur.school_id
             FROM user_roles ur
             INNER JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = ?
             ORDER BY r.name`,
            [userId]
        );
        return roles;
    }

    static async assignRole(userId, roleId, schoolId = null) {
        await db.query(
            'INSERT INTO user_roles (user_id, role_id, school_id) VALUES (?, ?, ?)',
            [userId, roleId, schoolId]
        );
    }

    static async removeRole(userId, roleId, schoolId = null) {
        let query = 'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?';
        const params = [userId, roleId];

        if (schoolId) {
            query += ' AND school_id = ?';
            params.push(schoolId);
        } else {
            query += ' AND school_id IS NULL';
        }

        await db.query(query, params);
    }

    static async hasRole(userId, roleName, schoolId = null) {
        let query = `
            SELECT COUNT(*) as count
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ? AND r.name = ?
        `;
        const params = [userId, roleName];

        if (schoolId) {
            query += ' AND (ur.school_id = ? OR ur.school_id IS NULL)';
            params.push(schoolId);
        } else {
            query += ' AND ur.school_id IS NULL';
        }

        const [result] = await db.query(query, params);
        return result[0].count > 0;
    }

    static async getUsersWithRole(roleId, schoolId = null) {
        let query = `
            SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.school_id
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role_id = ?
        `;
        const params = [roleId];

        if (schoolId) {
            query += ' AND u.school_id = ?';
            params.push(schoolId);
        }

        const [users] = await db.query(query, params);
        return users;
    }
}

export default User;

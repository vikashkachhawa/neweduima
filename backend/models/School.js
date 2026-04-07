import db from '../config/database.js';

class School {
    static async findAll() {
        const [rows] = await db.query(
            `SELECT * FROM schools ORDER BY created_at DESC`
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.query(
            'SELECT * FROM schools WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async findBySubdomain(subdomain) {
        const [rows] = await db.query(
            'SELECT * FROM schools WHERE subdomain = ?',
            [subdomain]
        );
        return rows[0];
    }

    static async create(schoolData) {
        const { name, location, subdomain, email, phone, address, timezone, academic_year_start, academic_year_end, grading_scheme, modules, cloned_from } = schoolData;
        const [result] = await db.query(
            `INSERT INTO schools (name, location, subdomain, email, phone, address, timezone, academic_year_start, academic_year_end, grading_scheme, modules, cloned_from)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ,[
                name,
                location,
                subdomain,
                email,
                phone,
                address,
                timezone || 'Asia/Kolkata',
                academic_year_start || null,
                academic_year_end || null,
                grading_scheme || 'default',
                modules ? JSON.stringify(modules) : JSON.stringify(School.getDefaultModules()),
                cloned_from || null
            ]
        );
        return result.insertId;
    }

    static async update(id, updates) {
        const fields = [];
        const values = [];

        Object.entries(updates).forEach(([key, value]) => {
            fields.push(`${key} = ?`);
            values.push(value);
        });

        if (fields.length === 0) return;

        values.push(id);
        await db.query(
            `UPDATE schools SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    }

    static async updateStatus(id, status, reason = null) {
        const isActive = status === 'active';
        const deletedAt = status === 'deleted' ? new Date() : null;
        await db.query(
            `UPDATE schools SET status = ?, is_active = ?, status_reason = ?, deleted_at = ? WHERE id = ?`,
            [status, isActive, reason, deletedAt, id]
        );
    }

    static async updateModules(id, modules) {
        await db.query(
            `UPDATE schools SET modules = ? WHERE id = ?`,
            [JSON.stringify(modules), id]
        );
    }

    static getDefaultModules() {
        return {
            fees: true,
            attendance: true,
            lms: true,
            transport: false,
            exams: true,
            messaging: true
        };
    }

    static hydrateModules(rawModules) {
        if (!rawModules) return School.getDefaultModules();
        try {
            return typeof rawModules === 'string' ? JSON.parse(rawModules) : rawModules;
        } catch (e) {
            return School.getDefaultModules();
        }
    }

    static async cloneFrom(sourceSchool, overrides = {}) {
        const modules = School.hydrateModules(sourceSchool.modules || sourceSchool.modules_json);
        const data = {
            name: overrides.name,
            location: overrides.location,
            subdomain: overrides.subdomain,
            email: overrides.email || sourceSchool.email,
            phone: overrides.phone || sourceSchool.phone,
            address: overrides.address || sourceSchool.address,
            timezone: overrides.timezone || sourceSchool.timezone,
            academic_year_start: overrides.academic_year_start || sourceSchool.academic_year_start,
            academic_year_end: overrides.academic_year_end || sourceSchool.academic_year_end,
            grading_scheme: overrides.grading_scheme || sourceSchool.grading_scheme,
            modules,
            cloned_from: sourceSchool.id
        };
        return School.create(data);
    }

    static async getUserCount(schoolId) {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE school_id = ?',
            [schoolId]
        );
        return result[0].count;
    }

    static generateSubdomain(name, location) {
        const cleanName = name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '');
        const cleanLocation = location.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '');
        return `${cleanName}-${cleanLocation}`;
    }
}

export default School;

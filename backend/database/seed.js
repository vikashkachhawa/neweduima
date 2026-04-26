import bcrypt from 'bcryptjs';
import db from '../config/database.js';

const seedDatabase = async () => {
    try {
        console.log('🌱 Seeding database with default users...');

        // Hash passwords
        const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
        const adminPassword = await bcrypt.hash('Admin@123', 10);
        const facultyPassword = await bcrypt.hash('Faculty@123', 10);
        const studentPassword = await bcrypt.hash('Student@123', 10);

        // Insert Super Admin
        await db.query(
            `INSERT IGNORE INTO users (school_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
             VALUES (NULL, 'superadmin@app.eduima.com', ?, 'Super', 'Admin', 'super_admin', TRUE, FALSE)`,
            [superAdminPassword]
        );
        console.log('✅ Super Admin created');

        // Insert Demo School
        const [schoolResult] = await db.query(
            `INSERT IGNORE INTO schools (name, location, subdomain, email, phone, address)
             VALUES ('Demo Public School', 'Mumbai', 'demopublicschool-mumbai', 'info@demopublicschool.com', '+91-9876543210', 'Mumbai, Maharashtra, India')`
        );
        
        const schoolId = schoolResult.insertId || 1;
        console.log('✅ Demo School created');

        // Insert School Admin
        await db.query(
            `INSERT IGNORE INTO users (school_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
             VALUES (?, 'admin@demopublicschool.com', ?, 'School', 'Admin', 'school_admin', TRUE, FALSE)`,
            [schoolId, adminPassword]
        );
        console.log('✅ School Admin created');

        // Insert Faculty
        await db.query(
            `INSERT IGNORE INTO users (school_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
             VALUES (?, 'faculty@demopublicschool.com', ?, 'John', 'Teacher', 'faculty', TRUE, FALSE)`,
            [schoolId, facultyPassword]
        );
        console.log('✅ Faculty created');

        // Insert Student
        await db.query(
            `INSERT IGNORE INTO users (school_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
             VALUES (?, 'student@demopublicschool.com', ?, 'Jane', 'Student', 'student', TRUE, FALSE)`,
            [schoolId, studentPassword]
        );
        console.log('✅ Student created');

        console.log('\n✅ Database seeded successfully!');
        console.log('\nDefault Credentials:');
        console.log('Super Admin: superadmin@app.eduima.com / SuperAdmin@123');
        console.log('School Admin: admin@demopublicschool.com / Admin@123');
        console.log('Faculty: faculty@demopublicschool.com / Faculty@123');
        console.log('Student: student@demopublicschool.com / Student@123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();

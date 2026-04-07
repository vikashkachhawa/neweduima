import db from '../config/database.js';

export const up = async () => {
    try {
        // Add temporary_password field if not exists
        await db.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS temporary_password VARCHAR(255) NULL,
            ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT FALSE
        `);

        console.log('✅ Password reset fields added successfully');
    } catch (error) {
        console.error('Error adding password reset fields:', error.message);
        throw error;
    }
};

export const down = async () => {
    try {
        await db.query(`
            ALTER TABLE users DROP COLUMN IF EXISTS temporary_password,
            DROP COLUMN IF EXISTS password_reset_at,
            DROP COLUMN IF EXISTS password_reset_expires_at,
            DROP COLUMN IF EXISTS is_temporary_password
        `);

        console.log('✅ Password reset fields removed successfully');
    } catch (error) {
        console.error('Error removing password reset fields:', error.message);
        throw error;
    }
};

import jwt from 'jsonwebtoken';
import School from '../models/School.js';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('Auth: No token provided');
            return res.status(401).json({
                success: false,
                message: 'Authentication token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('Auth: User authenticated:', decoded.email, 'Role:', decoded.role);

        // For non-super-admin users, verify school is not suspended
        if (decoded.role !== 'super_admin' && decoded.school_id) {
            const school = await School.findById(decoded.school_id);
            if (!school) {
                return res.status(403).json({
                    success: false,
                    message: 'School not found'
                });
            }
            const status = school.status || (school.is_active ? 'active' : 'suspended');
            if (status === 'suspended') {
                return res.status(403).json({
                    success: false,
                    message: 'School is suspended. Access denied.',
                    suspended: true
                });
            }
            if (status === 'deleted') {
                return res.status(403).json({
                    success: false,
                    message: 'School has been deleted. Access denied.',
                    deleted: true
                });
            }
        }

        next();
    } catch (error) {
        console.log('Auth error:', error.name, error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired',
                expired: true
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

export default authMiddleware;

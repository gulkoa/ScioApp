const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET

// Roles with elevated access — bypass permission checks
const ELEVATED_ROLES = ['admin', 'captain']

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ status: false, message: 'Authentication required' })
    }

    try {
        const user = jwt.verify(token, JWT_SECRET)
        req.user = user
        next()
    } catch (err) {
        return res.status(401).json({ status: false, message: 'Invalid or expired token' })
    }
}

// Check if user has at least one of the required permissions.
// Admins and captains bypass this check.
function requirePermission(...permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: false, message: 'Authentication required' })
        }

        if (ELEVATED_ROLES.includes(req.user.role)) return next()

        const userPerms = req.user.permissions || []
        const hasPermission = permissions.some(p => userPerms.includes(p))

        if (!hasPermission) {
            return res.status(403).json({ status: false, message: 'Insufficient permissions' })
        }

        next()
    }
}

// Only admins and captains can access the admin panel
function requireAdmin(req, res, next) {
    if (!req.user || !ELEVATED_ROLES.includes(req.user.role)) {
        return res.status(403).json({ status: false, message: 'Admin access required' })
    }
    next()
}

module.exports = { authenticateToken, requirePermission, requireAdmin }

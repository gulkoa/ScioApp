const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET

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

function requirePermission(...permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: false, message: 'Authentication required' })
        }

        const userPerms = req.user.permissions || []
        const hasPermission = permissions.some(p => userPerms.includes(p))

        if (!hasPermission && req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: 'Insufficient permissions' })
        }

        next()
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ status: false, message: 'Admin access required' })
    }
    next()
}

module.exports = { authenticateToken, requirePermission, requireAdmin }

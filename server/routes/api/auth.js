const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { Resend } = require('resend')
const { authenticateToken, requireAdmin } = require('../../middleware/auth')

const router = express.Router()
const resend = new Resend(process.env.RESEND_API_KEY)

let db = {}

function setUp(DBclient) {
    db.users = DBclient.db('users').collection('users')
    db.users.createIndex({ email: 1 }, { unique: true }).catch(() => {})
}

function signToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body

        if (!email || !password || !name) {
            return res.json({ status: false, message: 'Name, email, and password are required' })
        }

        if (password.length < 6) {
            return res.json({ status: false, message: 'Password must be at least 6 characters' })
        }

        const existing = await db.users.findOne({ email: email.toLowerCase() })
        if (existing) {
            return res.json({ status: false, message: 'An account with this email already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const verificationToken = crypto.randomBytes(32).toString('hex')

        const user = {
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            role: 'student',
            permissions: ['read:db'],
            verified: false,
            verificationToken,
            createdAt: new Date()
        }

        await db.users.insertOne(user)

        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        const verifyUrl = `${baseUrl}/verify?token=${verificationToken}`

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'ScioApp <noreply@resend.dev>',
                to: [email],
                subject: 'Verify your ScioApp account',
                html: `
                    <h2>Welcome to ScioApp!</h2>
                    <p>Hi ${name},</p>
                    <p>Click the button below to verify your email address:</p>
                    <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0d6efd;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Verify Email</a>
                    <p style="margin-top:16px;color:#666;">Or copy this link: ${verifyUrl}</p>
                `
            })
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr)
        }

        res.json({ status: true, message: 'Account created! Check your email to verify.' })
    } catch (err) {
        console.error('Register error:', err)
        res.json({ status: false, message: 'Registration failed' })
    }
})

// Verify email
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query
        if (!token) {
            return res.json({ status: false, message: 'Invalid verification link' })
        }

        const user = await db.users.findOne({ verificationToken: token })
        if (!user) {
            return res.json({ status: false, message: 'Invalid or expired verification link' })
        }

        await db.users.updateOne(
            { _id: user._id },
            { $set: { verified: true }, $unset: { verificationToken: '' } }
        )

        res.json({ status: true, message: 'Email verified! You can now log in.' })
    } catch (err) {
        res.json({ status: false, message: 'Verification failed' })
    }
})

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.json({ status: false, message: 'Email and password are required' })
        }

        const user = await db.users.findOne({ email: email.toLowerCase() })
        if (!user) {
            return res.json({ status: false, message: 'Invalid email or password' })
        }

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.json({ status: false, message: 'Invalid email or password' })
        }

        if (!user.verified) {
            return res.json({ status: false, message: 'Please verify your email before logging in', needsVerification: true })
        }

        const token = signToken(user)

        res.json({
            status: true,
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions
            }
        })
    } catch (err) {
        res.json({ status: false, message: 'Login failed' })
    }
})

// Get current user (refresh user data from DB)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')
        const user = await db.users.findOne({ _id: new ObjectId(req.user.id) })
        if (!user) {
            return res.json({ status: false, message: 'User not found' })
        }

        const token = signToken(user)

        res.json({
            status: true,
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions
            }
        })
    } catch (err) {
        res.json({ status: false, message: 'Failed to get user' })
    }
})

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body
        const user = await db.users.findOne({ email: email.toLowerCase() })

        if (!user || user.verified) {
            return res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
        }

        const verificationToken = crypto.randomBytes(32).toString('hex')
        await db.users.updateOne({ _id: user._id }, { $set: { verificationToken } })

        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        const verifyUrl = `${baseUrl}/verify?token=${verificationToken}`

        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'ScioApp <noreply@resend.dev>',
            to: [email],
            subject: 'Verify your ScioApp account',
            html: `
                <h2>Verify your ScioApp account</h2>
                <p>Hi ${user.name},</p>
                <p>Click below to verify your email:</p>
                <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0d6efd;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Verify Email</a>
                <p style="margin-top:16px;color:#666;">Or copy this link: ${verifyUrl}</p>
            `
        })

        res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
    } catch (err) {
        res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
    }
})

// === Admin Routes ===

// List all users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.users.find({}, {
            projection: { password: 0, verificationToken: 0 }
        }).toArray()

        res.json({
            status: true,
            users: users.map(u => ({
                id: u._id.toString(),
                email: u.email,
                name: u.name,
                role: u.role,
                permissions: u.permissions,
                verified: u.verified,
                createdAt: u.createdAt
            }))
        })
    } catch (err) {
        res.json({ status: false, message: 'Failed to load users' })
    }
})

// Update user role
router.patch('/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')
        const { role } = req.body
        const validRoles = ['student', 'coach', 'admin']

        if (!validRoles.includes(role)) {
            return res.json({ status: false, message: 'Invalid role' })
        }

        await db.users.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { role } }
        )

        res.json({ status: true, message: 'Role updated' })
    } catch (err) {
        res.json({ status: false, message: 'Failed to update role' })
    }
})

// Update user permissions
router.patch('/admin/users/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')
        const { permissions } = req.body

        if (!Array.isArray(permissions)) {
            return res.json({ status: false, message: 'Permissions must be an array' })
        }

        const validPermissions = ['read:db', 'add:db', 'propose:db', 'read:reports', 'manage:db', 'manage:ec', 'manage:c', 'manage:coaches']
        const filtered = permissions.filter(p => validPermissions.includes(p))

        await db.users.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { permissions: filtered } }
        )

        res.json({ status: true, message: 'Permissions updated' })
    } catch (err) {
        res.json({ status: false, message: 'Failed to update permissions' })
    }
})

// Delete user
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')

        if (req.params.id === req.user.id) {
            return res.json({ status: false, message: 'Cannot delete your own account' })
        }

        await db.users.deleteOne({ _id: new ObjectId(req.params.id) })
        res.json({ status: true, message: 'User deleted' })
    } catch (err) {
        res.json({ status: false, message: 'Failed to delete user' })
    }
})

module.exports = { router, setUp }

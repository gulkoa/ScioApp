const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { Resend } = require('resend')
const rateLimit = require('express-rate-limit')
const { authenticateToken, requireAdmin } = require('../../middleware/auth')

const router = express.Router()
const resend = new Resend(process.env.RESEND_API_KEY)

// Strict limiter for sensitive auth actions (login, register, forgot-password)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Too many attempts. Please try again in 15 minutes.' }
})

// Looser limiter for password reset (prevent email flooding)
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Too many reset requests. Please try again in an hour.' }
})

let db = {}

async function setUp(DBclient) {
    db.users = DBclient.db('scioapp').collection('users')

    // Ensure correct indexes for the multi-email schema:
    //  - unique on emails.address BUT ONLY when emails.verified == true
    //    (unverified duplicates across users are allowed; verify-wins race
    //     resolves them atomically when one user clicks the verification link)
    //  - drop the legacy unique index on `email` if present
    try {
        const existing = await db.users.indexes()
        if (existing.some(i => i.name === 'email_1')) {
            await db.users.dropIndex('email_1').catch(() => {})
        }
        await db.users.createIndex(
            { 'emails.address': 1 },
            {
                unique: true,
                partialFilterExpression: { 'emails.verified': true },
                name: 'emails_verified_unique'
            }
        )
    } catch (err) {
        console.error('Failed to configure users indexes:', err)
    }
}

// ─── Multi-email helpers ────────────────────────────────────────────────────
//
// `user.emails` is the source of truth:
//   [{ address, verified, primary, verificationToken?, addedAt, verifiedAt? }]
// Email is NOT a stable identifier — `_id` is. Never trust req.user.email to
// look up a user; always use req.user.id.

function primaryEmailOf(user) {
    if (!user) return ''
    if (Array.isArray(user.emails) && user.emails.length > 0) {
        const p = user.emails.find(e => e.primary)
        return (p || user.emails[0]).address
    }
    return (user.email || '').toLowerCase()
}

function verifiedEmailsOf(user) {
    if (Array.isArray(user.emails)) {
        return user.emails.filter(e => e.verified).map(e => e.address)
    }
    return user && user.verified && user.email ? [user.email.toLowerCase()] : []
}

function computeDomainPerms(addresses) {
    const perms = new Set()
    if (addresses.some(a => a.toLowerCase().endsWith('@solonschools.net'))) {
        perms.add('read:db')
    }
    return [...perms]
}

// Convert legacy { email, verified } users to the new { emails: [...] } shape
// in-place AND in the database. No-op if already migrated.
async function ensureMigrated(user) {
    if (!user) return user
    if (Array.isArray(user.emails)) return user
    const entry = {
        address: (user.email || '').toLowerCase(),
        verified: !!user.verified,
        primary: true,
        addedAt: user.createdAt || new Date()
    }
    if (entry.verified) entry.verifiedAt = user.createdAt || new Date()
    if (user.verificationToken) entry.verificationToken = user.verificationToken
    await db.users.updateOne(
        { _id: user._id },
        {
            $set: { emails: [entry] },
            $unset: { email: '', verified: '', verificationToken: '' }
        }
    )
    user.emails = [entry]
    delete user.email
    delete user.verified
    delete user.verificationToken
    return user
}

// Matches ANY user that has this address on any entry (verified or not).
async function findUserByAnyEmail(address) {
    const lower = address.toLowerCase()
    return await db.users.findOne({
        $or: [
            { 'emails.address': lower },
            { email: lower } // legacy fallback (pre-migration users)
        ]
    })
}

// Matches a user only if this address is VERIFIED on their account.
// Used for login and forgot-password.
async function findUserByVerifiedEmail(address) {
    const lower = address.toLowerCase()
    return await db.users.findOne({
        $or: [
            { emails: { $elemMatch: { address: lower, verified: true } } },
            { email: lower, verified: true } // legacy
        ]
    })
}

async function isEmailVerifiedByAnother(address, excludeUserId) {
    const lower = address.toLowerCase()
    const user = await db.users.findOne({
        _id: { $ne: excludeUserId },
        $or: [
            { emails: { $elemMatch: { address: lower, verified: true } } },
            { email: lower, verified: true }
        ]
    })
    return !!user
}

// Verify-wins: mark `address` verified on userId, then atomically pull this
// address from every other user. Delete users left with no emails, and
// promote a new primary on any user who lost theirs.
async function claimEmail(userId, address) {
    const lower = address.toLowerCase()

    await db.users.updateOne(
        { _id: userId, 'emails.address': lower },
        {
            $set: {
                'emails.$.verified': true,
                'emails.$.verifiedAt': new Date(),
                'emails.$.primary': false // primary flag is handled below if this is the only email
            },
            $unset: { 'emails.$.verificationToken': '' }
        }
    )

    // If target user only has one email, it must be primary — fix up
    const target = await db.users.findOne({ _id: userId })
    if (target && Array.isArray(target.emails) && !target.emails.some(e => e.primary)) {
        // Promote first verified (or first) to primary
        const idx = Math.max(target.emails.findIndex(e => e.verified), 0)
        await db.users.updateOne(
            { _id: userId },
            { $set: { [`emails.${idx}.primary`]: true } }
        )
    }

    // Remove the address from every OTHER user
    await db.users.updateMany(
        { _id: { $ne: userId }, 'emails.address': lower },
        { $pull: { emails: { address: lower } } }
    )

    // Clean up users left with no emails (never verified anything, lost
    // their only claim to the address)
    await db.users.deleteMany({ emails: { $size: 0 } })

    // Promote a new primary on any user who lost theirs
    const orphans = await db.users.find({
        'emails.0': { $exists: true },
        emails: { $not: { $elemMatch: { primary: true } } }
    }).toArray()
    for (const u of orphans) {
        const idx = Math.max(u.emails.findIndex(e => e.verified), 0)
        await db.users.updateOne(
            { _id: u._id },
            { $set: { [`emails.${idx}.primary`]: true } }
        )
    }
}

// Recompute permissions as the union of currently-granted perms and any
// domain-derived perms from the user's verified emails. Never downgrades —
// removing an email does not revoke a previously-granted perm.
async function recomputePermissionsFor(userId) {
    const user = await db.users.findOne({ _id: userId })
    if (!user) return
    const derived = computeDomainPerms(verifiedEmailsOf(user))
    const merged = [...new Set([...(user.permissions || []), ...derived])]
    if (merged.length !== (user.permissions || []).length) {
        await db.users.updateOne({ _id: userId }, { $set: { permissions: merged } })
    }
}

// Gravatar URL from email (falls back to identicon for users without a Gravatar)
function gravatarUrl(email, size) {
    const s = size || 128
    const addr = (email || '').trim().toLowerCase()
    const hash = crypto.createHash('md5').update(addr).digest('hex')
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${s}`
}

async function sendVerificationEmail(toAddress, userName, token, req) {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`
    const verifyUrl = `${baseUrl}/verify?token=${token}`
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'ScioApp <noreply@resend.dev>',
            to: [toAddress],
            subject: 'Verify your ScioApp email',
            html: `
                <h2>Verify your email</h2>
                <p>Hi ${userName},</p>
                <p>Click the button below to verify this email address for your ScioApp account:</p>
                <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0d6efd;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Verify Email</a>
                <p style="margin-top:16px;color:#666;">Or copy this link: ${verifyUrl}</p>
            `
        })
    } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr)
    }
}

// JWT carries only the durable identifier (_id) plus display fields.
// Email is NOT in the token — it can change.
function signToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            name: user.name,
            role: user.role,
            permissions: user.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}

// Shape returned to the client. Emails array is the source of truth, but we
// keep a top-level `email` = primary for convenience/back-compat with UI bits
// that only need a single address.
function userResponse(user) {
    const primary = primaryEmailOf(user)
    const emails = Array.isArray(user.emails)
        ? user.emails.map(e => ({
            address: e.address,
            verified: !!e.verified,
            primary: !!e.primary,
            addedAt: e.addedAt || null,
            verifiedAt: e.verifiedAt || null
        }))
        : [{ address: primary, verified: !!user.verified, primary: true, addedAt: user.createdAt || null, verifiedAt: user.verified ? (user.createdAt || null) : null }]
    return {
        id: user._id.toString(),
        email: primary,
        emails,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        picture: gravatarUrl(primary, 128)
    }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// Register
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body

        if (!email || !password || !name) {
            return res.json({ status: false, message: 'Name, email, and password are required' })
        }

        if (password.length < 6) {
            return res.json({ status: false, message: 'Password must be at least 6 characters' })
        }

        const lower = email.toLowerCase()

        // Block only if another account already has this email VERIFIED.
        // If it's only unverified elsewhere, allow — verify-wins handles it.
        if (await isEmailVerifiedByAnother(lower, null)) {
            return res.json({ status: false, message: 'An account with this email already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const verificationToken = crypto.randomBytes(32).toString('hex')

        const user = {
            emails: [{
                address: lower,
                verified: false,
                primary: true,
                verificationToken,
                addedAt: new Date()
            }],
            password: hashedPassword,
            name,
            role: 'student',
            permissions: [], // domain perms applied after verification
            createdAt: new Date()
        }

        await db.users.insertOne(user)
        await sendVerificationEmail(lower, name, verificationToken, req)

        res.json({ status: true, message: 'Account created! Check your email to verify.' })
    } catch (err) {
        console.error('Register error:', err)
        res.json({ status: false, message: 'Registration failed' })
    }
})

// Verify email — works for primary AND any additional email (token is stored
// inside the specific `emails[]` entry).
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query
        if (!token) {
            return res.json({ status: false, message: 'Invalid verification link' })
        }

        // Try new schema first
        let user = await db.users.findOne({ 'emails.verificationToken': token })
        let address

        if (user) {
            const entry = user.emails.find(e => e.verificationToken === token)
            if (!entry) {
                return res.json({ status: false, message: 'Invalid or expired verification link' })
            }
            address = entry.address
        } else {
            // Legacy fallback
            user = await db.users.findOne({ verificationToken: token })
            if (!user) {
                return res.json({ status: false, message: 'Invalid or expired verification link' })
            }
            await ensureMigrated(user)
            user = await db.users.findOne({ _id: user._id })
            address = primaryEmailOf(user)
        }

        // Safety: if another user verified this address in the meantime, refuse.
        if (await isEmailVerifiedByAnother(address, user._id)) {
            return res.json({ status: false, message: 'This email is already verified on another account.' })
        }

        await claimEmail(user._id, address)
        await recomputePermissionsFor(user._id)

        res.json({ status: true, message: 'Email verified! You can now log in.' })
    } catch (err) {
        console.error('Verify error:', err)
        res.json({ status: false, message: 'Verification failed' })
    }
})

// Login — accepts any VERIFIED email on the account
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.json({ status: false, message: 'Email and password are required' })
        }

        const lower = email.toLowerCase()
        let user = await findUserByVerifiedEmail(lower)

        if (!user) {
            // Is this an unverified email on some account? Give the correct error.
            const unverified = await findUserByAnyEmail(lower)
            if (unverified) {
                const validPassword = await bcrypt.compare(password, unverified.password)
                if (validPassword) {
                    return res.json({ status: false, message: 'Please verify your email before logging in', needsVerification: true })
                }
            }
            return res.json({ status: false, message: 'Invalid email or password' })
        }

        await ensureMigrated(user)
        user = await db.users.findOne({ _id: user._id })

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.json({ status: false, message: 'Invalid email or password' })
        }

        const token = signToken(user)
        res.json({ status: true, token, user: userResponse(user) })
    } catch (err) {
        console.error('Login error:', err)
        res.json({ status: false, message: 'Login failed' })
    }
})

// Get current user (refresh user data from DB)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')
        let user = await db.users.findOne({ _id: new ObjectId(req.user.id) })
        if (!user) {
            return res.json({ status: false, message: 'User not found' })
        }

        await ensureMigrated(user)
        user = await db.users.findOne({ _id: user._id })

        const token = signToken(user)
        res.json({ status: true, token, user: userResponse(user) })
    } catch (err) {
        console.error('/me error:', err)
        res.json({ status: false, message: 'Failed to get user' })
    }
})

// Resend verification email — unauthenticated, for the primary email post-register.
// For already-logged-in users, use POST /me/emails/resend instead.
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
        }

        const lower = email.toLowerCase()
        const user = await findUserByAnyEmail(lower)

        // Respond the same way regardless of whether the user exists to avoid enumeration
        if (!user) {
            return res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
        }

        await ensureMigrated(user)
        const fresh = await db.users.findOne({ _id: user._id })
        const entry = (fresh.emails || []).find(e => e.address === lower)
        if (!entry || entry.verified) {
            return res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
        }

        const verificationToken = crypto.randomBytes(32).toString('hex')
        await db.users.updateOne(
            { _id: fresh._id, 'emails.address': lower },
            { $set: { 'emails.$.verificationToken': verificationToken } }
        )
        await sendVerificationEmail(lower, fresh.name, verificationToken, req)

        res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
    } catch (err) {
        console.error('Resend verification error:', err)
        res.json({ status: true, message: 'If that email exists and is unverified, a new link has been sent.' })
    }
})

// Forgot password — accepts ANY verified email on the account
router.post('/forgot-password', resetLimiter, async (req, res) => {
    try {
        const { email } = req.body
        if (!email) return res.json({ status: false, message: 'Email is required' })

        const lower = email.toLowerCase()
        const user = await findUserByVerifiedEmail(lower)

        // Always respond the same way to avoid user enumeration
        if (!user) {
            return res.json({ status: true, message: 'If that email is registered, a reset link has been sent.' })
        }

        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await db.users.updateOne(
            { _id: user._id },
            { $set: { resetToken, resetExpires } }
        )

        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'ScioApp <noreply@resend.dev>',
                to: [lower], // send to the specific verified address the user entered
                subject: 'Reset your ScioApp password',
                html: `
                    <h2>Reset your password</h2>
                    <p>Hi ${user.name},</p>
                    <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0d6efd;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
                    <p style="margin-top:16px;color:#666;">Or copy this link: ${resetUrl}</p>
                    <p style="color:#666;">If you didn't request a password reset, you can ignore this email.</p>
                `
            })
        } catch (emailErr) {
            console.error('Failed to send reset email:', emailErr)
        }

        res.json({ status: true, message: 'If that email is registered, a reset link has been sent.' })
    } catch (err) {
        console.error('Forgot password error:', err)
        res.json({ status: false, message: 'Failed to process request' })
    }
})

// Reset password — verify token, set new password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body
        if (!token || !password) return res.json({ status: false, message: 'Token and password are required' })
        if (password.length < 6) return res.json({ status: false, message: 'Password must be at least 6 characters' })

        const user = await db.users.findOne({
            resetToken: token,
            resetExpires: { $gt: new Date() }
        })

        if (!user) return res.json({ status: false, message: 'Invalid or expired reset link' })

        const hashedPassword = await bcrypt.hash(password, 10)

        await db.users.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: '', resetExpires: '' }
            }
        )

        res.json({ status: true, message: 'Password updated! You can now log in.' })
    } catch (err) {
        console.error('Reset password error:', err)
        res.json({ status: false, message: 'Failed to reset password' })
    }
})

// Change name — authenticated user
router.patch('/me/name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body
        if (!name || !name.trim()) return res.json({ status: false, message: 'Name is required' })
        if (name.trim().length > 64) return res.json({ status: false, message: 'Name is too long' })

        const { ObjectId } = require('mongodb')
        await db.users.updateOne(
            { _id: new ObjectId(req.user.id) },
            { $set: { name: name.trim() } }
        )

        const updatedUser = await db.users.findOne({ _id: new ObjectId(req.user.id) })
        await ensureMigrated(updatedUser)
        const fresh = await db.users.findOne({ _id: updatedUser._id })
        const newToken = signToken(fresh)

        res.json({ status: true, message: 'Name updated', token: newToken, user: userResponse(fresh) })
    } catch (err) {
        console.error('Change name error:', err)
        res.json({ status: false, message: 'Failed to update name' })
    }
})

// Change password — authenticated user (knows current password)
router.patch('/me/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword) return res.json({ status: false, message: 'Current and new password are required' })
        if (newPassword.length < 6) return res.json({ status: false, message: 'New password must be at least 6 characters' })

        const { ObjectId } = require('mongodb')
        const user = await db.users.findOne({ _id: new ObjectId(req.user.id) })
        if (!user) return res.json({ status: false, message: 'User not found' })

        const valid = await bcrypt.compare(currentPassword, user.password)
        if (!valid) return res.json({ status: false, message: 'Current password is incorrect' })

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await db.users.updateOne(
            { _id: new ObjectId(req.user.id) },
            { $set: { password: hashedPassword } }
        )

        res.json({ status: true, message: 'Password changed successfully' })
    } catch (err) {
        console.error('Change password error:', err)
        res.json({ status: false, message: 'Failed to change password' })
    }
})

// Delete own account — authenticated user
router.delete('/me', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')
        await db.users.deleteOne({ _id: new ObjectId(req.user.id) })
        res.json({ status: true, message: 'Account deleted' })
    } catch (err) {
        console.error('Delete account error:', err)
        res.json({ status: false, message: 'Failed to delete account' })
    }
})

// ─── Multi-email management (authenticated) ────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Add an additional email to the current account
router.post('/me/emails', authenticateToken, authLimiter, async (req, res) => {
    try {
        const { address } = req.body
        if (!address || !EMAIL_RE.test(address)) {
            return res.json({ status: false, message: 'Please enter a valid email address' })
        }

        const { ObjectId } = require('mongodb')
        const userId = new ObjectId(req.user.id)
        const lower = address.toLowerCase()

        let user = await db.users.findOne({ _id: userId })
        if (!user) return res.json({ status: false, message: 'User not found' })
        await ensureMigrated(user)
        user = await db.users.findOne({ _id: userId })

        if ((user.emails || []).some(e => e.address === lower)) {
            return res.json({ status: false, message: 'This email is already on your account' })
        }
        if (await isEmailVerifiedByAnother(lower, userId)) {
            return res.json({ status: false, message: 'This email is already verified on another account' })
        }

        const verificationToken = crypto.randomBytes(32).toString('hex')
        await db.users.updateOne(
            { _id: userId },
            {
                $push: {
                    emails: {
                        address: lower,
                        verified: false,
                        primary: false,
                        verificationToken,
                        addedAt: new Date()
                    }
                }
            }
        )

        await sendVerificationEmail(lower, user.name, verificationToken, req)

        const fresh = await db.users.findOne({ _id: userId })
        const token = signToken(fresh)
        res.json({ status: true, message: 'Verification email sent', token, user: userResponse(fresh) })
    } catch (err) {
        console.error('Add email error:', err)
        res.json({ status: false, message: 'Failed to add email' })
    }
})

// Resend verification for one of the user's own unverified emails
router.post('/me/emails/resend', authenticateToken, authLimiter, async (req, res) => {
    try {
        const { address } = req.body
        if (!address) return res.json({ status: false, message: 'Address is required' })

        const { ObjectId } = require('mongodb')
        const userId = new ObjectId(req.user.id)
        const lower = address.toLowerCase()

        let user = await db.users.findOne({ _id: userId })
        if (!user) return res.json({ status: false, message: 'User not found' })
        await ensureMigrated(user)
        user = await db.users.findOne({ _id: userId })

        const entry = (user.emails || []).find(e => e.address === lower)
        if (!entry) return res.json({ status: false, message: 'Email not found on your account' })
        if (entry.verified) return res.json({ status: false, message: 'This email is already verified' })

        const verificationToken = crypto.randomBytes(32).toString('hex')
        await db.users.updateOne(
            { _id: userId, 'emails.address': lower },
            { $set: { 'emails.$.verificationToken': verificationToken } }
        )
        await sendVerificationEmail(lower, user.name, verificationToken, req)

        res.json({ status: true, message: 'Verification email sent' })
    } catch (err) {
        console.error('Resend email error:', err)
        res.json({ status: false, message: 'Failed to resend verification' })
    }
})

// Remove a non-primary email from the current account
router.delete('/me/emails/:address', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')
        const userId = new ObjectId(req.user.id)
        const lower = decodeURIComponent(req.params.address).toLowerCase()

        let user = await db.users.findOne({ _id: userId })
        if (!user) return res.json({ status: false, message: 'User not found' })
        await ensureMigrated(user)
        user = await db.users.findOne({ _id: userId })

        const entry = (user.emails || []).find(e => e.address === lower)
        if (!entry) return res.json({ status: false, message: 'Email not found on your account' })
        if (entry.primary) return res.json({ status: false, message: 'Cannot remove your primary email. Set another verified email as primary first.' })

        await db.users.updateOne(
            { _id: userId },
            { $pull: { emails: { address: lower } } }
        )

        const fresh = await db.users.findOne({ _id: userId })
        const token = signToken(fresh)
        res.json({ status: true, message: 'Email removed', token, user: userResponse(fresh) })
    } catch (err) {
        console.error('Remove email error:', err)
        res.json({ status: false, message: 'Failed to remove email' })
    }
})

// Promote a verified email to primary
router.patch('/me/emails/primary', authenticateToken, async (req, res) => {
    try {
        const { address } = req.body
        if (!address) return res.json({ status: false, message: 'Address is required' })

        const { ObjectId } = require('mongodb')
        const userId = new ObjectId(req.user.id)
        const lower = address.toLowerCase()

        let user = await db.users.findOne({ _id: userId })
        if (!user) return res.json({ status: false, message: 'User not found' })
        await ensureMigrated(user)
        user = await db.users.findOne({ _id: userId })

        const entry = (user.emails || []).find(e => e.address === lower)
        if (!entry) return res.json({ status: false, message: 'Email not found on your account' })
        if (!entry.verified) return res.json({ status: false, message: 'Verify this email before making it primary' })
        if (entry.primary) return res.json({ status: true, message: 'Already primary', token: signToken(user), user: userResponse(user) })

        const newEmails = user.emails.map(e => ({
            ...e,
            primary: e.address === lower
        }))
        await db.users.updateOne({ _id: userId }, { $set: { emails: newEmails } })

        const fresh = await db.users.findOne({ _id: userId })
        const token = signToken(fresh)
        res.json({ status: true, message: 'Primary email updated', token, user: userResponse(fresh) })
    } catch (err) {
        console.error('Set primary error:', err)
        res.json({ status: false, message: 'Failed to update primary email' })
    }
})

// === Admin Routes ===

// List all users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.users.find({}, {
            projection: { password: 0 }
        }).toArray()

        res.json({
            status: true,
            users: users.map(u => {
                const primary = primaryEmailOf(u)
                const verifiedAny = Array.isArray(u.emails)
                    ? u.emails.some(e => e.verified)
                    : !!u.verified
                return {
                    id: u._id.toString(),
                    email: primary,
                    emails: Array.isArray(u.emails) ? u.emails.map(e => ({
                        address: e.address,
                        verified: !!e.verified,
                        primary: !!e.primary
                    })) : [{ address: primary, verified: !!u.verified, primary: true }],
                    name: u.name,
                    role: u.role,
                    permissions: u.permissions,
                    verified: verifiedAny,
                    createdAt: u.createdAt,
                    picture: gravatarUrl(primary, 128)
                }
            })
        })
    } catch (err) {
        console.error('List users error:', err)
        res.json({ status: false, message: 'Failed to load users' })
    }
})

// Update user role — admin only (captains cannot assign roles)
router.patch('/admin/users/:id/role', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: 'Only admins can change roles' })
        }

        const { ObjectId } = require('mongodb')
        const { role } = req.body
        const validRoles = ['student', 'captain', 'admin']

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

// Update user permissions — admins can edit anyone, captains can only edit students
router.patch('/admin/users/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb')

        // Captains can only edit students
        if (req.user.role === 'captain') {
            const target = await db.users.findOne({ _id: new ObjectId(req.params.id) })
            if (!target || target.role !== 'student') {
                return res.status(403).json({ status: false, message: 'Captains can only edit student permissions' })
            }
        }

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

// Delete user — admin only
router.delete('/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ status: false, message: 'Only admins can delete users' })
    }
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

module.exports = { router, setUp, primaryEmailOf }

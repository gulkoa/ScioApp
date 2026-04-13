const express = require('express')
const mongodb = require('mongodb')
const crypto = require('crypto')
const axios = require('axios')
const rateLimit = require('express-rate-limit')
const { requirePermission, requireAdmin } = require('../../middleware/auth')
const { primaryEmailOf } = require('./auth')

const submitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.user?.id || 'anon',
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Too many submissions. Please slow down.' }
})

function gravatarUrl(email, size) {
    const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex')
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size || 64}`
}
let client = null
let db = {}

// In-memory store for MADTON questions (secret never sent to client)
const madtonQuestions = new Map()

function storeMadtonQuestion(question) {
    const id = new mongodb.ObjectId().toString()
    madtonQuestions.set(id, question)
    return id
}

async function setUp(DBclient) {
    client = DBclient
    const sdb = client.db('scioapp')
    db.questions = sdb.collection('questions')
    db.submissions = sdb.collection('submissions')
    db.users = sdb.collection('users')
    db.tests = sdb.collection('tests')
    db.testSubmissions = sdb.collection('test_submissions')
    db.events = sdb.collection('events')
}

const router = express.Router()
//jwtAuthz(['read:db'])
router.post('/loadFeed', requirePermission('read:db'), async (req, res) => {
    try {
        const {event, topicsNames} = req.body
        const userID = req.user.id
        const questions = await db.questions.find({event, topic: {$in: topicsNames}, showInFeed: true}).toArray()
        if (questions.length === 0) {
            res.json({status: false, message: "No questions found"})
            return
        }
        let randomIndex = Math.floor(Math.random() * questions.length)
        let question = questions[randomIndex]
        while(questions.length > 0) {
            let thisSubmission = await db.submissions.find({questionID: question._id.toString(), userID}, {sort: {timestamp: -1}}).limit(1).toArray()
            thisSubmission = thisSubmission[0]
            if (thisSubmission && Date.now() - thisSubmission.timestamp < 1000 * 60 * 60 * 24 * 7) {
                questions.splice(randomIndex, 1)
                randomIndex = Math.floor(Math.random() * questions.length)
                question = questions[randomIndex]
            }
            else {
                delete question.question
                res.json({
                    status: true,
                    question
                })
                return
            }
        }
        res.json({
            status: false,
            message: "No questions found that were not answered during the last week"
        })
    }
    catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})
//jwtAuthz(['read:db'])
router.post('/loadLibrary', requirePermission('read:db'), async (req, res) => {
    try {
        const {event, topicsNames, showHidden} = req.body
        const userID = req.user.id
        const filter = {event, topic: {$in: topicsNames}}
        // Only users with manage:db can see hidden questions
        const userPerms = req.user?.permissions || []
        const canManage = ['admin', 'captain'].includes(req.user?.role) || userPerms.includes('manage:db')
        if (!showHidden || !canManage) {
            filter.showInLibrary = true
        }
        let questions = await db.questions.find(filter).toArray()
        if (questions.length === 0) {
            res.json({status: false, message: "No questions found"})
            return
        }
        else {
            for (let question of questions) {
                let submission = await db.submissions.find({questionID: question._id.toString(), userID}, {sort: {timestamp: -1}}).limit(1).toArray()
                submission = submission[0]
                if (submission) {
                    question.solved = true
                    question.solvedDate = submission.timestamp
                    question.solvedDaysAgo = Math.floor((new Date().getTime() - new Date(submission.timestamp).getTime()) / (1000 * 60 * 60 * 24))
                    if (question.solvedDaysAgo === 0) {
                        question.solvedDateMessage = "today"
                    }
                    else if (question.solvedDaysAgo === 1) {
                        question.solvedDateMessage = "yesterday"
                    }
                    else {
                        question.solvedDateMessage = question.solvedDaysAgo + " days ago"
                    }
                }
                else {
                    question.solved = false
                }
                delete question.secret
            }
            res.json({
                status: true,
                questions
            })
        }
    }
    catch (err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }

})
//jwtAuthz(['read:db'])
router.post('/loadQuestion', requirePermission('read:db'), async (req, res) => {
    try {
        const {questionID} = req.body
        const userID = req.user.id


        if (questionID === 'aurora1445') {
            res.send({
                question: {"_id":{"$oid":"61a05902d63cbf8eddaf3ed7"},"prompt":"evaluate (A and B) or (A xor B) if A = 1 and B = 0","type":"MultipleChoice","options":["1","0","neither"],"secret":{"correctOptions":[{"$numberInt":"0"}]},"topic":"binary algebra","event":"Cybersecurity","showInFeed":true,"showInLibrary":true}
            })
            return
        }

        if (questionID === 'oreo') {
            res.send({
                question: {"prompt":"","type":"MultipleChoice","options":["1","0","neither"], "topic":"Nabisco","event":"Golden"}
            })
            return
        }

        const question = await db.questions.findOne({_id: mongodb.ObjectId(questionID)})
        if (!question) {
            res.json({status: false, message: "Question not found"})
        }
        else {
            // Only expose secret to users who can edit questions
            const userPerms = req.user?.permissions || []
            const canManage = ['admin', 'captain'].includes(req.user?.role) || userPerms.includes('manage:db')
            if (!canManage) delete question.secret
            res.json({
                status: true,
                question
            })
        }
    }
    catch (err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

router.post('/loadTest', requirePermission('read:db'), async (req, res) => {
    try {
        const {testID} = req.body
        const userID = req.user.id
        const test = await db.tests.findOne({_id: mongodb.ObjectId(testID)})
        if (!test) {
            res.json({status: false, message: "Test not found"})
            return
        }
        for (let question of test.questions) {
            question.question = await db.questions.findOne({_id: mongodb.ObjectId(question.questionID)})
        }
        res.json({
            status: true,
            test
        })
    }
    catch (err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})


router.post('/loadTests', requirePermission('read:db'), async (req, res) => {
    try {
        const {event} = req.body
        const userID = req.user.id
        let tests = await db.tests.find({event}).toArray()
        if (tests.length === 0) {
            res.json({status: false, message: "No tests found"})
        }
        else {
            for (let test of tests) {
                let submission = await db.testSubmissions.find({testID: test._id.toString(), userID}, {sort: {timestamp: -1}}).limit(1).toArray()
                submission = submission[0]
                if (submission) {
                    test.solved = true
                    test.solvedDate = submission.timestamp
                    test.solvedDaysAgo = Math.floor((new Date().getTime() - new Date(submission.timestamp).getTime()) / (1000 * 60 * 60 * 24))
                    if (test.solvedDaysAgo === 0) {
                        test.solvedDateMessage = "today"
                    }
                    else if (test.solvedDaysAgo === 1) {
                        test.solvedDateMessage = "yesterday"
                    }
                    else {
                        test.solvedDateMessage = test.solvedDaysAgo + " days ago"
                    }
                }
                else {
                    test.solved = false
                }
            }
            res.json({
                status: true,
                tests
            })
        }
    }
    catch (err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

//jwtAuthz(['read:db'])
router.post('/submitSolution', submitLimiter, requirePermission('read:db'), async (req, res) => {
    try {
        const {questionID, solution} = req.body
        const userID = req.user.id
        // Check in-memory MADTON store first, then DB
        const isMadton = madtonQuestions.has(questionID)
        let question
        if (isMadton) {
            question = madtonQuestions.get(questionID)
        } else {
            question = await db.questions.findOne({_id: new mongodb.ObjectId(questionID)})
        }
        if (!question) {
            return res.json({ status: false, message: 'Question not found or expired' })
        }

        const checkReport = checkSolution(question, solution)

        const submission = {
            timestamp: new Date(),
            questionID: isMadton ? null : questionID,
            source: isMadton ? 'madton' : 'question',
            userID,
            userSolution: solution,
            event: question.event,
            checkReport
        }
        if (!checkReport.continue) {
            await db.submissions.insertOne(submission)

            // Consume MADTON question so it can't be resubmitted
            if (isMadton) madtonQuestions.delete(questionID)

            // Update cached stats for regular questions only
            if (!isMadton) {
                try {
                    const result = await db.submissions.aggregate([
                        {$match: {questionID: questionID, "checkReport.correct": true}},
                        {$group: {_id: "$questionID", averageTime: {$avg: "$userSolution.time"}, standardDeviation: {$stdDevPop: "$userSolution.time"}}}
                    ]).toArray()
                    if (result.length > 0) {
                        await db.questions.updateOne({_id: new mongodb.ObjectId(questionID)}, {$set: {averageTime: result[0].averageTime, standardDeviation: result[0].standardDeviation}})
                    }
                } catch (aggErr) {
                    console.error(aggErr)
                }
            }
        }
    
        res.json({
            status: true,
            ...checkReport
        })

    } catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

// Editor preview — checks solution without saving anything
router.post('/mockSubmitSolution', async (req, res) => {
    try {
        const checkReport = checkSolution(req.body, req.body.solution)
        res.json({ status: true, ...checkReport })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

router.post('/addQuestion', requirePermission('add:db'), async (req, res) => {
    try {
        const question = req.body.question
        question.submittedBy = req.user.id
        question.createdAt = new Date()
        if (question.type === 'Cryptography' && !question.secret.plaintext) {
            res.json({
                status: false,
                message: "Plaintext error! Please report to Alex"
            })
            return
        }
        const result = await db.questions.insertOne(question)
        res.json({
            status: true,
            message: "Question successfully added to the database!",
            questionID: result.insertedId
        })
    } catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

// Update an existing question (manage:db)
router.post('/updateQuestion', requirePermission('manage:db'), async (req, res) => {
    try {
        const { questionID, question } = req.body
        if (!questionID) return res.json({ status: false, message: 'Question ID is required' })
        // Strip fields that shouldn't be overwritten
        delete question._id
        delete question.submittedBy
        delete question.createdAt
        delete question.checklist
        delete question.solution
        delete question.reply
        await db.questions.updateOne(
            { _id: new mongodb.ObjectId(questionID) },
            { $set: question }
        )
        res.json({ status: true, message: 'Question updated!' })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

// Delete a question (manage:db)
router.delete('/deleteQuestion/:id', requirePermission('manage:db'), async (req, res) => {
    try {
        await db.questions.deleteOne({ _id: new mongodb.ObjectId(req.params.id) })
        res.json({ status: true, message: 'Question deleted' })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

router.post('/addTest', requirePermission('add:db'), async (req, res) => {
    try {
        const test = req.body.test
        test.submittedBy = req.user.id
        test.createdAt = new Date()
        await db.tests.insertOne(test)
        res.json({
            status: true,
            message: "Test successfully added to the database!"
        })
    } catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

router.post('/submitTest', requirePermission('read:db'), async (req, res) => {
    try {
        const {testID, testSolutions} = req.body
        const userID = req.user.id
        let test = await db.tests.findOne({_id: new mongodb.ObjectId(testID)})
        let score = 0
        let reports = []
        for (let i = 0; i < test.questions.length; i++) {
            let q = await db.questions.findOne({_id: new mongodb.ObjectId(test.questions[i].questionID)})
            let checkReport = checkSolution(q, testSolutions[i])
            if (checkReport.correct) {
                score += test.questions[i].points
            }
            reports.push(checkReport)
        }

        // Save test submission
        await db.testSubmissions.insertOne({
            testID,
            userID,
            timestamp: new Date(),
            score,
            reports
        })

        res.json({
            status: true,
            score,
            reports
        })
    } catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})



router.get('/getEvents', async (req, res) => {
    try {
        const events = await db.events.find({}).toArray()
        res.json({ events })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

// Admin: add a new event
router.post('/addEvent', requireAdmin, async (req, res) => {
    try {
        const { name, topics } = req.body
        if (!name) return res.json({ status: false, message: 'Event name is required' })
        const existing = await db.events.findOne({ name })
        if (existing) return res.json({ status: false, message: 'Event already exists' })
        await db.events.insertOne({ name, topics: topics || [] })
        res.json({ status: true, message: 'Event added' })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

// Admin: update an event (rename or update topics)
router.patch('/updateEvent/:id', requireAdmin, async (req, res) => {
    try {
        const { name, topics } = req.body
        const update = {}
        if (name !== undefined) update.name = name
        if (topics !== undefined) update.topics = topics
        await db.events.updateOne({ _id: new mongodb.ObjectId(req.params.id) }, { $set: update })
        res.json({ status: true, message: 'Event updated' })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

// Admin: delete an event
router.delete('/deleteEvent/:id', requireAdmin, async (req, res) => {
    try {
        await db.events.deleteOne({ _id: new mongodb.ObjectId(req.params.id) })
        res.json({ status: true, message: 'Event deleted' })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})

// Helper: compute Monday 00:00 UTC of the week containing `date`
function startOfWeekUTC(date) {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    d.setUTCDate(d.getUTCDate() - diffToMonday)
    d.setUTCHours(0, 0, 0, 0)
    return d
}

// Helper: compute first day 00:00 UTC of the month containing `date`
function startOfMonthUTC(date) {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

// Helper: aggregate submissions into a sorted scores array
function aggregateScores(submissions) {
    const userMap = {}
    for (const sub of submissions) {
        if (!userMap[sub.userID]) {
            userMap[sub.userID] = { userID: sub.userID, solved: 0, score: 0, totalTime: 0 }
        }
        const u = userMap[sub.userID]
        u.solved++
        const solveTime = sub.userSolution?.time || 0
        u.totalTime += solveTime
        const speedBonus = solveTime > 0 ? Math.max(0, 500 - solveTime / 10) : 0
        u.score += 1000 + Math.round(speedBonus)
    }
    return Object.values(userMap).sort((a, b) => b.score - a.score)
}

// Leaderboard with weekly / monthly / all-time support and a "calendar" history
// of past period winners (for the tiny calendar avatars view).
router.post('/getRanking', requirePermission('read:db'), async (req, res) => {
    try {
        let { event, period, at } = req.body
        period = period === 'month' || period === 'all' ? period : 'week'

        // `at` lets the caller request the leaderboard for the period containing
        // a specific point in time (used by the past-period calendar tiles).
        const anchor = at ? new Date(at) : new Date()
        let periodStart = null
        let periodEnd = null
        if (period === 'week') {
            periodStart = startOfWeekUTC(anchor)
            periodEnd = new Date(periodStart)
            periodEnd.setUTCDate(periodStart.getUTCDate() + 7)
        } else if (period === 'month') {
            periodStart = startOfMonthUTC(anchor)
            periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1))
        }

        // MADTON submissions are stored with event "Codebusters"
        const eventFilter = event === 'Codebusters' ? { $in: ['Codebusters'] } : event

        // Current period submissions
        const currentMatch = {
            event: eventFilter,
            'checkReport.correct': true
        }
        if (periodStart) currentMatch.timestamp = { $gte: periodStart, $lt: periodEnd }
        const submissions = await db.submissions.find(currentMatch).toArray()
        let scores = aggregateScores(submissions)

        // Build a per-period history of winners (for the calendar view).
        // Always anchored to "now" so users can navigate to past periods.
        const now = new Date()
        const historyBuckets = []
        if (period === 'week') {
            const thisWeekStart = startOfWeekUTC(now)
            for (let i = 0; i < 12; i++) {
                const start = new Date(thisWeekStart)
                start.setUTCDate(thisWeekStart.getUTCDate() - 7 * i)
                const end = new Date(start)
                end.setUTCDate(start.getUTCDate() + 7)
                historyBuckets.push({ start, end })
            }
        } else if (period === 'month') {
            const thisMonthStart = startOfMonthUTC(now)
            for (let i = 0; i < 12; i++) {
                const start = new Date(Date.UTC(thisMonthStart.getUTCFullYear(), thisMonthStart.getUTCMonth() - i, 1))
                const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
                historyBuckets.push({ start, end })
            }
        }

        // Aggregate winners across all history buckets in a single query
        let history = []
        if (historyBuckets.length > 0) {
            const earliest = historyBuckets[historyBuckets.length - 1].start
            const latest = historyBuckets[0].end
            const histSubs = await db.submissions.find({
                event: eventFilter,
                'checkReport.correct': true,
                timestamp: { $gte: earliest, $lt: latest }
            }).toArray()

            history = historyBuckets.map(b => {
                const subs = histSubs.filter(s => {
                    const t = new Date(s.timestamp)
                    return t >= b.start && t < b.end
                })
                const ranked = aggregateScores(subs)
                return {
                    start: b.start.toISOString(),
                    end: b.end.toISOString(),
                    winner: ranked[0] || null
                }
            })
        }

        // Resolve user names + avatars for everyone we need (current + winners)
        const allIds = new Set(scores.map(s => s.userID))
        history.forEach(h => { if (h.winner) allIds.add(h.winner.userID) })
        const userIds = [...allIds]

        const users = await db.users.find(
            { _id: { $in: userIds.map(id => { try { return new mongodb.ObjectId(id) } catch(e) { return id } }) } },
            { projection: { name: 1, emails: 1, email: 1 } }
        ).toArray()
        const nameMap = {}
        const pictureMap = {}
        users.forEach(u => {
            const primary = primaryEmailOf(u)
            nameMap[u._id.toString()] = u.name || primary
            pictureMap[u._id.toString()] = gravatarUrl(primary, 64)
        })
        const decorate = s => {
            s.name = nameMap[s.userID] || s.userID
            s.picture = pictureMap[s.userID] || null
        }
        scores.forEach(decorate)
        history.forEach(h => { if (h.winner) decorate(h.winner) })

        res.json({
            status: true,
            users: scores,
            period,
            periodStart: periodStart ? periodStart.toISOString() : null,
            periodEnd: periodEnd ? periodEnd.toISOString() : null,
            // Backwards compat with old client expecting weekStart/weekEnd
            weekStart: periodStart ? periodStart.toISOString() : null,
            weekEnd: periodEnd ? periodEnd.toISOString() : null,
            history
        })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})


router.post('/getPerformance', requirePermission('read:db'), async (req, res) => {
    try {
        const userID = req.user.id

        const events = await db.events.find({}).toArray()
        const eventNames = events.map(e => e.name)

        const pipeline = [
            { $match: { userID, event: { $in: eventNames } } },
            {
                $group: {
                    _id: '$event',
                    totalAttempts: { $sum: 1 },
                    correctCount: {
                        $sum: { $cond: ['$checkReport.correct', 1, 0] }
                    },
                    avgTime: {
                        $avg: {
                            $cond: [
                                '$checkReport.correct',
                                '$userSolution.time',
                                null
                            ]
                        }
                    },
                    lastAttempt: { $max: '$timestamp' }
                }
            },
            { $sort: { correctCount: -1 } }
        ]

        const results = await db.submissions.aggregate(pipeline).toArray()

        const performance = results.map(r => ({
            event: r._id,
            totalAttempts: r.totalAttempts,
            correct: r.correctCount,
            accuracy: r.totalAttempts > 0 ? Math.round((r.correctCount / r.totalAttempts) * 100) : 0,
            avgTime: r.avgTime ? Math.round(r.avgTime) : null,
            lastAttempt: r.lastAttempt
        }))

        res.json({ status: true, performance })
    } catch (err) {
        console.error(err)
        res.json({ status: false, message: 'Unknown server error' })
    }
})

// Public profile — returns name, avatar, join date and performance stats for any user
router.get('/publicProfile/:userID', requirePermission('read:db'), async (req, res) => {
    try {
        const { userID } = req.params

        let targetUser
        try {
            targetUser = await db.users.findOne(
                { _id: new mongodb.ObjectId(userID) },
                { projection: { name: 1, emails: 1, email: 1, createdAt: 1 } }
            )
        } catch (e) {
            return res.json({ status: false, message: 'User not found' })
        }

        if (!targetUser) {
            return res.json({ status: false, message: 'User not found' })
        }

        const events = await db.events.find({}).toArray()
        const eventNames = events.map(e => e.name)

        const pipeline = [
            { $match: { userID, event: { $in: eventNames } } },
            {
                $group: {
                    _id: '$event',
                    totalAttempts: { $sum: 1 },
                    correctCount: { $sum: { $cond: ['$checkReport.correct', 1, 0] } },
                    avgTime: {
                        $avg: { $cond: ['$checkReport.correct', '$userSolution.time', null] }
                    }
                }
            },
            { $sort: { correctCount: -1 } }
        ]

        const results = await db.submissions.aggregate(pipeline).toArray()
        const performance = results.map(r => ({
            event: r._id,
            totalAttempts: r.totalAttempts,
            correct: r.correctCount,
            accuracy: r.totalAttempts > 0 ? Math.round((r.correctCount / r.totalAttempts) * 100) : 0,
            avgTime: r.avgTime ? Math.round(r.avgTime) : null
        }))

        res.json({
            status: true,
            user: {
                name: targetUser.name,
                picture: gravatarUrl(primaryEmailOf(targetUser), 128),
                createdAt: targetUser.createdAt || null
            },
            performance
        })
    } catch (err) {
        console.error(err)
        res.json({ status: false, message: 'Unknown server error' })
    }
})

router.post('/MADTON', requirePermission('read:db'), async (req, res) => {
    try {
        const { topic } = req.body
        const quotes = await axios.get("https://type.fit/api/quotes")
        let quote = quotes.data[Math.floor(Math.random() * quotes.data.length)]
        let ciphertext = ''
        let plaintext = ''
        switch(topic) {
            case 'aristocrat':
                plaintext = quote.text.toUpperCase()
                ciphertext = generateAristocrat(plaintext)
                break
            case 'patristocrat':
                plaintext = quote.text.toUpperCase()
                ciphertext = generatePatristocrat(plaintext)
                break
            case 'xenocrypt':
                const spanishQuote = await fetchSpanishQuote()
                plaintext = normalizeSpanish(spanishQuote.text)
                ciphertext = generateAristocrat(plaintext)
                quote = spanishQuote
                break
            default:
                plaintext = quote.text.toUpperCase()
                ciphertext = generateAristocrat(plaintext)
                break
        }

        // Store in memory — secret never sent to client
        const question = {
            prompt: `Solve this quote by ${quote.author}`,
            ciphertext,
            secret: { plaintext },
            type: "Cryptography",
            timed: true,
            event: 'Codebusters',
            topic
        }
        const madtonId = storeMadtonQuestion(question)

        res.json({
            status: true,
            question: {
                _id: madtonId,
                prompt: question.prompt,
                ciphertext: question.ciphertext,
                type: question.type,
                timed: question.timed,
                event: question.event,
                topic: question.topic
            }
        })
    }
    catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

router.post('/encrypt', requirePermission('read:db'), async (req, res) => {
    try {
        let { topic, plaintext } = req.body
        let ciphertext = ''
        switch(topic) {
            case 'aristocrats':
            case 'timed aristocrats':
                ciphertext = generateAristocrat(plaintext.toUpperCase())
                break
            case 'patristocrats':
                ciphertext = generatePatristocrat(plaintext.toUpperCase())
                plaintext = plaintext.replace(/[^A-Z]/g, '')
                for (let i = 5; i < plaintext.length; i+=6) {
                    plaintext = plaintext.slice(0, i) + ' ' + plaintext.slice(i)
                }
                break
            case 'xenocrypt':
                plaintext = normalizeSpanish(plaintext)
                ciphertext = generateAristocrat(plaintext)
                break
            default:
                res.json({
                    status: false,
                    message: "Unsupported topic"
                })
                return
        }
        res.json({
            status: true,
            ciphertext,
            plaintext
        })
    }
    catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})



module.exports = { router, setUp }

async function fetchSpanishQuote() {
    const res = await axios.get("https://quotes-api-three.vercel.app/api/randomquote?language=es")
    return { text: res.data.quote, author: res.data.author }
}

function normalizeSpanish(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z ]/gi, '').toUpperCase()
}

function generatePatristocrat(plaintext) {
    const aristocrat = generateAristocrat(plaintext)
    let ciphertext = aristocrat.replace(/[^A-Z]/g, '')
    for (let i = 5; i < ciphertext.length; i+=6) {
        ciphertext = ciphertext.slice(0, i) + ' ' + ciphertext.slice(i)
    }
    return ciphertext
}

function generateAristocrat(plaintext) {
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    let randomAlphabet = shuffle([...alphabet])
    while (alphabet.findIndex((l, i) => l === randomAlphabet[i]) >= 0) {
        randomAlphabet = shuffle(randomAlphabet)
    }

    let ciphertext = plaintext.split('').map(l => {
        if (alphabet.indexOf(l) >= 0) {
            let index = alphabet.findIndex(a => a === l)
            return randomAlphabet[index]
        }
        else {
            return l
        }
    }).join('')
    return ciphertext
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }

function checkSolution(question, solution) {
    let correct
    switch(question.type) {
        case 'MultipleChoice':
            correct = question.secret.correctOptions.includes(solution.answer)
            return {
                continue: false,
                correct,
                message: correct ? solution.time ? `Correct! Solved in ${Math.floor(solution.time / 600)} minutes ${Math.round(solution.time % 600 / 10)} seconds` : 'Correct!' : "Incorrect",
                correctAnswer: question.secret.correctOptions.map(i => question.options[i]).join(', ')
            }

        case 'Cryptography':
            let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            let key = question.secret.plaintext.split('').filter(letter => alphabet.includes(letter)).join('')
            
            //determine amount of collisions between key and solution
            let mistakes = 0
            if (solution.text) {
                for (let i = 0; i < key.length; i++) {
                    if (key[i] != solution.text[i]) {
                        mistakes++
                    }
                }
            }
            else
                mistakes = key.length

            let message = " "
            let continueQuestion = false
            correct = false
            const s = Math.floor(solution.time / 10 % 60)
            const m = Math.floor(solution.time / 600)

            if (question.timed) {
                continueQuestion = mistakes > 2
            }
            else {
                continueQuestion = false
            }
            
            if (mistakes === 0) {
                message = solution.time ? "No mistakes! Solved in " + m + " minutes " + s + " seconds" : 'No mistakes!'
                correct = true
            }
            else if (mistakes === 1) {
                message = "There is one mistake!"
                correct = false
            }
            else if (mistakes < 3) {
                message = "There are " + mistakes + " mistakes!"
                correct = true
            }
            else {
                message = "There are more than 2 mistakes!"
                correct = false
            }
            
            return {
                mistakes,
                correct,
                continue: continueQuestion,
                message,
                correctAnswer: question.secret.plaintext
            }
        
        case 'Field':
            correct = question.secret.correctAnswers.findIndex(v => v.toLowerCase() === solution.answer.toLowerCase()) >= 0
            return {
                continue: false,
                correct,
                message: correct ? solution.time ? `Correct! Solved in ${Math.floor(solution.time / 600)} minutes ${Math.round(solution.time % 600 / 10)} seconds` : 'Correct!' : "Incorrect",
                correctAnswer: question.secret.correctAnswers.join(', ')
            }

    }
    return false
}
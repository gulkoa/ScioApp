const express = require('express')
const mongodb = require('mongodb')
const crypto = require('crypto')
const axios = require('axios')
const { requirePermission } = require('../../middleware/auth')

function gravatarUrl(email, size) {
    const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex')
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size || 64}`
}
let client = null
let db = {}
function setUp(DBclient) {
    client = DBclient
    db.questions = client.db('questions').collection('questions0')
    db.submissions = client.db('submissions').collection('submissions0')
    db.users = client.db('users').collection('users')
    db.ranking = client.db('users').collection('ranking')
    db.tests = client.db('tests').collection('tests')
    db.testSubmissions = client.db('tests').collection('submissions')
}

const router = express.Router()
//jwtAuthz(['read:db'])
router.post('/loadFeed', requirePermission('read:db'), async (req, res) => {
    try {
        const {event, topicsNames, userID} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
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
        const {event, topicsNames, userID} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
        let questions = await db.questions.find({event, topic: {$in: topicsNames}, showInLibrary: true}).toArray()
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
        const {questionID, userID} = req.body


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

        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
        const question = await db.questions.findOne({_id: mongodb.ObjectId(questionID)})
        if (!question) {
            res.json({status: false, message: "Question not found"})
        }
        else {
            delete question.secret
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
        const {testID, userID} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
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
        const {event, userID} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
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
router.post('/submitSolution', requirePermission('read:db'), async (req, res) => {
    try {
        const {questionID, userID, solution} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
        let question = await db.questions.findOne({_id: new mongodb.ObjectId(questionID)})

        const checkReport = checkSolution(question, solution)

        //save score
        if (checkReport.correct) {
            let oldSubmission = await db.submissions.findOne({questionID: questionID, userID})
            if (!oldSubmission) {
                const timeZScore = question.standardDeviation && question.standardDeviation !== 0 ? (solution.time - question.averageTime) / question.standardDeviation : -0.5
                const score = timeZScore < 0 ? (-timeZScore/2 + 1) * 1000 : 1000
                const date = new Date()
                await db.ranking.updateOne({userID, event: question.event}, {$inc: {score: score}, $set: {lastUpdated: date}}, {upsert: true})
            }
        }
    
            const submission = {
            timestamp: Date.now(),
            questionID,
            userID,
            userSolution: solution,
            questionType: question.type,
            event: question.event,
            checkReport
        }
        if (!checkReport.continue) {
            await db.submissions.insertOne(submission)

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

router.post('/mockSubmitSolution', async (req, res) => {
    try {
        let question = req.body
        const solution = req.body.solution
        const userID = req.body.userID
        const checkReport = checkSolution(question, solution)

        // Save MADTON submissions so they count on the leaderboard
        if (!checkReport.continue && userID && question.event) {
            await db.submissions.insertOne({
                timestamp: Date.now(),
                questionID: 'madton',
                userID,
                userSolution: solution,
                questionType: question.type,
                event: question.event,
                checkReport
            })
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

router.post('/addQuestion', requirePermission('add:db'), async (req, res) => {
    try {
        const question = req.body.question
        question.submittedBy = req.body.userID
        question.submittedTimeStamp = Date.now()
        if (question.type === 'Cryptography' && !question.secret.plaintext) {
            res.json({
                status: false,
                message: "Plaintext error! Please report to Alex"
            })
            return
        }
        await db.questions.insertOne(question)
        res.json({
            status: true,
            message: "Question successfully added to the database!"
        })
    } catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

router.post('/addTest', requirePermission('add:db'), async (req, res) => {
    try {
        const test = req.body.test
        test.submittedBy = req.body.userID
        test.submittedTimeStamp = Date.now()
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
        const {testID, userID, testSolutions} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
                })
                return
        }
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
        let events = require('../../events.json')
        res.json({
            events
        })
    } catch(err) {
        console.error(err)
        res.json({
            status: false,
            message: "Unknown server error"
        })
    }
})

// Weekly leaderboard — scores users by correct submissions this week (Mon–Sun)
// Faster solves score higher. MADTON submissions count under Codebusters.
router.post('/getRanking', requirePermission('read:db'), async (req, res) => {
    try {
        let { event } = req.body

        // Calculate current week boundaries (Monday 00:00 to Sunday 23:59)
        const now = new Date()
        const day = now.getUTCDay() // 0=Sun, 1=Mon...
        const diffToMonday = day === 0 ? 6 : day - 1
        const monday = new Date(now)
        monday.setUTCDate(now.getUTCDate() - diffToMonday)
        monday.setUTCHours(0, 0, 0, 0)
        const sunday = new Date(monday)
        sunday.setUTCDate(monday.getUTCDate() + 7)

        // MADTON submissions are stored with event "Codebusters"
        const eventFilter = event === 'Codebusters' ? { $in: ['Codebusters'] } : event

        // Get all correct submissions this week for the event
        const submissions = await db.submissions.find({
            event: eventFilter,
            'checkReport.correct': true,
            timestamp: { $gte: monday.getTime(), $lt: sunday.getTime() }
        }).toArray()

        // Build scores per user — each correct answer = 1000 pts + speed bonus
        const userMap = {}
        for (const sub of submissions) {
            if (!userMap[sub.userID]) {
                userMap[sub.userID] = { userID: sub.userID, solved: 0, score: 0, totalTime: 0 }
            }
            const u = userMap[sub.userID]
            u.solved++
            const solveTime = sub.userSolution?.time || 0
            u.totalTime += solveTime
            // Base 1000 pts per solve + speed bonus (faster = higher)
            const speedBonus = solveTime > 0 ? Math.max(0, 500 - solveTime / 10) : 0
            u.score += 1000 + Math.round(speedBonus)
        }

        let scores = Object.values(userMap)

        // Resolve user names from DB
        const userIds = scores.map(s => s.userID)
        const users = await db.users.find(
            { _id: { $in: userIds.map(id => { try { return new mongodb.ObjectId(id) } catch(e) { return id } }) } },
            { projection: { name: 1, email: 1 } }
        ).toArray()
        const nameMap = {}
        const pictureMap = {}
        users.forEach(u => {
            nameMap[u._id.toString()] = u.name || u.email
            pictureMap[u._id.toString()] = gravatarUrl(u.email, 64)
        })

        scores.forEach(s => {
            s.name = nameMap[s.userID] || s.userID
            s.picture = pictureMap[s.userID] || null
        })
        scores.sort((a, b) => b.score - a.score)

        res.json({
            status: true,
            users: scores,
            weekStart: monday.toISOString(),
            weekEnd: sunday.toISOString()
        })
    } catch(err) {
        console.error(err)
        res.json({ status: false, message: "Unknown server error" })
    }
})


router.post('/getPerformance', requirePermission('read:db'), async (req, res) => {
    try {
        const { userID } = req.body
        if (!userID) {
            return res.json({ status: false, message: 'UserID is missing in request' })
        }

        const events = require('../../events.json')
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

router.post('/MADTON', requirePermission('read:db'), async (req, res) => {
    try {
        const { userID, topic } = req.body
        const quotes = await axios.get("https://type.fit/api/quotes")
        let quote = quotes.data[Math.floor(Math.random() * quotes.data.length)]
        let ciphertext = ''
        let plaintext = ''
        let question
        switch(topic) {
            case 'aristocrat':
                plaintext = quote.text.toUpperCase()
                ciphertext = generateAristocrat(plaintext)
                break
            case 'patristocrat':
                plaintext = quote.text.toUpperCase()
                ciphertext = generatePatristocrat(plaintext)
                break
            case 'xenocrypt': {
                const spanishQuote = await fetchSpanishQuote()
                plaintext = normalizeSpanish(spanishQuote.text)
                ciphertext = generateAristocrat(plaintext)
                quote = spanishQuote
                break
            }
            case 'vigenere': {
                plaintext = quote.text.toUpperCase()
                const keyLength = 3 + Math.floor(Math.random() * 4) // 3-6 letter key
                const key = generateRandomKey(keyLength)
                ciphertext = generateVigenere(plaintext, key)
                question = {
                    prompt: `Solve this Vigenère cipher (key: ${key}) — quote by ${quote.author}`,
                    ciphertext,
                    secret: { plaintext },
                    type: "Cryptography",
                    timed: true,
                    event: 'Codebusters',
                    topic
                }
                break
            }
            case 'hill': {
                plaintext = quote.text.toUpperCase()
                const hillResult = generateHill(plaintext)
                // Format ciphertext in 5-letter groups for readability
                let hillCipher = hillResult.ciphertext
                let formattedCipher = ''
                for (let i = 0; i < hillCipher.length; i++) {
                    formattedCipher += hillCipher[i]
                    if ((i + 1) % 5 === 0 && i < hillCipher.length - 1) formattedCipher += ' '
                }
                const km = hillResult.keyMatrix
                question = {
                    prompt: `Solve this Hill 2×2 cipher (key matrix: [${km[0][0]},${km[0][1]}; ${km[1][0]},${km[1][1]}]) — quote by ${quote.author}`,
                    ciphertext: formattedCipher,
                    secret: { plaintext: hillResult.plaintext },
                    type: "Cryptography",
                    timed: true,
                    event: 'Codebusters',
                    topic,
                    frequencyTableType: 'None'
                }
                break
            }
            case 'railfence': {
                plaintext = quote.text.toUpperCase()
                const rails = 2 + Math.floor(Math.random() * 3) // 2-4 rails
                const strippedPlain = plaintext.replace(/[^A-Z]/g, '')
                ciphertext = generateRailFence(plaintext, rails)
                question = {
                    prompt: `Solve this Rail Fence cipher (${rails} rails) — quote by ${quote.author}. Enter the plaintext (letters only, no spaces).`,
                    secret: { correctAnswers: [strippedPlain] },
                    type: "Field",
                    timed: true,
                    event: 'Codebusters',
                    topic,
                    content: `<p class="h5 text-center font-monospace">${ciphertext}</p>`
                }
                break
            }
            case 'morbit': {
                plaintext = quote.text.toUpperCase()
                const morbitResult = generateMorbit(plaintext)
                // Format morbit key for display
                const morbitKeyStr = Object.entries(morbitResult.morbitKey)
                    .sort((a, b) => a[0] - b[0])
                    .map(([d, p]) => `${d}=${p.replace(/x/g, 'X')}`)
                    .join(' ')
                const strippedPlainMorbit = plaintext.replace(/[^A-Z]/g, '')
                question = {
                    prompt: `Solve this Morbit cipher (key: ${morbitKeyStr}) — quote by ${quote.author}. Enter the plaintext (letters only, no spaces).`,
                    secret: { correctAnswers: [strippedPlainMorbit] },
                    type: "Field",
                    timed: true,
                    event: 'Codebusters',
                    topic,
                    content: `<p class="h5 text-center font-monospace">${morbitResult.ciphertext}</p>`
                }
                break
            }
            case 'pollux': {
                plaintext = quote.text.toUpperCase()
                const polluxResult = generatePollux(plaintext)
                // Format pollux key for display
                const polluxKeyStr = Object.entries(polluxResult.polluxKey)
                    .sort((a, b) => a[0] - b[0])
                    .map(([d, s]) => `${d}=${s === '.' ? '·' : s === '-' ? '−' : 'X'}`)
                    .join(' ')
                const strippedPlainPollux = plaintext.replace(/[^A-Z]/g, '')
                question = {
                    prompt: `Solve this Pollux cipher (key: ${polluxKeyStr}) — quote by ${quote.author}. Enter the plaintext (letters only, no spaces).`,
                    secret: { correctAnswers: [strippedPlainPollux] },
                    type: "Field",
                    timed: true,
                    event: 'Codebusters',
                    topic,
                    content: `<p class="h5 text-center font-monospace">${polluxResult.ciphertext}</p>`
                }
                break
            }
            default:
                plaintext = quote.text.toUpperCase()
                ciphertext = generateAristocrat(plaintext)
                break
        }

        if (!question) {
            question = {
                prompt: `Solve this quote by ${quote.author}`,
                ciphertext,
                secret: { plaintext },
                type: "Cryptography",
                timed: true,
                event: 'Codebusters',
                topic
            }
        }
        res.json({
            status: true,
            question
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
        let { userID, topic, plaintext } = req.body
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

function generateVigenere(plaintext, key) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let ciphertext = ''
    let keyIndex = 0
    for (let i = 0; i < plaintext.length; i++) {
        const charIndex = alphabet.indexOf(plaintext[i])
        if (charIndex >= 0) {
            const keyChar = alphabet.indexOf(key[keyIndex % key.length])
            ciphertext += alphabet[(charIndex + keyChar) % 26]
            keyIndex++
        } else {
            ciphertext += plaintext[i]
        }
    }
    return ciphertext
}

function generateRandomKey(length) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let key = ''
    for (let i = 0; i < length; i++) {
        key += alphabet[Math.floor(Math.random() * 26)]
    }
    return key
}

function generateRailFence(plaintext, rails) {
    const stripped = plaintext.replace(/[^A-Z]/g, '')
    const fence = Array.from({ length: rails }, () => [])
    let rail = 0
    let direction = 1
    for (let i = 0; i < stripped.length; i++) {
        fence[rail].push(stripped[i])
        if (rail === 0) direction = 1
        else if (rail === rails - 1) direction = -1
        rail += direction
    }
    return fence.map(r => r.join('')).join('')
}

function generateMorbit(plaintext) {
    const morseMap = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
        'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
        'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
        'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..', ' ': 'x'
    }
    // Convert plaintext to morse with 'x' between letters and 'xx' between words
    let morse = ''
    const words = plaintext.split(' ')
    for (let w = 0; w < words.length; w++) {
        if (w > 0) morse += 'x'
        for (let l = 0; l < words[w].length; l++) {
            if (l > 0) morse += 'x'
            const ch = words[w][l]
            if (morseMap[ch]) morse += morseMap[ch]
        }
    }
    // Pad morse to even length
    if (morse.length % 2 !== 0) morse += 'x'
    // Create morbit key: random assignment of digits 1-9 to the 9 possible pairs
    const pairs = ['..', '.-', '.x', '-.', '--', '-x', 'x.', 'x-', 'xx']
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const pairToDigit = {}
    const morbitKey = {}
    for (let i = 0; i < pairs.length; i++) {
        pairToDigit[pairs[i]] = digits[i]
        morbitKey[digits[i]] = pairs[i]
    }
    // Encode morse pairs to digits
    let ciphertext = ''
    for (let i = 0; i < morse.length; i += 2) {
        ciphertext += pairToDigit[morse.substring(i, i + 2)]
    }
    return { ciphertext, morbitKey }
}

function generatePollux(plaintext) {
    const morseMap = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
        'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
        'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
        'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..', ' ': 'x'
    }
    // Convert to morse with x separators
    let morse = ''
    const words = plaintext.split(' ')
    for (let w = 0; w < words.length; w++) {
        if (w > 0) morse += 'x'
        for (let l = 0; l < words[w].length; l++) {
            if (l > 0) morse += 'x'
            const ch = words[w][l]
            if (morseMap[ch]) morse += morseMap[ch]
        }
    }
    // Assign digits 0-9 randomly to dot, dash, or x (at least one digit per symbol)
    const digits = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    const polluxKey = {}
    // Ensure at least one digit for each symbol type
    polluxKey[digits[0]] = '.'
    polluxKey[digits[1]] = '-'
    polluxKey[digits[2]] = 'x'
    // Randomly assign remaining digits
    const symbols = ['.', '-', 'x']
    for (let i = 3; i < 10; i++) {
        polluxKey[digits[i]] = symbols[Math.floor(Math.random() * 3)]
    }
    // Build reverse map: symbol -> array of possible digits
    const symbolToDigits = { '.': [], '-': [], 'x': [] }
    for (const [digit, sym] of Object.entries(polluxKey)) {
        symbolToDigits[sym].push(digit)
    }
    // Encode morse to digits using random selection from available digits
    let ciphertext = ''
    for (const ch of morse) {
        const options = symbolToDigits[ch]
        ciphertext += options[Math.floor(Math.random() * options.length)]
    }
    return { ciphertext, polluxKey }
}

function generateHill(plaintext) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const stripped = plaintext.replace(/[^A-Z]/g, '')
    // Pad to even length
    let padded = stripped
    if (padded.length % 2 !== 0) padded += 'X'
    // Generate a 2x2 key matrix with a valid inverse mod 26
    let keyMatrix, det
    do {
        keyMatrix = [
            [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)],
            [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)]
        ]
        det = ((keyMatrix[0][0] * keyMatrix[1][1] - keyMatrix[0][1] * keyMatrix[1][0]) % 26 + 26) % 26
    } while (det === 0 || gcd(det, 26) !== 1)
    // Encrypt pairs
    let ciphertext = ''
    for (let i = 0; i < padded.length; i += 2) {
        const p1 = alphabet.indexOf(padded[i])
        const p2 = alphabet.indexOf(padded[i + 1])
        const c1 = (keyMatrix[0][0] * p1 + keyMatrix[0][1] * p2) % 26
        const c2 = (keyMatrix[1][0] * p1 + keyMatrix[1][1] * p2) % 26
        ciphertext += alphabet[c1] + alphabet[c2]
    }
    return { ciphertext, keyMatrix, plaintext: padded }
}

function gcd(a, b) {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b) {
        [a, b] = [b, a % b]
    }
    return a
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
const express = require('express')
const mongodb = require('mongodb')
const jwtAuthz = require('express-jwt-authz')
let client = null
let db = {}
function setUp(DBclient) {
    client = DBclient
    db.questions = client.db('questions').collection('questions0')
    db.submissions = client.db('submissions').collection('submissions0')
    db.users = client.db('users').collection('users')
}

const router = express.Router()

router.post('/loadFeed', jwtAuthz(['read:db']), async (req, res) => {
    try {
        const {event, topicsNames, userID} = req.body
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
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
        const questions = await db.questions.find({event, topic: {$in: topicsNames}, showInFeed: true}).toArray()
        if (questions.length == 0) {
            res.json({status: false, message: "No questions found"})
            return
        }
        //console.log(questions.length, Math.floor(Math.random() * questions.length))
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

router.post('/loadLibrary', jwtAuthz(['read:db']), async (req, res) => {
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
        // console.log(questions.length)
        if (questions.length == 0) {
            res.json({status: false, message: "No questions found"})
        }
        else {
            for (let question of questions) {
                let submission = await db.submissions.find({questionID: question._id.toString(), userID}, {sort: {timestamp: -1}}).limit(1).toArray()
                submission = submission[0]
                // console.log(submission)
                if (submission) {
                    question.solved = true
                    question.solvedDate = submission.timestamp
                    question.solvedDaysAgo = new Date().getDate() - new Date(submission.timestamp).getDate()
                    if (question.solvedDaysAgo == 0) {
                        question.solvedDateMessage = "today"
                    }
                    else if (question.solvedDaysAgo == 1) {
                        question.solvedDateMessage = "yesterday"
                    }
                    else {
                        question.solvedDateMessage = question.solvedDaysAgo + " days ago"
                    }
                }
                else {
                    question.solved = false
                }
                const submissions = await db.submissions.find({questionID: question._id.toString(), "checkReport.correct": true}).toArray()
                if (submissions && submissions.length > 0)
                    question.averageTime = submissions.reduce((summ, sub) => summ + sub.userSolution.time, 0) / submissions.length
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

router.post('/loadQuestion', jwtAuthz(['read:db']), async (req, res) => {
    try {
        const {questionID, userID} = req.body


        if (questionID == 'aurora1445') {
            console.log('test question requested')
            res.send({
                question: {"_id":{"$oid":"61a05902d63cbf8eddaf3ed7"},"prompt":"evaluate (A and B) or (A xor B) if A = 1 and B = 0","type":"MultipleChoice","options":["1","0","neither"],"secret":{"correctOptions":[{"$numberInt":"0"}]},"topic":"binary algebra","event":"Cybersecurity","showInFeed":true,"showInLibrary":true}
            })
        }

        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
        const question = await db.questions.findOne({_id: mongodb.ObjectId(questionID)})
        // console.log(questions.length)
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



router.post('/submitSolution', jwtAuthz(['read:db']), async (req, res) => {
    try {
        const {questionID, userID, solution} = req.body
        console.debug(req.body)
        if (!userID) {
            res.send({
                status: false,
                message: "UserID is missing in request"
            })
            return
        }
        let question = await db.questions.findOne({_id: new mongodb.ObjectId(questionID)})

        const checkReport = checkSolution(question, solution)
        // console.log(solution, checkReport)
    
        //post submision to db
        const submission = {
            timestamp: Date.now(),
            questionID,
            userID,
            userSolution: solution,
            questionType: question.type,
            event: question.event,
            checkReport
        }
        if (!checkReport.continue)
            await db.submissions.insertOne(submission)
    
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
        const checkReport = checkSolution(question, solution)
        // console.log(solution, checkReport, question)

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

router.post('/addQuestion', jwtAuthz(['add:db']), async (req, res) => {
    try {
        const question = req.body.question
        question.submittedBy = req.body.userID
        question.submittedTimeStamp = Date.now()
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


module.exports = { router, setUp }


function checkSolution(question, solution) {
    let correct
    switch(question.type) {
        case 'MultipleChoice':
            //console.debug(question.secret.correctOptionIndex, solution)
            correct = question.secret.correctOptions.includes(solution.answer)
            return {
                continue: false,
                correct,
                message: correct ? solution.time ? `Correct! Solved in ${Math.floor(solution.time / 600)} minutes ${Math.round(solution.time % 600 / 10)} seconds` : 'Correct!' : "Incorrect" + " (Correct answer: " + question.secret.correctOptions.map(i => question.options[i]) + ")"
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

            console.debug(key)
            console.debug(solution)
            console.debug(key.text == solution)
            console.debug(mistakes)

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
            
            if (mistakes == 0) {
                message = solution.time ? "No mistakes! Solved in " + m + " minutes " + s + " seconds" : 'No mistakes!'
                correct = true
            }
            else if (mistakes == 1) {
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
                message
            }

    }
    return false
}

// async function parseUser(userID) {
//     const user = await db.users.findOne({auth0ID: userID})
//     if (user) {
//         return user
//     }
//     else {
//         await db.users.insertOne({
//             auth0ID: userID,
//         })
//     }
// }
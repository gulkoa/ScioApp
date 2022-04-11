const express = require('express')
const mongodb = require('mongodb')
var client = null
var db = {}
function setUp(DBclient) {
    client = DBclient
    db.questions = client.db('questions').collection('questions0')
    db.submissions = client.db('submissions').collection('submissions0')
    db.users = client.db('users').collection('users')
}

const router = express.Router()

router.post('/loadFeed', async (req, res) => {
    const {event, topicsNames, userID} = req.body
    const questions = await db.questions.find({event, topic: {$in: topicsNames}, showInFeed: true}).toArray()
    if (questions.length == 0) {
        res.json({status: false, message: "No questions found"})
    }
    else {
        //console.log(questions.length, Math.floor(Math.random() * questions.length))
        const question = questions[Math.floor(Math.random() * questions.length)]
        delete question.question
        res.json({
            status: true,
            question
        })
    }
})

router.post('/loadLibrary', async (req, res) => {
    const {event, topicsNames, userID} = req.body
    const questions = await db.questions.find({event, topic: {$in: topicsNames}, showInLibrary: true}).toArray()
    // console.log(questions.length)
    if (questions.length == 0) {
        res.json({status: false, message: "No questions found"})
    }
    else {
        questions.forEach(question => { delete question.secret })
        res.json({
            status: true,
            questions
        })
    }
})

router.post('/loadQuestion', async (req, res) => {
    const {questionID, userID} = req.body
    const question = await db.questions.findOne({_id: mongodb.ObjectId(questionID)})
    // console.log(questions.length)
    if (!question) {
        res.json({status: false, message: "Question not found"})
    }
    else {
        res.json({
            status: true,
            question
        })
    }
})



router.post('/submitSolution', async (req, res) => {
    try {
        let question = await db.questions.findOne({_id: new mongodb.ObjectId(req.body.questionID)})

        const solution = req.body.solution
        const checkReport = checkSolution(question, solution)
        // console.log(solution, checkReport)
    
        //post submision to db
        const submission = {
            timestamp: Date.now(),
            questionID: req.body.questionID,
            userID: req.body.userID,
            userSolution: solution,
            questionType: question.type,
            eventName: question.eventName,
            checkReport
        }
        // if (!checkReport.continue)
        //     await db.submissions.insertOne(submission)
    
        res.json({
            status: true,
            ...checkReport
        })

    } catch(err) {
        console.error(err)
        res.json({
            status: false
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
            status: false
        })
    }
})

router.post('/addQuestion', async (req, res) => {
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
            status: false
        })
    }
})

router.get('/getEvents', async (req, res) => {
    let events = require('../../events.json')
    res.json({
        events
    })
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
                if (mistakes == 0) {
                    message = solution.time ? "No mistakes! Solved in " + m + " minutes " + s + " seconds" : 'No mistakes!'
                    correct = true
                    continueQuestion = false
                }
                else {
                    message = "There are some mistakes!"
                    correct = false
                    continueQuestion = true
                }
            }
            else {
                continueQuestion = false
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

async function parseUser(userID) {
    const user = await db.users.findOne({auth0ID: userID})
    if (user) {
        return user
    }
    else {
        await db.users.insertOne({
            auth0ID: userID,
        })
    }
}
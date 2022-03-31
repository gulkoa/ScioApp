const express = require('express')
const mongodb = require('mongodb')
var client = null
var db = {}
function setUp(DBclient) {
    client = DBclient
    db.questions = client.db('questions').collection('questions0')
    db.submissions = client.db('submissions').collection('submissions0')
}

const router = express.Router()

router.post('/loadQuestion', async (req, res) => {
    const {eventName, topicsNames, userID} = req.body
    const questions = await db.questions.find({eventName, topic: {$in: topicsNames}}).toArray()
    if (questions.length == 0) {
        res.json({status: false, message: "No questions found"})
    }
    else {
        //console.log(questions.length, Math.floor(Math.random() * questions.length))
        const question = questions[Math.floor(Math.random() * questions.length)]
        question['secret'] = -1
        res.json({
            status: true,
            question
        })
    }
})


router.post('/submitSolution', async (req, res) => {
    let question
    try {
        question = await db.questions.findOne({_id: new mongodb.ObjectId(req.body.questionID)})

        const solution = req.body.solution
        const checkReport = checkSolution(question, solution)
        //console.log(solution, checkReport)
    
        //post submision to db
        const submission = {
            questionID: req.body.questionID,
            userID: req.body.userID,
            userSolution: solution,
            questionType: question.type,
            eventName: question.eventName,
            checkReport
        }
        await db.submissions.insertOne(submission)
    
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

router.get('/getEvents', async (req, res) => {
    let events = require('../../events.json')
    res.json({
        events
    })
})


module.exports = { router, setUp }


function checkSolution(question, solution) {
    switch(question.type) {
        case 'MultipleChoice':
            //console.debug(question.secret.correctOptionIndex, solution)
            return {
                correct: question.secret.correctOptionIndex == solution,
                message: question.secret.correctOptionIndex == solution ? "Correct" : "Incorrect" + " (Correct answer: " + question.options[question.secret.correctOptionIndex] + ")"
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

            console.debug(key)
            console.debug(solution)
            console.debug(key == solution)
            console.debug(mistakes)

            let message = " "
            let continueQuestion = false
            let correct = false

            if (question.timed) {
                if (mistakes == 0) {
                    const s = Math.floor(solution.time / 10 % 60)
                    const m = Math.floor(solution.time / 600)
                    message = "No mistakes! Solved in " + m + " minutes " + s + " seconds"
                    correct = true
                    continueQuestion = false
                }
                else {
                    message = "There are some mistakes!"
                    continueQuestion = true
                    correct = false
                }
            }
            else {
                continueQuestion = false
                if (mistakes == 0) {
                    message = "No mistakes! Solved!"
                    correct = true
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
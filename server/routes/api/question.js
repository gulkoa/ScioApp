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
    db.ranking = client.db('users').collection('ranking')
    db.tests = client.db('tests').collection('tests')
}

const router = express.Router()
//jwtAuthz(['read:db'])
router.post('/loadFeed', async (req, res) => {
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
//jwtAuthz(['read:db'])
router.post('/loadLibrary', async (req, res) => {
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
                    question.solvedDaysAgo = Math.floor((new Date().getTime() - new Date(submission.timestamp).getTime()) / (1000 * 60 * 60 * 24))
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
                delete question.secret


                // await db.submissions.aggregate([
                //     {$match: {questionID: question._id.toString(), "checkReport.correct": true}},
                //     {$group: {_id: "$questionID", averageTime: {$avg: "$userSolution.time"}, standardDeviation: {$stdDevPop: "$userSolution.time"}}}
                // ]).toArray((err, result) => {
                //     if (err) {
                //         console.error(err)
                //     }
                //     else {
                //         if (result.length > 0) {
                //             db.questions.updateOne({_id: question._id}, {$set: {averageTime: result[0].averageTime, standardDeviation: result[0].standardDeviation}})
                //         }
                //     }
                // })




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
router.post('/loadQuestion', async (req, res) => {
    try {
        const {questionID, userID} = req.body


        if (questionID == 'aurora1445') {
            console.log('test question requested')
            res.send({
                question: {"_id":{"$oid":"61a05902d63cbf8eddaf3ed7"},"prompt":"evaluate (A and B) or (A xor B) if A = 1 and B = 0","type":"MultipleChoice","options":["1","0","neither"],"secret":{"correctOptions":[{"$numberInt":"0"}]},"topic":"binary algebra","event":"Cybersecurity","showInFeed":true,"showInLibrary":true}
            })
        }

        if (questionID == 'oreo') {
            res.send({
                question: {"prompt":"","type":"MultipleChoice","options":["1","0","neither"], "topic":"Nabisco","event":"Golden"}
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

router.post('/loadTest', async (req, res) => {
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
        for (question of test.questions) {
            question.question = await db.questions.findOne({_id: mongodb.ObjectId(question.questionID)})
        }
        if (!test) {
            res.json({status: false, message: "Test not found"})
        }
        // console.log(questions.length)
        else {
            res.json({
                status: true,
                test
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
router.post('/submitSolution', async (req, res) => {
    try {
        const {questionID, userID, solution} = req.body
        // console.debug(req.body)
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

        //save score
        if (checkReport.correct) {
            let oldSubmission = await db.submissions.findOne({questionID: questionID, userID})
            if (!oldSubmission) {
                const timeZScore = question.standardDeviation && question.standardDeviation != 0 ? (solution.time - question.averageTime) / question.standardDeviation : -0.5
                // console.log(timeZScore)
                const score = timeZScore < 0 ? (-timeZScore/2 + 1) * 1000 : 1000
                const date = new Date()
                // console.log(score)
                await db.ranking.updateOne({userID, event: question.event}, {$inc: {score: score}}, {$set: {lastUpdated: date}}, {upsert: true})
            }
        }
    
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
        if (!checkReport.continue) {
            await db.submissions.insertOne(submission)
            //find the average and standard deviation time for this question

            // const allQuestions = await db.questions.find().toArray()
            // for (let q of allQuestions) {
            //     await db.submissions.aggregate([
            //         {$match: {questionID: q._id.toString(), "checkReport.correct": true}},
            //         {$group: {_id: "$questionID", averageTime: {$avg: "$userSolution.time"}, standardDeviation: {$stdDevPop: "$userSolution.time"}}}
            //     ]).toArray((err, result) => {
            //         if (err) {
            //             console.error(err)
            //         }
            //         else {
            //             if (result.length > 0) {
            //                 db.questions.updateOne({_id: q._id}, {$set: {averageTime: result[0].averageTime}, $set: {standardDeviation: result[0].standardDeviation}})
            //             }
            //         }
            //     })
            //     console.log('Updated question ' + q.prompt)
            // }

            await db.submissions.aggregate([
                {$match: {questionID: questionID, "checkReport.correct": true}},
                {$group: {_id: "$questionID", averageTime: {$avg: "$userSolution.time"}, standardDeviation: {$stdDevPop: "$userSolution.time"}}}
            ]).toArray((err, result) => {
                if (err) {
                    console.error(err)
                }
                else {
                    if (result.length > 0) {
                        db.questions.updateOne({_id: new mongodb.ObjectId(questionID)}, {$set: {averageTime: result[0].averageTime, standardDeviation: result[0].standardDeviation}})
                    }
                }
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
        if (question.type == 'Cryptography' && !question.secret.plaintext) {
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

router.post('/addTest', jwtAuthz(['add:db']), async (req, res) => {
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

router.post('/getRanking', jwtAuthz(['read:db']), async (req, res) => {
    try {
        const scoreConstant = 1000
        const {event, userID} = req.body
        const submissions = await db.submissions.find({event}).toArray()
        let scores = []
        submissions.forEach(async submission => {
            let userIndex = scores.findIndex(score => score.userID == submission.userID)
            if (userIndex < 0) {
                let user = {
                    userID: submission.userID,
                    score: 0,
                    scoredQuestions: []
                }
                scores.push(user)
                userIndex = scores.length - 1
            }
            
            // console.log(userIndex)
            if (submission.checkReport.correct) {
                //relative time error. If negative, it means the user got the question faster than average
                const question = await db.questions.findOne({_id: new mongodb.ObjectId(submission.questionID)})
                let timeError = (submission.userSolution.time - question.averageTime) / question.averageTime
                timeError = timeError == 0 ? 1 : timeError
                console.log(timeError)
                const questionScore = scoreConstant * timeError < 0 ? -1/timeError : 1
                scores[userIndex].score += questionScore
                console.log(scores[userIndex].score)
                // scores[userIndex].scoredQuestions.push(submission.questionID)
            }
        })
        // console.log(scores.length)
        //take a square root. Just for fun
        scores.forEach(score => {
            score.score = Math.round(Math.sqrt(score.score))
            console.log(score.score)
            
        })
        //sort by score
        scores = scores.sort((a, b) => { b.score - a.score })
        res.json({
            status: true,
            users: scores
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
                message,
                correctAnswer: question.secret.plaintext
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
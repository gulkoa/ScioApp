const express = require('express')
const mongodb = require('mongodb')
var client = null
function setUp(DBclient) {client = DBclient}

const router = express.Router()

router.get('/', async (req, res) => {
    const questions = await client.find({}).toArray()
    console.log(questions)
    const question = questions[Math.floor(Math.random() * questions.length)]
    question['correct-option-index'] = -1
    res.json({
        question
    })
})



module.exports = { router, setUp}

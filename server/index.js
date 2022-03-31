const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongodb = require('mongodb')

const dbSecret = require('./dbSecret.json')


const app = express()
//middleware
app.use(bodyParser.json())
app.use(cors())

const port = process.env.PORT || 5000
const question = require('./routes/api/question')

//connecting db
mongodb.MongoClient.connect(`mongodb+srv://${dbSecret.username}:${dbSecret.password}@cluster0.ofpmb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, {useNewUrlParser: true})
    .then(client => {
        question.setUp(client)
        
        if (process.env.NODE_ENV === 'production') {
            app.use(express.static(__dirname + '/public'))
            app.get(/.*/, (req, res) => {
                res.sendFile(__dirname + '/public/index.html')
            })
        }
        
        app.listen(port, () => console.log(`The server is up! Listening at ${port}`))
    })
    .catch(err => {
        console.error('\nDB error!\n' + err)
    })
//api routing
app.use('/api/question/', question.router)
app.use('/api/question/submitSolution', question.router)


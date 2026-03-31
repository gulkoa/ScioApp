const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongodb = require('mongodb')
const { authenticateToken } = require('./middleware/auth')

const app = express()
app.use(bodyParser.json())
app.use(cors())

const port = process.env.PORT || 5000

const question = require('./routes/api/question')
const auth = require('./routes/api/auth')

// Auth routes (login/register) are public
app.use('/api/auth/', auth.router)

// Protected API routes
app.use('/api/question/', authenticateToken, question.router)

setUp()
async function setUp() {
    try {
        const DBClient = await mongodb.MongoClient.connect(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.ofpmb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, { useNewUrlParser: true })
        await question.setUp(DBClient)
        auth.setUp(DBClient)
        app.listen(port, () => console.log(`The server is up! Listening at ${port}`))

        if (process.env.NODE_ENV === 'production') {
            app.use(express.static(__dirname + '/public'))
            app.get(/.*/, (req, res) => {
                res.sendFile(__dirname + '/public/index.html')
            })
        }
    } catch (error) {
        console.log('Error! \n' + error)
    }
}

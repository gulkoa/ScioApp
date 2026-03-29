const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongodb = require('mongodb')

const app = express()
//middleware
app.use(bodyParser.json())
app.use(cors())

const port = process.env.PORT || 5000

//JWT - Authentification
// Create middleware for checking the JWT
const jwt = require('express-jwt')
const jwksRsa = require('jwks-rsa')

const checkJwt = jwt({
    // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
});



setUp()
async function setUp() {
    try {
        const DBClient = await mongodb.MongoClient.connect(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.ofpmb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, { useNewUrlParser: true })
        question.setUp(DBClient)
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

// app.use(checkJwt.unless({ method: ['GET'] }))
//api routing

const question = require('./routes/api/question')
const user = require('./routes/api/user')

app.use('/api/question/', checkJwt, question.router)
app.use('/api/user/', checkJwt, user.router)


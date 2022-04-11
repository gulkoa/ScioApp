const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongodb = require('mongodb')

const dbSecret = require('./dbSecret.json')
// const cloudinary = require('cloudinary')

// cloudinary.config({ 
//     cloud_name: 'alexg', 
//     api_key: '122511629836931', 
//     api_secret: 'k76DEeO5oSzuIeh4jSgMi5IxSGo' 
//   });

// const auth0 = require('./auth0')



const app = express()
//middleware
app.use(bodyParser.json())
app.use(cors())

const port = process.env.PORT || 5000
const question = require('./routes/api/question')
// require('dotenv').config();

// //Auth0
// const { auth } = require('express-openid-connect');

// const config = {
//   authRequired: false,
//   auth0Logout: true,
//   idpLogout: true,
//   secret: 'ioiiiofiodfikofjioiwifwefgrrgeg',
//   baseURL: 'http://localhost:5000',
//   clientID: 'ajMa8kR5GH2Ac8Q46g0SepdvxGolGncr',
//   issuerBaseURL: 'https://dev-hmqllj6v.us.auth0.com'

// };

// // auth router attaches /login, /logout, and /callback routes to the baseURL
// app.use(auth(config));

// // req.isAuthenticated is provided from the auth router
// app.get('/', (req, res) => {
//   res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
// });

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

        // auth0.authorize()
    })
    .catch(err => {
        console.error('\nDB error!\n' + err)
    })
//api routing
app.use('/api/question/', question.router)
app.use('/api/question/submitSolution', question.router)
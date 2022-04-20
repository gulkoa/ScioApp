const express = require('express')
const router = express.Router()
const jwtAuthz = require('express-jwt-authz')
const axios = require('axios')


let accessToken = ''
const tenant = 'https://dev-hmqllj6v.us.auth0.com/'

const permissions = ['read:db', 'add:db', 'propose:db', 'read:reports', 'manage:db', 'manage:ec', 'manage:c', 'manage:coaches']

for (let permission of permissions) {
    router.post('/permission/' + permission.replace(':', '-'), jwtAuthz([permission] ), async (req, res) => {
        console.log('/permission/' + permission.replace(':', '-'))
        res.json({
            status: true,
        })
    })
}

router.post('/getRoles', async (req, res) => {
    try {

        accessToken = await getToken()
        const userId = req.body.userId
        axios.get(`https://dev-hmqllj6v.us.webtask.run/adf6e2f2b84784b57522e3b19dfc9201/api/users/${userId}/`, {
        // axios.get(`https://dev-hmqllj6v.us.auth0.com/api/v2/users/${userId}/permissions`, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
        .then(response => {
            res.json({
                status: true,
                response: response.data
            })
        })
        .catch(error => {
            console.error(error)
            res.json({
                status: false,
            })
        })

    } catch (error) { 
        res.json({
            status: false
        })
        console.log('Error! \n' + error)
    }
})

module.exports = { router }


async function getToken() {
    return new Promise((resolve, reject) => {
        const options = {
        method: 'POST',
        url: tenant + 'oauth/token',
        headers: {'content-type': 'application/json'},
        data: {
            grant_type: 'client_credentials',
            client_id: 'a8vVCnqUZtmRswdMgWTYTYQ8ywIXXZWx',
            client_secret: '8qohR019rWiJ-Vzsz6Ntio-Y0RYYkfDtvdG8UGA8vsp4G25OHKhZt7RChZiSAqXr',
            audience: 'urn:auth0-authz-api'
        }
        };

        axios.request(options).then(response => {
            resolve(response.data.access_token)
        }).catch(error => {
            reject(error);
        });
    })
}



const express = require('express')
const router = express.Router()
const jwtAuthz = require('express-jwt-authz')
const axios = require('axios')


let accessToken = ''
const tenant = `https://${process.env.AUTH0_DOMAIN}/`

const permissions = ['read:db', 'add:db', 'propose:db', 'read:reports', 'manage:db', 'manage:ec', 'manage:c', 'manage:coaches']

for (let permission of permissions) {
    router.post('/permission/' + permission.replace(':', '-'), jwtAuthz([permission] ), async (req, res) => {
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
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
        .then(response => {
            res.json({
                status: true,
            })
        })
        .catch(error => {
                res.json({
                status: false,
            })
        })

    } catch (error) { 
        res.json({
            status: false
        })
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
            client_id: process.env.AUTH0_MGMT_CLIENT_ID,
            client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
            audience: process.env.AUTH0_AUTHZ_AUDIENCE
        }
        };

        axios.request(options).then(response => {
            resolve(response.data.access_token)
        }).catch(error => {
            reject(error);
        });
    })
}



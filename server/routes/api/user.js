const express = require('express')
const router = express.Router()
const jwtAuthz = require('express-jwt-authz')
const axios = require('axios')

router.post('/getRoles', async (req, res) => {
    try {
        const {userId, accessToken} = req.body
        const roles = await axios.get(`https://dev-hmqllj6v.us.auth0.com/api/v2/users/${userId}/permissions`, {
            headers: {
                Authorization: 'Bearer ' + accessToken
                }
            })
        console.log(roles.data)
        res.json({
            status: true,
            roles: roles.data
        })

    } catch (error) { 
        res.json({
            status: false
        })
        console.log('Error! \n' + error)
    }
})

module.exports = { router }

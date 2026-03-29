
const request = require("request")

function authorize() {
    let options = { method: 'POST',
    url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
        client_id: process.env.AUTH0_MGMT_CLIENT_ID,
        client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials'
    }) };

    request(options, function (error, response, body) {
    if (error) throw new Error(error);

    console.log(body);
    });


    // const axios = require("axios");

    // options = { 
    // method: "GET",
    // url: "http://path_to_your_api/",
    // headers: { "authorization": "Bearer TOKEN" },
    // };

    // axios(options)
    // .then(response => {
    //     console.log(response.data);
    // })
    // .catch(error => {
    //     console.log(error);
    // });

}

module.exports = { authorize }
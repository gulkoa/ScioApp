
const request = require("request")

function authorize() {
    let options = { method: 'POST',
    url: 'https://dev-hmqllj6v.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: '{"client_id":"a8vVCnqUZtmRswdMgWTYTYQ8ywIXXZWx","client_secret":"8qohR019rWiJ-Vzsz6Ntio-Y0RYYkfDtvdG8UGA8vsp4G25OHKhZt7RChZiSAqXr","audience":"https://dev-hmqllj6v.us.auth0.com/api/v2/","grant_type":"client_credentials"}' };

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
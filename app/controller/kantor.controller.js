const https = require("https");
const axios = require("axios");

const baseurl = "http://10.27.0.62/SDM"

const agent = new https.Agent({
    rejectUnauthorized: false,
});
let token
function getToken() {
    var config_token = {
        method: "post",
        url: baseurl + "/token",
        headers: {
            Authorization: "Basic cmVnaW9uYWw0XzAxQGdtYWlsLmNvbToxMjM0cmVnNA==",
        },
        httpsAgent: agent,
    };
    axios(config_token)
        .then(function (response) {
            token = response.data.access_token;
        })
        .catch(function (error) {
            return res.status(400).json({
                'responCode': 400,
                'Msg': 'Error Controller:' + error.message
            })
        });
}

function getRegional(req, res) {
    var config_token = {
        method: "post",
        url: baseurl + "/token",
        headers: {
            Authorization: "Basic cmVnaW9uYWw0XzAxQGdtYWlsLmNvbToxMjM0cmVnNA==",
        },
        httpsAgent: agent,
    };
    axios(config_token)
        .then(function (response) {
            token = response.data.access_token;

            const config = {
                method: "get",
                url: baseurl + "/1.1.0/reference/regional",
                headers: {
                    Authorization: "Bearer " + token,
                },
                httpsAgent: agent,
            };

            axios(config)
                .then(function (responData) {
                    let data = responData.data.data
                    res.status(200).json({
                        'responCode': 200,
                        'Msg': 'Berhasil',
                        'Data': data,
                    })

                })
                .catch(function (error) {
                    return res.status(400).json({
                        'responCode': 400,
                        'Msg': 'Error Get Regional:' + error.message
                    })
                });

            // return token;
        })
        .catch(function (error) {
            return res.status(400).json({
                'responCode': 400,
                'Msg': 'Error Controller:' + error.message
            })
        });
}

function getKcu(req, res) {
    getToken()
    const config = {
        method: "get",
        url: baseurl + "/1.1.0/reference/kcu/"+req.body.regional,
        headers: {
            Authorization: "Bearer " + token,
        },
        httpsAgent: agent,
    };

    axios(config)
        .then(function (responData) {
            let data = responData.data.data
            res.status(200).json({
                'responCode': 200,
                'Msg': 'Berhasil',
                'Data': data,
            })

        })
        .catch(function (error) {
            return res.status(400).json({
                'responCode': 400,
                'Msg': 'Error Get Kcu:' + error.message
            })
        });
}

function getKc(req, res) {
    getToken()
    const config = {
        method: "get",
        url: baseurl + "/1.1.0/reference/kc/"+req.body.kcu,
        headers: {
            Authorization: "Bearer " + token,
        },
        httpsAgent: agent,
    };

    axios(config)
        .then(function (responData) {
            let data = responData.data.data
            res.status(200).json({
                'responCode': 200,
                'Msg': 'Berhasil',
                'Data': data,
            })

        })
        .catch(function (error) {
            return res.status(400).json({
                'responCode': 400,
                'Msg': 'Error Get Kc:' + error.message
            })
        });
}

module.exports = {
    getRegional,
    getKcu,
    getKc
}
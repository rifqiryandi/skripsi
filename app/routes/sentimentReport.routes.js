const c_sentiment = require('../controller/sentimentReport.controller')

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post(
        '/skripsi/api/getFeedbackCustomer',
        c_sentiment.getFeedbackCustomer
    );
}
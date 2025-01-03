const c_nps = require('../controller/nps.controller')

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post(
        '/skripsi/api/nps',
        c_nps.npsDashboard
    );
}
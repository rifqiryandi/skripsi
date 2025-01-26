const c_kantor = require('../controller/kantor.controller')

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post(
        '/getRegional',
        c_kantor.getRegional
    );

    app.post(
        '/getKcu',
        c_kantor.getKcu
    );

    app.post(
        '/getKc',
        c_kantor.getKc
    );

    
}

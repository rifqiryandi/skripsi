const controller = require("../utils/naiveBayes.utils");
const controllerTF = require("../utils/tensorFlow");
const controllerTrain = require("../utils/tensorBasicTrain");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.get(
        "/skripsi/utils/trainDataSet",
        // [authJwt.verifyToken],
        controller.trainDataSet
    );

    app.post(
        "/skripsi/utils/sentimentAnalyst",
        // [authJwt.verifyToken],
        controller.sentimentAnalyst
    );
    
    app.get(
        "/skripsi/utils/showScore",
        // [authJwt.verifyToken],
        controller.showScore
    );

    app.get(
        "/skripsi/utils/trainDataSetNew",
        // [authJwt.verifyToken],
        controller.trainDataSetNew
    );

    app.post(
        "/skripsi/utils/basicTF",
        // [authJwt.verifyToken],
        controllerTF.basicTF
    );

    app.post(
        "/skripsi/utils/tryTensor",
        // [authJwt.verifyToken],
        controllerTrain.trainAndSaveModel
    );
    
    
}
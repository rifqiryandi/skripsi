const m_sentiment = require('../model/sentimentReport.model')
const u_naive = require('../utils/naiveBayes.utils')

async function getFeedbackCustomer(req, res) {
    let area = ((req.body.area == '') ? '' : req.body.area)
    let kcu = ((req.body.kcu == '') ? '' : req.body.kcu)
    let kc = ((req.body.kc == '') ? '' : req.body.kc)

    let params = {
        start: req.body.start,
        end: req.body.end,
        layanan: req.body.layanan,
        area: area,
        kcu: kcu,
        kc: kc
    }
    try {
        let data = await m_sentiment.getFeedbackCustomer(params)
        let objData = {
            jumlahPositive: 0,
            jumlahNegative: 0
        };

        // Reduce by PARTY_ID and grouping desc_answer
        let reduceData = data.reduce((acc, curr) => {
            let key = curr.PARTY_ID;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(curr);
            return acc;
        }, {});

        let jumlahPositive = 0;
        let jumlahNegative = 0;
        for (let PARTY_ID of Object.keys(reduceData)) {
            let jumlahRow = reduceData[PARTY_ID].length
            let start = 0
            for (let answer of reduceData[PARTY_ID]) {
                start++
                try {
                    let sentiment = await u_naive.predictSentiment(answer.desc_answer);
                    if (start == jumlahRow) {
                        if (sentiment === "positive") {
                            jumlahPositive++;
                        } else {
                            jumlahNegative++;
                        }
                    }
                } catch (error) {
                    console.error(`Error predicting sentiment for ${answer.desc_answer}:`, error.message);
                }
            }

            objData = {
                jumlahPositive,
                jumlahNegative,
            };
        }
        res.status(200).json({
            responCode: 200,
            Msg: 'Berhasil',
            Data: objData,
        });

    } catch (error) {
        return res.status(400).json({
            'responCode': 400,
            'Msg': 'Error Controller:' + error.message
        })
    }
}

module.exports = {
    getFeedbackCustomer
}
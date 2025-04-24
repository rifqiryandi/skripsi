const m_sentiment = require('../model/sentimentReport.model')
const u_naive = require('../utils/naiveBayes.utils')


function getMonthRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const result = [];

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const month = currentDate.getMonth() + 1; // getMonth() returns 0-based month
        const year = currentDate.getFullYear();
        result.push(`${getMonthName(month)}`);
        // Increment currentDate by one month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result;
}

function getMonthName(month) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[parseInt(month, 10) - 1];
}

// Fungsi untuk menghapus data berdasarkan bulan
function filterDataByMonth(data, monthName) {
    const months = {
        "januari": 1,
        "februari": 2,
        "maret": 3,
        "april": 4,
        "mei": 5,
        "juni": 6,
        "juli": 7,
        "agustus": 8,
        "september": 9,
        "oktober": 10,
        "november": 11,
        "desember": 12
    };

    const month = months[monthName.toLowerCase()];
    return data.filter(item => {
        const itemMonth = new Date(item.CREATE_AT).getMonth() + 1; // getMonth() mulai dari 0, jadi tambah 1
        return itemMonth !== month; // Hapus data yang sesuai dengan bulan
    });
}

function categorizeByMonth(array) {
    return array.reduce((acc, item) => {
        const month = item.CREATE_AT.getMonth() + 1;

        const key = `${getMonthName(month)}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {});
}


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
    const range = getMonthRange(params.start, params.end);
    try {
        let data = await m_sentiment.getFeedbackCustomer(params)
        const typeAnswerObjectPositive = data.reduce((acc, item) => {
            acc[item.type_answer] = 0;
            return acc;
        }, {});
        const typeAnswerObjectNegative = data.reduce((acc, item) => {
            acc[item.type_answer] = 0;
            return acc;
        }, {});


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

        // card datatable
        let detailData = Object.values(
            data.reduce((acc, item) => {
                if (!acc[item.PARTY_ID]) {
                    acc[item.PARTY_ID] = {
                        ...item,
                        desc_answer: [item.desc_answer],
                        type_answer: [item.type_answer]
                    };
                } else {
                    acc[item.PARTY_ID].desc_answer.push(item.desc_answer);
                    acc[item.PARTY_ID].type_answer.push(item.type_answer);
                }
                return acc;
            }, {})
        ).map(item => ({
            ...item,
            desc_answer: item.desc_answer.join(', '),
            type_answer: item.type_answer.join(', ')
        }));

        // card positive dan negative
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
                            if (typeAnswerObjectPositive.hasOwnProperty(answer.type_answer)) {
                                typeAnswerObjectPositive[answer.type_answer] += 1; // Tambah 1 jika key cocok
                            }
                            jumlahPositive++;
                        } else {
                            if (typeAnswerObjectNegative.hasOwnProperty(answer.type_answer)) {
                                typeAnswerObjectNegative[answer.type_answer] += 1; // Tambah 1 jika key cocok
                            }
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

        // short dari besar ke kecil untuk card positive review
        const sortedCountersPositive = Object.fromEntries(
            Object.entries(typeAnswerObjectPositive)
            .sort(([, a], [, b]) => b - a)
        );

        // short dari besar ke kecil berdasarkan negative review
        const sortedCountersNegative = Object.fromEntries(
            Object.entries(typeAnswerObjectNegative)
            .sort(([, a], [, b]) => b - a)
        );

        // persentase tipe fasilitas yang harus di improve
        let arrayNegativeTyoe = Object.keys(sortedCountersNegative)
        params.tipe = arrayNegativeTyoe[0]
        let dataTipe = await m_sentiment.getFeedbackCustomer(params)
        let rangeDataTipe = await categorizeByMonth(dataTipe)
        const rangeObjectImprove = range.reduce((acc, item) => {
            acc[item] = 0;
            return acc;
        }, {});
        for (let z = 0; z < range.length; z++) {
            let month = range[z]
            for (let answer of rangeDataTipe[month]) {
                try {
                    let sentiment = await u_naive.predictSentiment(answer.desc_answer);
                    if (sentiment === "negative") {
                        rangeObjectImprove[month] += 1
                    }
                } catch (error) {
                    console.error(`Error predicting sentiment for ${answer.desc_answer}:`, error.message);
                }
            }
        }

        // persentase area of improve
        let persentaseImprove = 0
        if (range.length > 1) {
            persentaseImprove = (rangeObjectImprove[range[range.length - 1]] - rangeObjectImprove[range[range.length - 2]]) / rangeObjectImprove[range[range.length - 2]] * 100
        }
        //  persentase positive dan negative by month
        let persenPositivie = 0;
        let persenNegative = 0;

        if (range.length > 1) {

            const filteredData = filterDataByMonth(data, range[range.length - 1]);
            let reduceDataFilter = filteredData.reduce((acc, curr) => {
                let key = curr.PARTY_ID;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(curr);
                return acc;
            }, {});
            // card positive dan negative
            let jumlahPositiveFilter = 0;
            let jumlahNegativeFilter = 0;

            for (let PARTY_ID of Object.keys(reduceDataFilter)) {
                let jumlahRow = reduceDataFilter[PARTY_ID].length
                let start = 0
                for (let answer of reduceDataFilter[PARTY_ID]) {
                    start++
                    try {
                        let sentiment = await u_naive.predictSentiment(answer.desc_answer);
                        if (start == jumlahRow) {
                            if (sentiment === "positive") {
                                jumlahPositiveFilter++;
                            } else {
                                jumlahNegativeFilter++;
                            }
                        }
                    } catch (error) {
                        console.error(`Error predicting sentiment for ${answer.desc_answer}:`, error.message);
                    }
                }
            }

            persenPositivie = (objData.jumlahPositive - jumlahPositiveFilter) / jumlahPositiveFilter * 100
            persenNegative = (objData.jumlahNegative - jumlahNegativeFilter) / jumlahNegativeFilter * 100
        }


        objData.persenPositivie = persenPositivie.toFixed(2) + '%'
        objData.persenNegative = persenNegative.toFixed(2) + '%'
        objData.positiveReview = sortedCountersPositive
        objData.mustToimprove = arrayNegativeTyoe[0]
        objData.rangeImprove = rangeObjectImprove
        objData.improveArea = sortedCountersNegative
        objData.persenImprove = persentaseImprove.toFixed(2) + '%'
        objData.datatable = detailData
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
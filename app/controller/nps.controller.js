const m_nps = require('../model/nps.model')

function getMonthName(month) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[parseInt(month, 10) - 1];
}

function categorizeByMonth(array) {
    return array.reduce((acc, item) => {
        const [month, year] = item.create_at.split('-');
        const key = `${getMonthName(month)}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {});
}

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


async function npsDashboard(req, res) {
    let area = ((req.body.area == '') ? '' : req.body.area)
    try {
        let paramsPs, paramsDT, paramsPM
        let {
            layanan,
            start,
            end
        } = req.body
        const range = getMonthRange(start, end);
        paramsPs = {
            layanan : layanan,
            area: area,
            poin_awal: 70,
            poin_akhir: 80,
            start: start,
            end: end
        }        
        let dataPassive = await m_nps.npsDashboard(paramsPs)
        paramsDT = {
            layanan : layanan,
            area: area,
            poin_awal: 0,
            poin_akhir: 60,
            start: start,
            end: end
        }
        let dataDetractor = await m_nps.npsDashboard(paramsDT)
        paramsPM = {
            layanan : layanan,
            area: area,
            poin_awal: 90,
            poin_akhir: 100,
            start: start,
            end: end
        }
        let dataPromotor = await m_nps.npsDashboard(paramsPM)

        let dataPassiveMonth = categorizeByMonth(dataPassive)
        let dataDetractorMonth = categorizeByMonth(dataDetractor)
        let dataPromotorMonth = categorizeByMonth(dataPromotor)

        let resultPerMonth = {}
        for (let i = 0; i < range.length; i++) {
            let month = range[i]
            let jumlahRespondenPerMonth = dataPassiveMonth[month].length + dataDetractorMonth[month].length + dataPromotorMonth[month].length
            let persenProPerMonth = dataPassiveMonth[month].length / jumlahRespondenPerMonth * 100
            let persenDetPerMonth = dataDetractorMonth[month].length / jumlahRespondenPerMonth * 100
            let npsScorePerMonth = persenProPerMonth - persenDetPerMonth
            resultPerMonth[month] = {
                'jumlahPassive': dataPassiveMonth[month].length,
                'jumlahDetractor': dataDetractorMonth[month].length,
                'jumlahPromotor': dataPromotorMonth[month].length,
                'npsScorePerMonth': npsScorePerMonth.toFixed(2)
            }

        }
        let persenNpsLastM = resultPerMonth[range[range.length - 1]]['npsScorePerMonth'] - resultPerMonth[range[range.length - 2]]['npsScorePerMonth']
        
        let jumlahResponden = dataPassive.length + dataDetractor.length + dataPromotor.length
        let persenPro = dataPromotor.length / jumlahResponden * 100
        let persenDet = dataDetractor.length / jumlahResponden * 100
        let npsScore = persenPro - persenDet

        let Data = {
            'jumlahPassive': dataPassive.length,
            'jumlahDetractor': dataDetractor.length,
            'jumlahPromotor': dataPromotor.length,
            'npsScoreAll': npsScore.toFixed(2),
            'LastMonth' : persenNpsLastM.toFixed(2),
            'ResultPerMonth': resultPerMonth
        }
        res.status(200).json({
            'responCode': 200,
            'Msg': 'Berhasil',
            'Data': Data
        })
    } catch (error) {        
        return res.status(400).json({
            'responCode': 400,
            'Msg': 'Error Controller:' + error.message
        })
    }
}

module.exports = {
    npsDashboard
}
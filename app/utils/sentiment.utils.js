let m_try = require('../model/try.model');

let Sentiment = require('sentiment');
exports.sentimentAnalyst = async (req, res) => {
    let sentiment = new Sentiment();
    try {
        // let data = await m_try.get_try()
        // console.log(data);
        var result = sentiment.analyze('Produk ini sangat bagus dan memuaskan.');
        console.log(result);
        return res.status(200).json({
            'server': process.env.SERVER_TYPE,
            'code': 200,
            'message': 'success'
        })
    } catch (error) {
        res.status(404).json({
            'server': process.env.SERVER_TYPE,
            'code': 404,
            'data': 'failure'
        })
    }
}
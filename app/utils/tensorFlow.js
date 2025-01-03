const tf = require('@tensorflow/tfjs');
const model = tf.sequential();


exports.basicTF = async (req, res) => {
    model.add(tf.layers.dense({
        inputShape: [1],
        units: 1,
        activation: 'sigmoid'
    }));
    model.compile({
        optimizer: 'sgd',
        loss: 'binaryCrossentropy'
    });
    let params = req.body.text
    analyzeSentiment(params)
    
}
// ! Preprocessing
function preprocessText(text) {
    const processedText = text.toLowerCase().replace(/[^a-z\s]/g, '');
    return processedText;
}

function tokenizeText(text) {
    return text.split(/\s+/);
}

function analyzeSentiment(userInput) {
    const processedText = preprocessText(userInput);
    const tokenizedText = tokenizeText(processedText);
    const inputTensor = tf.tensor([
        [tokenizedText.length]
    ]);
    const prediction = model.predict(inputTensor);
    prediction.print();
}

// const model = await tf.loadLayersModel('file:///Applications/NODE%20JS%20POS/SKRIPSI/AFINN-based/model/model.json');
    // const input = req.body.input
    // const inputTensor = tf.tensor2d(input, [1, 1]);
    // const prediction = model.predict(inputTensor);
    // const predictionData = prediction.dataSync();
    // const predictionValue = predictionData[0];
    // res.status(200).json({
    //     'server': process.env.SERVER_TYPE,
    //     'code': 200,
    //     'data': predictionValue
    // })
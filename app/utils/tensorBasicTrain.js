const fs = require('fs');
const tf = require('@tensorflow/tfjs');
// require('@tensorflow/tfjs-node');

const csvParser = require('csv-parser');

const Sastrawi = require('sastrawijs');
const path = require('path');
const tokenize = (text) => text.toLowerCase().replace(/[^a-z]/g, '')
    .split('');
const sentimentMapping = {
    positive: 1,
    negative: 0
};
const stemmer = new Sastrawi.Stemmer();
const stopword = require('stopword');
const indonesianStopwords = JSON.parse(fs.readFileSync('stopword-id.json', 'utf8'));


function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                let objData = {
                    label: row.Sentiment,
                    text: row['Text']
                };
                data.push(objData);
            })
            .on('end', () => {
                resolve(data);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

// Pad sequence
const padSequence = (sequence, maxLength) => {
    return Array.from({
            length: maxLength - sequence.length
        },
        () => 0
    ).concat(sequence);
};

exports.trainAndSaveModel = async (req, res) => {
    const CleanerDataset = [];
    // Baca CSV
    let dataset = await readCSV('dataset.csv')

    dataset.forEach((item) => {
        // Tokenisasi (memecah kalimat menjadi kata-kata)
        let tokenizedText = tokenize(item.text);

        // Penghilangan stopword
        let filteredText = stopword.removeStopwords(tokenizedText, indonesianStopwords);

        // Stemming (mengubah kata-kata menjadi bentuk dasar)
        let stemmedText = filteredText.map(word => stemmer.stem(word));
        let ListText = {
            Text: stemmedText.join(' '),
            Sentiment: item.label
        }
        CleanerDataset.push(ListText)

    });
    const textData = CleanerDataset.map((data) => data.Text);
    const labels = CleanerDataset.map((data) => sentimentMapping[data.Sentiment]);
    try {
        // Tentukan panjang maksimum
        const maxSeqLength = textData.reduce(
            (max, text) => Math.max(max, tokenize(text).length),
            0
        );
        // Preprocess text data
        const xData = textData.map((text) => {
            const tokens = tokenize(text);
            const sequence = tokens.map(
                (token) => token.charCodeAt(0) - 'a'.charCodeAt(0) + 1
            );
            return padSequence(sequence, maxSeqLength);
        });
        const yData = tf.tensor1d(labels);
        const model = tf.sequential();
        model.add(
            tf.layers.embedding({
                inputDim: 27, // Adjust if using custom encoding
                outputDim: 8,
                inputLength: maxSeqLength,
            })
        );
        model.add(tf.layers.flatten());
        model.add(
            tf.layers.dense({
                units: 1,
                activation: 'sigmoid',
            })
        );

        model.compile({
            optimizer: tf.train.adam(),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy'],
        });

        const xTrain = tf.tensor2d(xData);
        await model.fit(xTrain, yData, {
            epochs: 50
        });

        console.log('done');
        // const modelSavePath = path.join(__dirname, 'model');

        // Pastikan direktori ada
        // if (!fs.existsSync(modelSavePath)) {
        //     fs.mkdirSync(modelSavePath);
        // }        
        // Simpan model menggunakan URL yang valid
        // await model.save(`file://${modelSavePath}/`);
        // await tf.saved_model.save(model, 'file://./model');
        // console.log('Model saved successfully.');

    } catch (error) {
        console.log(error);
    }
};

const predictSentiment = async (texts, modelPath) => {
    const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
    console.log('Model loaded successfully.');

    // Tokenize and pad sequences
    const maxSeqLength = 10; // Pastikan ini sesuai dengan panjang maksimum saat training
    const padSequence = (sequence, maxLength) => {
        return Array.from({
                length: maxLength - sequence.length
            },
            () => 0
        ).concat(sequence);
    };

    const tokenize = (text) => text.toLowerCase().split(" ");
    const xTest = texts.map((text) => {
        const tokens = tokenize(text);
        const sequence = tokens.map(
            (token) => token.charCodeAt(0) - 'a'.charCodeAt(0) + 1
        );
        return padSequence(sequence, maxSeqLength);
    });

    const xTestTensor = tf.tensor2d(xTest);

    const predictions = model.predict(xTestTensor);
    const results = await predictions.array();
    return results;
};
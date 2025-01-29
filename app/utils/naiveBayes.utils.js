let m_try = require('../model/try.model');
const {
    parse
} = require('json2csv');
const natural = require('natural');
const fs = require('fs');
const stopword = require('stopword');
const Sastrawi = require('sastrawijs');
const csv = require('csv-parser');
// Buat tokenizer
const tokenizer = new natural.WordTokenizer();

// Buat stemmer Bahasa Indonesia
const stemmer = new Sastrawi.Stemmer();

// Daftar stopword Bahasa Indonesia
const indonesianStopwords = JSON.parse(fs.readFileSync('formatted_stopwords.json', 'utf8'));

// Buat classifier menggunakan Naive Bayes
const classifier = new natural.BayesClassifier();

function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(filePath)
            .pipe(csv())
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

exports.trainDataSet = async (req, res) => {
    try {
        let dataset = await readCSV('dataset2.csv')

        // Split into training and testing (e.g., 80% training, 20% testing)

        const trainSize = Math.floor(dataset.length * 0.8);
        const trainingData = dataset.slice(0, trainSize);
        const testingData = dataset.slice(trainSize);

        // dataset training 
        let trainingDataNew = [];
        let countP = 0,
            countN = 0,
            countNu = 0
        let maxPerCategory = 200;
        for (let i = 0; i < dataset.length; i++) {
            if (countP >= maxPerCategory && countN >= maxPerCategory && countNu >= maxPerCategory) {
                break;
            }
            let item = dataset[i];
            if (item.label === 'positive' && countP < maxPerCategory) {
                countP++;
                trainingDataNew.push(item);
            } else if (item.label === 'negative' && countN < maxPerCategory) {
                countN++;
                trainingDataNew.push(item);
            } else if (item.label !== 'positive' && item.label !== 'negative' && countNu < maxPerCategory) {
                countNu++;
                trainingDataNew.push(item);
            }
        }

        // dataset testing 
        let testingDataNew = [];
        countP = 0
        countN = 0
        countNu = 0
        maxPerCategory = 50;

        for (let z = dataset.length - 1; z >= 0; z--) {

            if (countP >= maxPerCategory && countN >= maxPerCategory && countNu >= maxPerCategory) {
                break;
            }
            let item = dataset[z];

            if (item.label === 'positive' && countP < maxPerCategory) {
                countP++;
                testingDataNew.push(item);
            } else if (item.label === 'negative' && countN < maxPerCategory) {
                countN++;
                testingDataNew.push(item);
            } else if (item.label !== 'positive' && item.label !== 'negative' && countNu < maxPerCategory) {
                countNu++;
                testingDataNew.push(item);
            }
        }

        trainingDataNew.forEach(item => {
            // Tokenisasi (memecah kalimat menjadi kata-kata)
            let tokenizedText = tokenizer.tokenize(item.text);

            // Penghilangan stopword
            let filteredText = stopword.removeStopwords(tokenizedText, indonesianStopwords);

            // Stemming (mengubah kata-kata menjadi bentuk dasar)
            // let stemmedText = filteredText.map(word => stemmer.stem(word));

            // Tambahkan dokumen ke classifier dengan teks yang telah diproses dan label
            classifier.addDocument(filteredText.join(' '), item.label);
            classifier.addDocument(item.text, item.label);

        });

        // Latih classifier
        classifier.train();

        // Predict and compare on testing data
        const trueLabels = [];
        const predictedLabels = [];
        testingDataNew.forEach((data) => {
            trueLabels.push(data.label);
            predictedLabels.push(classifier.classify(data.text));
        });


        // Calculate the confusion matrix
        let numMatrix = calculateConfusionMatrix(trueLabels, predictedLabels);

        // Simpan classifier untuk digunakan nanti
        classifier.save('classifier-id.json', function (err, classifier) {
            if (err) {
                console.error('Error saving classifier:', err);
            } else {
                console.log('Classifier saved successfully.');
            }
        });

        return res.status(200).json({
            'server': process.env.SERVER_TYPE,
            'code': 200,
            'message': 'train data success',
            "Score": numMatrix
        })
    } catch (error) {
        console.log(error);

        res.status(404).json({
            'server': process.env.SERVER_TYPE,
            'code': 404,
            'data': 'failure'
        })
    }
}

function calculateConfusionMatrix(trueLabels, predictedLabels) {
    const classes = Array.from(new Set([...trueLabels, ...predictedLabels]));
    const confusionMatrix = Array(classes.length)
        .fill(null)
        .map(() => Array(classes.length).fill(0));

    trueLabels.forEach((trueLabel, index) => {
        const predictedLabel = predictedLabels[index];
        const trueIndex = classes.indexOf(trueLabel);
        const predictedIndex = classes.indexOf(predictedLabel);
        confusionMatrix[trueIndex][predictedIndex]++;
    });

    // Print confusion matrix
    confusionMatrix.forEach((row, i) => {
        console.log(`${classes[i]}` + ':' + `${row.join('    ')}`);
    });

    // Optionally, compute metrics like accuracy, precision, recall, F1-score
    let totalCorrect = 0;
    let totalPredictions = 0;
    const metrics = classes.map(() => ({
        TP: 0,
        FP: 0,
        FN: 0,
        Precision: 0,
        Recall: 0,
        F1: 0,
    }));

    confusionMatrix.forEach((row, i) => {
        totalCorrect += row[i]; // Diagonal
        totalPredictions += row.reduce((sum, val) => sum + val, 0);

        const TP = row[i];
        const FP = confusionMatrix.reduce((sum, r) => sum + r[i], 0) - TP;
        const FN = row.reduce((sum, val) => sum + val, 0) - TP;

        metrics[i].TP = TP;
        metrics[i].FP = FP;
        metrics[i].FN = FN;
        metrics[i].Precision = TP / (TP + FP || 1);
        metrics[i].Recall = TP / (TP + FN || 1);
        metrics[i].F1 =
            2 * (metrics[i].Precision * metrics[i].Recall) /
            (metrics[i].Precision + metrics[i].Recall || 1);
    });

    let respon = []
    let overall = {
        'OverallAccuracy': (totalCorrect / totalPredictions).toFixed(2)
    }
    respon.push(overall)
    metrics.forEach((metric, i) => {
        let objMetric = {
            "Class ": classes[i],
            "Precision": metric.Precision.toFixed(2),
            "Recall": metric.Recall.toFixed(2),
            "F1-Score": metric.F1.toFixed(2)
        }
        respon.push(objMetric)
    });
    return respon
}

function computeMetrics(confusionMatrix, classes) {
    let totalCorrect = 0;
    let totalPredictions = 0;
    const metrics = classes.map(() => ({
        TP: 0,
        FP: 0,
        FN: 0,
        Precision: 0,
        Recall: 0,
        F1: 0,
    }));

    confusionMatrix.forEach((row, i) => {
        totalCorrect += row[i]; // Diagonal
        totalPredictions += row.reduce((sum, val) => sum + val, 0);

        const TP = row[i];
        const FP = confusionMatrix.reduce((sum, r) => sum + r[i], 0) - TP;
        const FN = row.reduce((sum, val) => sum + val, 0) - TP;

        metrics[i].TP = TP;
        metrics[i].FP = FP;
        metrics[i].FN = FN;
        metrics[i].Precision = TP / (TP + FP || 1);
        metrics[i].Recall = TP / (TP + FN || 1);
        metrics[i].F1 =
            2 * (metrics[i].Precision * metrics[i].Recall) /
            (metrics[i].Precision + metrics[i].Recall || 1);
    });

    console.log('\nOverall Accuracy:', (totalCorrect / totalPredictions).toFixed(2), '%\n');
    metrics.forEach((metric, i) => {
        console.log("Class " + `${classes[i]}` + ':\n');
        console.log("Precision:" + `${metric.Precision.toFixed(2)}` + '%');
        console.log("Recall:" + `${metric.Recall.toFixed(2)}` + '%');
        console.log("F1 - Score:" + `${metric.F1.toFixed(2)}` + '%\n');
    });
}


function loadClassifier(filePath) {
    return new Promise((resolve, reject) => {
        natural.BayesClassifier.load(filePath, null, function (err, classifier) {
            if (err) {
                reject(err); // Tangani error jika terjadi
            } else {
                resolve(classifier); // Kembalikan classifier jika berhasil
            }
        });
    });
}

exports.sentimentAnalyst = async (req, res) => {
    const classifier = await loadClassifier('classifier-id.json');
    let komentar = req.body.komentar
    try {
        let tokenizedKomentar = tokenizer.tokenize(komentar);
        let filteredKomentar = stopword.removeStopwords(tokenizedKomentar, indonesianStopwords);
        let stemmedKomentar = filteredKomentar.map(word => stemmer.stem(word));
        const sentiment = classifier.classify(stemmedKomentar.join(' '));
        return res.status(200).json({
            'server': process.env.SERVER_TYPE,
            'code': 200,
            'message': 'success',
            'sentiment': sentiment
        })
    } catch (error) {
        res.status(404).json({
            'server': process.env.SERVER_TYPE,
            'code': 404,
            'data': 'failure'
        })
    }
}

let classifierModel;
(async () => {
    try {
        classifierModel = await new Promise((resolve, reject) => {
            natural.BayesClassifier.load('classifier-id.json', null, function (err, classifier) {
                if (err) {
                    reject(err);
                } else {
                    resolve(classifier);
                }
            });
        });
        // console.log('Classifier model loaded successfully.');
    } catch (error) {
        console.error('Error loading classifier model:', error.message);
    }
})();

exports.predictSentiment = async (komentar) => {
    if (!classifierModel) {
        return res.status(500).json({
            'server': process.env.SERVER_TYPE,
            'code': 500,
            'message': 'Classifier model not loaded.'
        });
    }
    try {
        let tokenizedKomentar = tokenizer.tokenize(komentar);
        let filteredKomentar = stopword.removeStopwords(tokenizedKomentar, indonesianStopwords);
        // let stemmedKomentar = filteredKomentar.map(word => stemmer.stem(word));
        const sentiment = classifierModel.classify(filteredKomentar.join(' '));
        return sentiment;
    } catch (error) {
        console.log(error.message);
    }
};

exports.showScore = async (req, res) => {
    const trainedModel = JSON.parse(fs.readFileSync('classifier-id.json', 'utf8'));
    const classifier = natural.BayesClassifier.restore(trainedModel);
    const k = 5; // Jumlah fold

    // Data yang digunakan
    const dataset = [
        // Positive samples (50)
        {
            text: 'Pelayanannya sangat cepat dan ramah',
            label: 'positive'
        },
        {
            text: 'Informasinya sangat jelas dan mudah dipahami',
            label: 'positive'
        },
        {
            text: 'Loket pelayanan sangat membantu',
            label: 'positive'
        },
        {
            text: 'Pengiriman barang sangat cepat dan aman',
            label: 'positive'
        },
        {
            text: 'Harga layanan sangat terjangkau',
            label: 'positive'
        },
        {
            text: 'Ruang tunggu sangat nyaman',
            label: 'positive'
        },
        {
            text: 'Aplikasi ini sangat membantu dalam pelacakan barang',
            label: 'positive'
        },
        {
            text: 'Customer service sangat responsif',
            label: 'positive'
        },
        {
            text: 'Sangat puas dengan layanan ini',
            label: 'positive'
        },
        {
            text: 'Kualitas pengemasan barang sangat baik',
            label: 'positive'
        },
        {
            text: 'Proses pengiriman cepat dan aman',
            label: 'positive'
        },
        {
            text: 'Pelayanan yang diberikan sangat memuaskan',
            label: 'positive'
        },
        {
            text: 'Kualitas pelayanan sangat baik',
            label: 'positive'
        },
        {
            text: 'Proses refund sangat cepat',
            label: 'positive'
        },
        {
            text: 'Barang sampai tepat waktu',
            label: 'positive'
        },
        {
            text: 'Respon sangat cepat dan ramah',
            label: 'positive'
        },
        {
            text: 'Sistem tracking barang sangat akurat',
            label: 'positive'
        },
        {
            text: 'Layanan 24 jam sangat membantu',
            label: 'positive'
        },
        {
            text: 'Paket sampai dengan aman',
            label: 'positive'
        },
        {
            text: 'Harga sangat kompetitif',
            label: 'positive'
        },
        {
            text: 'Aplikasi ini sangat mudah digunakan',
            label: 'positive'
        },
        {
            text: 'Staf sangat profesional dan membantu',
            label: 'positive'
        },
        {
            text: 'Pengalaman yang sangat memuaskan',
            label: 'positive'
        },
        {
            text: 'Barang yang saya terima dalam kondisi baik',
            label: 'positive'
        },
        {
            text: 'Pelayanan cepat dan efisien',
            label: 'positive'
        },
        {
            text: 'Pengiriman barang sangat aman dan cepat',
            label: 'positive'
        },
        {
            text: 'Proses tracking barang sangat akurat',
            label: 'positive'
        },
        {
            text: 'Harga layanan sangat terjangkau',
            label: 'positive'
        },
        {
            text: 'Sangat puas dengan layanan customer service',
            label: 'positive'
        },
        {
            text: 'Staf sangat ramah dan profesional',
            label: 'positive'
        },
        {
            text: 'Barang sampai tepat waktu dengan kondisi baik',
            label: 'positive'
        },
        {
            text: 'Aplikasi sangat mudah digunakan dan responsif',
            label: 'positive'
        },
        {
            text: 'Layanan pengiriman cepat dan tepat waktu',
            label: 'positive'
        },
        {
            text: 'Pelayanan online sangat memudahkan',
            label: 'positive'
        },
        {
            text: 'Customer service sangat membantu dan ramah',
            label: 'positive'
        },
        {
            text: 'Pengemasan barang sangat aman',
            label: 'positive'
        },
        {
            text: 'Harga layanan sangat kompetitif',
            label: 'positive'
        },
        {
            text: 'Pelayanan sangat responsif dan cepat',
            label: 'positive'
        },
        {
            text: 'Saya sangat puas dengan layanan ini',
            label: 'positive'
        },
        {
            text: 'Proses pengiriman barang sangat profesional',
            label: 'positive'
        },
        {
            text: 'Pelayanan sangat baik dan memuaskan',
            label: 'positive'
        },

        // Negative samples (50)
        {
            text: 'Loket pelayanan sering penuh dan lambat',
            label: 'negative'
        },
        {
            text: 'Informasi yang diberikan tidak jelas',
            label: 'negative'
        },
        {
            text: 'Pengiriman barang sangat lambat',
            label: 'negative'
        },
        {
            text: 'Harga layanan terlalu mahal',
            label: 'negative'
        },
        {
            text: 'Ruang tunggu kotor dan tidak nyaman',
            label: 'negative'
        },
        {
            text: 'Aplikasi sering error dan sulit digunakan',
            label: 'negative'
        },
        {
            text: 'Customer service tidak ramah dan lambat',
            label: 'negative'
        },
        {
            text: 'Sangat kecewa dengan layanan ini',
            label: 'negative'
        },
        {
            text: 'Kualitas pengemasan barang sangat buruk',
            label: 'negative'
        },
        {
            text: 'Pengalaman yang sangat mengecewakan',
            label: 'negative'
        },
        {
            text: 'Pelayanan kurang memuaskan',
            label: 'negative'
        },
        {
            text: 'Saya tidak akan menggunakan layanan ini lagi',
            label: 'negative'
        },
        {
            text: 'Pengiriman barang sangat lambat, mengecewakan',
            label: 'negative'
        },
        {
            text: 'Harga layanan tidak sesuai dengan kualitas',
            label: 'negative'
        },
        {
            text: 'Aplikasi tidak user-friendly',
            label: 'negative'
        },
        {
            text: 'Loket selalu penuh dan antriannya lama',
            label: 'negative'
        },
        {
            text: 'Harga yang ditawarkan tidak masuk akal',
            label: 'negative'
        },
        {
            text: 'Tidak ada informasi yang jelas mengenai pengiriman',
            label: 'negative'
        },
        {
            text: 'Aplikasi sering macet dan lambat',
            label: 'negative'
        },
        {
            text: 'Pelayanan customer service sangat buruk',
            label: 'negative'
        },
        {
            text: 'Proses klaim sangat ribet dan lama',
            label: 'negative'
        },
        {
            text: 'Barang datang dalam kondisi rusak',
            label: 'negative'
        },
        {
            text: 'Sangat tidak puas dengan layanan ini',
            label: 'negative'
        },
        {
            text: 'Kualitas layanan sangat buruk, tidak akan rekomendasikan',
            label: 'negative'
        },
        {
            text: 'Pengiriman sangat lambat dan tidak memuaskan',
            label: 'negative'
        },
        {
            text: 'Harga yang ditawarkan tidak masuk akal',
            label: 'negative'
        },
        {
            text: 'Aplikasi tidak user-friendly dan sering crash',
            label: 'negative'
        },
        {
            text: 'Staf pelayanan tidak ramah dan tidak membantu',
            label: 'negative'
        },
        {
            text: 'Sistem tracking barang sering tidak akurat',
            label: 'negative'
        },
        {
            text: 'Proses refund sangat lama dan ribet',
            label: 'negative'
        },
        {
            text: 'Saya kecewa dengan pelayanan yang diberikan',
            label: 'negative'
        },
        {
            text: 'Barang saya hilang dan tidak ada kompensasi',
            label: 'negative'
        },
        {
            text: 'Sangat tidak puas dengan kualitas layanan',
            label: 'negative'
        },
        {
            text: 'Pengiriman terlambat dan tidak ada informasi update',
            label: 'negative'
        },
        {
            text: 'Harga mahal dan kualitas layanan buruk',
            label: 'negative'
        },
        {
            text: 'Aplikasi sering mengalami error saat digunakan',
            label: 'negative'
        },
        {
            text: 'Staf pelayanan sangat lambat dan tidak responsif',
            label: 'negative'
        },

        // Neutral samples (50)
        {
            text: 'Pelayanan biasa saja',
            label: 'neutral'
        },
        {
            text: 'Pengiriman sesuai estimasi, tidak istimewa',
            label: 'neutral'
        },
        {
            text: 'Aplikasi cukup baik, tapi masih ada kekurangan',
            label: 'neutral'
        },
        {
            text: 'Harga sesuai dengan layanan yang diberikan',
            label: 'neutral'
        },
        {
            text: 'Customer service tidak buruk, tapi tidak istimewa',
            label: 'neutral'
        },
        {
            text: 'Proses pengiriman tidak ada masalah, tapi tidak cepat',
            label: 'neutral'
        },
        {
            text: 'Kualitas layanan standar, tidak lebih',
            label: 'neutral'
        },
        {
            text: 'Barang sampai dengan kondisi baik, tidak ada keluhan',
            label: 'neutral'
        },
        {
            text: 'Staf cukup ramah, tapi tidak sangat membantu',
            label: 'neutral'
        },
        {
            text: 'Pengalaman standar, tidak buruk tapi tidak mengesankan',
            label: 'neutral'
        },
        {
            text: 'Aplikasi bisa digunakan, tapi sering ada gangguan kecil',
            label: 'neutral'
        },
        {
            text: 'Harga sesuai dengan kualitas, tidak mengecewakan',
            label: 'neutral'
        },
        {
            text: 'Pelayanan cukup baik, tetapi bisa lebih cepat',
            label: 'neutral'
        },
        {
            text: 'Pengiriman barang memadai, tidak terlalu cepat atau lambat',
            label: 'neutral'
        },
        {
            text: 'Kualitas pengemasan standar, tidak terlalu baik atau buruk',
            label: 'neutral'
        },
        {
            text: 'Pelayanan tidak buruk, tetapi bisa lebih efisien',
            label: 'neutral'
        },
        {
            text: 'Proses refund agak lama, tetapi akhirnya selesai',
            label: 'neutral'
        },
        {
            text: 'Aplikasi cukup mudah digunakan, tapi tidak sempurna',
            label: 'neutral'
        },
        {
            text: 'Pengiriman barang tidak terlalu cepat, tetapi aman',
            label: 'neutral'
        },
        {
            text: 'Pelayanan tidak buruk, tetapi tidak istimewa',
            label: 'neutral'
        },
        {
            text: 'Kualitas layanan standar, tidak mengecewakan',
            label: 'neutral'
        },
        {
            text: 'Barang datang sesuai waktu, namun kualitas pengemasan biasa saja',
            label: 'neutral'
        },
        {
            text: 'Harga layanan tidak terlalu murah atau mahal',
            label: 'neutral'
        },
        {
            text: 'Pelayanan lumayan, tapi tidak sangat memuaskan',
            label: 'neutral'
        },
        {
            text: 'Proses pengiriman biasa saja, tidak ada masalah besar',
            label: 'neutral'
        },
        {
            text: 'Aplikasi cukup membantu, namun ada beberapa kekurangan',
            label: 'neutral'
        },
        {
            text: 'Barang sampai sesuai estimasi, tidak ada masalah',
            label: 'neutral'
        },
        {
            text: 'Proses pengiriman cukup cepat, tapi tidak luar biasa',
            label: 'neutral'
        },
        {
            text: 'Kualitas layanan biasa saja, tidak buruk tetapi bisa lebih baik',
            label: 'neutral'
        },
        {
            text: 'Pengalaman yang cukup baik, tidak ada yang istimewa',
            label: 'neutral'
        },
        {
            text: 'Harga layanan sesuai dengan kualitas, tidak terlalu memuaskan',
            label: 'neutral'
        },
        {
            text: 'Staf cukup ramah, tapi tidak sangat profesional',
            label: 'neutral'
        },
        {
            text: 'Pelayanan cukup baik, tetapi masih banyak ruang untuk perbaikan',
            label: 'neutral'
        },
        {
            text: 'Aplikasi cukup stabil, tidak ada masalah besar',
            label: 'neutral'
        },
        {
            text: 'Pengiriman barang aman, tetapi tidak terlalu cepat',
            label: 'neutral'
        }
    ];

    try {
        const foldSize = Math.floor(dataset.length / k);
        let totalAccuracy = 0;
        let totalCorrectPredictions = 0;
        let totalPredictions = 0;
        let positiveTrue = 0; // TP
        let positiveFalse = 0; // FP
        let negativeTrue = 0; // TN
        let negativeFalse = 0; // FN

        for (let i = 0; i < k; i++) {
            const testingData = dataset.slice(i * foldSize, (i + 1) * foldSize);

            testingData.forEach((data) => {
                const predictedLabel = classifier.classify(data.text);
                if (predictedLabel === data.label) {
                    totalCorrectPredictions++;
                }
                totalPredictions++;

                // Hitung TP, FP, TN, FN
                if (predictedLabel === 'positive' && data.label === 'positive') {
                    positiveTrue++;
                } else if (predictedLabel === 'positive' && data.label === 'negative') {
                    positiveFalse++;
                } else if (predictedLabel === 'negative' && data.label === 'negative') {
                    negativeTrue++;
                } else if (predictedLabel === 'negative' && data.label === 'positive') {
                    negativeFalse++;
                }
            });

            const accuracy = (totalCorrectPredictions / totalPredictions) * 100;
            totalAccuracy += accuracy;
        }

        // Rata-rata akurasi keseluruhan
        const averageAccuracy = totalAccuracy / k;

        // Precision, Recall, dan F1-Score
        const precision = (positiveTrue / (positiveTrue + positiveFalse)) || 0;
        const recall = (positiveTrue / (positiveTrue + negativeFalse)) || 0;
        const f1Score = 2 * ((precision * recall) / (precision + recall)) || 0;

        return res.status(200).json({
            'server': process.env.SERVER_TYPE,
            'code': 200,
            'message': 'success',
            'Rata-rata Akurasi per Fold': `${averageAccuracy.toFixed(2)}%`,
            'Akurasi': `${((totalCorrectPredictions / totalPredictions) * 100).toFixed(2)}%`,
            'Precision': `${(precision * 100).toFixed(2)}%`,
            'Recall': `${(recall * 100).toFixed(2)}%`,
            'F1-Score': `${(f1Score * 100).toFixed(2)}%`,
        });
    } catch (error) {
        res.status(404).json({
            'server': process.env.SERVER_TYPE,
            'code': 404,
            'data': 'failure',
        });
    }
}

exports.newShowScore = async (req, res) => {
    // Example confusion matrix and classes
    const classes = ['positive', 'negative', 'neutral'];
    const confusionMatrix = [
        [1, 0, 1], // positive: TP, FP for negative, FP for neutral
        [0, 2, 0], // negative: FN, TP, FN
        [0, 0, 1], // neutral: FN, FN, TP
    ];

    // Initialize metrics
    const metrics = classes.map(() => ({
        TP: 0,
        FP: 0,
        FN: 0,
        Precision: 0,
        Recall: 0,
        F1: 0,
    }));

    // Calculate metrics per class
    classes.forEach((cls, i) => {
        let TP = confusionMatrix[i][i];
        let FP = confusionMatrix.reduce((sum, row) => sum + row[i], 0) - TP; // Column sum minus TP
        let FN = confusionMatrix[i].reduce((sum, val) => sum + val, 0) - TP; // Row sum minus TP

        metrics[i].TP = TP;
        metrics[i].FP = FP;
        metrics[i].FN = FN;

        // Precision, Recall, and F1-Score
        let precision = TP / (TP + FP || 1); // Avoid division by zero
        let recall = TP / (TP + FN || 1);
        let f1 = 2 * (precision * recall) / (precision + recall || 1);

        metrics[i].Precision = precision;
        metrics[i].Recall = recall;
        metrics[i].F1 = f1;
    });

    // Calculate accuracy
    const totalCorrect = confusionMatrix.reduce((sum, row, i) => sum + row[i], 0); // Diagonal sum
    const totalPredictions = confusionMatrix.reduce(
        (sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0),
        0
    );
    const accuracy = totalCorrect / totalPredictions;

    // Print confusion matrix
    console.log('Confusion Matrix:');
    console.log('   ' + classes.join('    ')); // Header row
    confusionMatrix.forEach((row, i) => {
        console.log(`${classes[i]}: ${row.join('    ')}`);
    });

    // Print metrics per class
    console.log('\nClass Metrics:');
    metrics.forEach((metric, i) => {
        console.log(`Class "${classes[i]}":`);
        console.log(`  TP: ${metric.TP}`);
        console.log(`  FP: ${metric.FP}`);
        console.log(`  FN: ${metric.FN}`);
        console.log(`  Precision: ${metric.Precision.toFixed(4)}`);
        console.log(`  Recall: ${metric.Recall.toFixed(4)}`);
        console.log(`  F1-Score: ${metric.F1.toFixed(4)}`);
    });

    // Print overall accuracy
    console.log('\nOverall Accuracy:', accuracy.toFixed(4));
}

// exports.showScoreSmooth = async (req, res) => {
//     // Data evaluasi
//     const testData = [{
//             text: 'I really love it',
//             label: 'positive'
//         },
//         {
//             text: 'This is bad',
//             label: 'negative'
//         },
//     ];

//     const tuneNaiveBayes = (smoothingValues) => {
//         let bestAccuracy = 0;
//         let bestSmoothing = 0;

//         smoothingValues.forEach(smoothing => {
//             // Membuat model dengan smoothing tertentu
//             const classifier = new natural.BayesClassifier();
//             trainData.forEach(item => classifier.addDocument(item.text, item.label));
//             classifier.train({
//                 smoothing
//             });

//             // Evaluasi
//             let correct = 0;
//             testData.forEach(item => {
//                 if (classifier.classify(item.text) === item.label) correct++;
//             });

//             const accuracy = (correct / testData.length) * 100;
//             // console.log(Smoothing: $ {
//             //     smoothing
//             // }, Accuracy: $ {
//             //     accuracy
//             // } % );

//             if (accuracy > bestAccuracy) {
//                 bestAccuracy = accuracy;
//                 bestSmoothing = smoothing;
//             }
//         });

//         return {
//             bestSmoothing,
//             bestAccuracy
//         };
//     };

//     const smoothingValues = [0.1, 0.5, 1.0, 1.5, 2.0];
//     const result = tuneNaiveBayes(smoothingValues);
//     console.log(result);

//     // console.log('Best Smoothing:'.result.bestSmoothing
//     //     .
//     //     ', Best Accuracy: '.result.bestAccuracy
//     //     .
//     //     '%');
// }

exports.trainDataSetNew = async (req, res) => {
    try {
        let dataset = await readCSV('dataset.csv');

        // Daftar hyperparameter yang akan diuji
        const hyperparameters = [{
                maxFeatures: 500,
                stopwords: indonesianStopwords
            },
            {
                maxFeatures: 1000,
                stopwords: indonesianStopwords
            },
            {
                maxFeatures: 500,
                stopwords: []
            }, // Tanpa stopwords
            {
                maxFeatures: 1000,
                stopwords: []
            },
        ];

        let results = [];
        for (let i = 0; i < hyperparameters.length; i++) {
            const element = hyperparameters[i];

            dataset.forEach((item) => {
                let tokenizedText = tokenizer.tokenize(item.text);
                let filteredText = stopword.removeStopwords(tokenizedText, element.stopwords);
                let stemmedText = filteredText.slice(0, element.maxFeatures).map(word => stemmer.stem(word));

                classifier.addDocument(stemmedText.join(' '), item.label);
            });
            // Latih classifier
            classifier.train();
            console.log(JSON.stringify(classifier));

            // console.log(i);
            // fs.writeFileSync(
            //     `classifier-${element.maxFeatures}-${element.stopwords.length}.json`,
            //     JSON.stringify(classifier)
            // );
            // classifier.save(`classifier-${element.maxFeatures}-${element.stopwords.length}.json`, (err) => {
            //     if (err) {
            //         console.log('Error saving classifier:', err);
            //     } else {
            //         console.log('Classifier saved successfully.');
            //     }
            // });
        }
        // for (const params of hyperparameters) {

        //     // Proses dataset dengan hyperparameter saat ini
        //     dataset.forEach((item) => {
        //         let tokenizedText = tokenizer.tokenize(item.text);
        //         let filteredText = stopword.removeStopwords(tokenizedText, params.stopwords);
        //         let stemmedText = filteredText.slice(0, params.maxFeatures).map(word => stemmer.stem(word));

        //         classifier.addDocument(stemmedText.join(' '), item.label);
        //     });

        //     // Latih classifier
        //     classifier.train();

        //     // Evaluasi performa (gunakan metode validasi seperti cross-validation jika memungkinkan)
        //     // const accuracy = evaluateClassifier(classifier, dataset); // Implementasikan evaluasi Anda

        //     // results.push({
        //     //     params,
        //     //     accuracy,
        //     // });

        //     // // Simpan classifier dengan parameter saat ini jika diperlukan
        //     classifier.save('classifier-'+params.maxFeatures+'.json', (err) => {
        //         if (err) {
        //             console.error('Error saving classifier:', err);
        //         } else {
        //             console.log('Classifier saved successfully.');
        //         }
        //     });
        // }

        // // Cari kombinasi hyperparameter terbaik
        // const bestResult = results.sort((a, b) => b.accuracy - a.accuracy)[0];

        // return res.status(200).json({
        //     server: process.env.SERVER_TYPE,
        //     code: 200,
        //     message: 'train data success',
        //     // bestHyperparameters: bestResult.params,
        //     // bestAccuracy: bestResult.accuracy,
        // });
    } catch (error) {

        res.status(404).json({
            server: process.env.SERVER_TYPE,
            code: 404,
            data: 'failure',
        });
    }
};

// Fungsi Evaluasi Akurasi
function evaluateClassifier(classifier, dataset) {
    let correct = 0;
    dataset.forEach((item) => {
        let tokenizedText = tokenizer.tokenize(item.text);
        let filteredText = stopword.removeStopwords(tokenizedText, indonesianStopwords);
        let stemmedText = filteredText.map(word => stemmer.stem(word));
        const predicted = classifier.classify(stemmedText.join(' '));
        if (predicted === item.label) correct++;
    });
    return correct / dataset.length;
}

// Fungsi untuk mengonversi nilai Sentiment
function mapSentiment(value) {
    if (value === '1') return 'positive';
    if (value === '0') return 'neutral';
    if (value === '-1') return 'negative';
    return value; // Untuk nilai yang tidak dikenal
}
exports.mergeDataset = (req, res) => {
    const inputFile = './Indonesian Sentiment Twitter Dataset Labeled.csv';
    const outputFile = './netural_dataset.csv';

    const formattedData = [];
    let idCounter = 1;

    fs.createReadStream(inputFile)
        .pipe(csv())
        .on('data', (row) => {
            try {
                let dataRow = row['sentimen\tTweet'].split('\t')

                if (dataRow[0] == 0) {
                    formattedData.push({
                        Id: idCounter++,
                        Sentiment: mapSentiment(dataRow[0]),
                        Text: dataRow[1],
                    });
                }

            } catch (err) {
                console.error('Error processing row:', row, err);
            }
        })
        .on('end', () => {
            console.log('CSV file successfully processed.');

            // Konversi data ke format CSV
            const fields = ['Id', 'Sentiment', 'Text'];
            const opts = {
                fields
            };

            try {
                const csvData = parse(formattedData, opts);
                fs.writeFileSync(outputFile, csvData);
                console.log(`Formatted dataset saved to ${outputFile}`);
            } catch (err) {
                console.error('Error converting to CSV:', err);
            }
        });
}
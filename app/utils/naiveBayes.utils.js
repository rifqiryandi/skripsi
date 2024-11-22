let m_try = require('../model/try.model');

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
const indonesianStopwords = JSON.parse(fs.readFileSync('stopword-id.json', 'utf8'));

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
                    text: row['Text Tweet']
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
        let dataset = await readCSV('dataset.csv')
        dataset.forEach((item) => {
            // Tokenisasi (memecah kalimat menjadi kata-kata)
            let tokenizedText = tokenizer.tokenize(item.text);

            // Penghilangan stopword
            let filteredText = stopword.removeStopwords(tokenizedText, indonesianStopwords);

            // Stemming (mengubah kata-kata menjadi bentuk dasar)
            let stemmedText = filteredText.map(word => stemmer.stem(word));

            // Tambahkan dokumen ke classifier dengan teks yang telah diproses dan label
            classifier.addDocument(stemmedText.join(' '), item.label);
        });
        // Latih classifier
        classifier.train();
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
            'message': 'train data success'
        })
    } catch (error) {
        res.status(404).json({
            'server': process.env.SERVER_TYPE,
            'code': 404,
            'data': 'failure'
        })
    }
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

exports.showScore = async (req, res) => {
    const trainedModel = JSON.parse(fs.readFileSync('classifier-id.json', 'utf8'));
    const classifier = natural.BayesClassifier.restore(trainedModel);
    const k = 5; // Jumlah fold

    // Data yang digunakan
    const dataset = [{
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
            text: 'Pengiriman sangat lambat dan tidak memuaskan',
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
            text: 'Harga terlalu mahal dan kualitas tidak sesuai',
            label: 'negative'
        },
        {
            text: 'Pelayanan customer service sangat mengecewakan',
            label: 'negative'
        },
        {
            text: 'Proses pengiriman sangat lambat',
            label: 'negative'
        },
        {
            text: 'Aplikasi tidak user-friendly dan sering crash',
            label: 'negative'
        },
        {
            text: 'Tidak ada informasi yang jelas mengenai status pengiriman',
            label: 'negative'
        },
        {
            text: 'Staf pelayanan sangat lambat dan tidak responsif',
            label: 'negative'
        },
        {
            text: 'Proses pengembalian uang sangat lama',
            label: 'negative'
        },
        {
            text: 'Sangat kecewa dengan pelayanan yang diberikan',
            label: 'negative'
        },
        {
            text: 'Kualitas layanan sangat tidak memuaskan',
            label: 'negative'
        },
        {
            text: 'Pelayanan cepat, staf ramah',
            label: 'positive'
        },
        {
            text: 'Proses pengiriman lancar tanpa hambatan',
            label: 'positive'
        },
        {
            text: 'Pelayanan aplikasi sangat memudahkan',
            label: 'positive'
        },
        {
            text: 'Proses tracking sangat akurat dan real-time',
            label: 'positive'
        },
        {
            text: 'Harga layanan sangat kompetitif dan terjangkau',
            label: 'positive'
        },
        {
            text: 'Sangat puas dengan kualitas layanan',
            label: 'positive'
        },
        {
            text: 'Staf sangat ramah dan membantu',
            label: 'positive'
        },
        {
            text: 'Proses pengiriman barang sangat cepat dan aman',
            label: 'positive'
        }
    ];

    try {
        const foldSize = Math.floor(dataset.length / k);
        let totalAccuracy = 0;
        let totalF1 = 0;
        let totalPrecision = 0;
        let totalRecall = 0;

        for (let i = 0; i < k; i++) {
            const testingData = dataset.slice(i * foldSize, (i + 1) * foldSize);

            let correctPredictions = 0;
            let positiveTrue = 0;
            let positiveFalse = 0;
            let negativeTrue = 0;
            let negativeFalse = 0;

            testingData.forEach((data) => {
                const predictedLabel = classifier.classify(data.text);
                if (predictedLabel === data.label) {
                    correctPredictions++;
                }

                // Hitung precision dan recall untuk F1-score
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

            const accuracy = (correctPredictions / testingData.length) * 100;
            totalAccuracy += accuracy;

            // Precision, Recall, dan F1-Score
            const precisionPositive = positiveTrue / (positiveTrue + positiveFalse) || 0;
            const recallPositive = positiveTrue / (positiveTrue + negativeFalse) || 0;
            const f1Positive = 2 * ((precisionPositive * recallPositive) / (precisionPositive + recallPositive)) || 0;

            totalF1 += f1Positive;
            totalPrecision += precisionPositive;
            totalRecall += recallPositive;

            // Log Precision, Recall, dan F1 per fold
            // console.log(`Fold ${i + 1} - Precision: ${precisionPositive}, Recall: ${recallPositive}, F1-Score: ${f1Positive}`);
        }

        // Rata-rata akurasi, precision, recall, dan F1-score
        const averageAccuracy = totalAccuracy / k;
        const averageF1 = (totalF1 / k) * 100;
        const averagePrecision = (totalPrecision / k) * 100;
        const averageRecall = (totalRecall / k) * 100;

        console.log(`Rata-rata Akurasi: ${averageAccuracy.toFixed(2)}%`);
        console.log(`Rata-rata Precision: ${averagePrecision.toFixed(2)}%`);
        console.log(`Rata-rata Recall: ${averageRecall.toFixed(2)}%`);
        console.log(`Rata-rata F1-Score: ${averageF1.toFixed(2)}%`);

    } catch (error) {
        res.status(404).json({
            'server': process.env.SERVER_TYPE,
            'code': 404,
            'data': 'failure'
        })
    }
}
const express = require("express");
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();
const timeout = require('connect-timeout');
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(timeout('60m'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(morgan('dev'));
app.use(cors());
app.get("/", (req, res) => {
    res.json({
        id: "200",
        message: "WELCOME TO SKRIPSI API"
    });
});
require('./app/routes/transaction.routes')(app);
require('./app/routes/nps.routes')(app);
require('./app/routes/sentimentReport.routes')(app);
require('./app/routes/kantor.routes')(app);



// set port, listen for requests
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
})
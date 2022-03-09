const express = require('express');
var cors = require('cors');
var path = require('path');
var multer = require('multer');
var upload = multer();
var bodyParser = require("body-parser");

const app = express();


app.use(bodyParser.json()); 
app.use(express.json()); 
app.use(cors());
const { getCompundingToken } = require('./apis/compoundingService');
// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); 

// for parsing multipart/form-data
app.use(upload.array()); 

app.use(express.static(path.join(__dirname, 'public')));

// Define Routes

app.listen(() => {
    console.log(`Start`);
    getCompundingToken()
});
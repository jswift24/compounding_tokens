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

// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); 

// for parsing multipart/form-data
app.use(upload.array()); 

app.use(express.static(path.join(__dirname, 'public')));

// Define Routes

//Top 100 ETH
app.use('/', require('./routes/compundingRouter'));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
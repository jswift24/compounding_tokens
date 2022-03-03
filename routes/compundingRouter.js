const express = require('express');
const router = express.Router();
const { getCompundingToken } = require('../apis/compundingService');

router.get('/', async (req, res) => {
    try {
        getCompundingToken()
        .then((data) =>{
            res.json(data);
        })
        .catch(err => {
            console.error(err.message);
            res.status(500).send('Server Error');
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
})


module.exports = router;

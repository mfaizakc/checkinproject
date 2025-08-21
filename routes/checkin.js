const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db/db');

const router = express.Router();

// Home page - shows a button to generate QR
router.get('/', (req, res) => {
  res.render('index');
});


module.exports = router;
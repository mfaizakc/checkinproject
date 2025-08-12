const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db/db');

const router = express.Router();

// Home page - shows a button to generate QR
router.get('/', (req, res) => {
  res.render('index');
});

// Generate a QR page (creates a pending token row)
router.get('/generate', async (req, res) => {
  try {
    const token = uuidv4();

    // Simulated user - replace with real Singpass identity after integration
    const userId = 'SIMULATED_USER';


  // Use PC's LAN IP for QR code URL so it can be accessed from other devices on the network
  const qrUrl = `${req.protocol}://10.64.21.111/scan?token=${token}`;
  const qrData = await QRCode.toDataURL(qrUrl);

  res.render('qr', { qrData, token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating QR');
  }
});

// GET scan landing page - captures location client-side
router.get('/scan', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Missing token');
  res.render('location', { token });
});

// POST scan - receives token + lat/lng and marks token used
router.post('/scan', async (req, res) => {
  try {
    const { token, latitude, longitude } = req.body;
    if (!token) return res.status(400).send('Missing token');

    const pool = await db.pool;
    // Simulated user - replace with real Singpass identity after integration
    const userId = 'SIMULATED_USER';

    // Insert the check-in event only when user checks in
    await pool.request()
      .input('userId', db.sql.NVarChar, userId)
      .input('token', db.sql.NVarChar, token)
      .input('lat', db.sql.Float, latitude)
      .input('lng', db.sql.Float, longitude)
      .query(`INSERT INTO CheckinEvents (UserId, Token, Type, Status, Latitude, Longitude) VALUES (@userId, @token, 'check-in', 'used', @lat, @lng)`);

    res.send('Check-in recorded. Thank you!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
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
    const pool = await db.pool;
    // Set expiry to 2 minutes from now
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    // Store the token in CheckinTokens table
    await pool.request()
      .input('token', db.sql.NVarChar, token)
      .input('expiresAt', db.sql.DateTime, expiresAt)
      .query('INSERT INTO CheckinTokens (Token, ExpiresAt) VALUES (@token, @expiresAt)');

    // Generate QR code for the new flow
    const qrUrl = `${req.protocol}://10.64.21.111/checkin/start?token=${token}`;
    const qrData = await QRCode.toDataURL(qrUrl);

    res.render('qr', { qrData, token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating QR');
  }
});

// Start check-in: validate token and redirect to Singpass
router.get('/checkin/start', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Missing token');
  try {
    const pool = await db.pool;
    const result = await pool.request()
      .input('token', db.sql.NVarChar, token)
      .query('SELECT TOP 1 * FROM CheckinTokens WHERE Token = @token AND Used = 0 AND ExpiresAt > GETDATE()');
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(400).send('Invalid or expired QR code.');
    }
    // In production, redirect to Singpass OIDC login with state=token
    // For now, just simulate by redirecting to Singpass login page
    res.redirect('https://www.singpass.gov.sg/home/ui/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
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
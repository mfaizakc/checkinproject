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
    // Set expiry in SQL using GETUTCDATE() + 5 minutes
    console.log('DEBUG: Generating token', token, 'expires at (UTC) will be set by SQL');
    await pool.request()
      .input('token', db.sql.NVarChar, token)
      .query('INSERT INTO CheckinTokens (Token, ExpiresAt) VALUES (@token, DATEADD(minute, 5, DATEADD(hour, 8, GETUTCDATE())))');
    //   .query('INSERT INTO CheckinTokens (Token, ExpiresAt) VALUES (@token, DATEADD(minute, 5, GETUTCDATE()))');
    console.log('DEBUG: Token inserted successfully');

    // Generate QR code for the new flow - include port 4000
    const qrUrl = `${req.protocol}://10.64.21.111:4000/checkin/start?token=${token}`;
    const qrData = await QRCode.toDataURL(qrUrl);

    res.render('qr', { qrData, token });
  } catch (err) {
    console.error('DEBUG: Error in /generate:', err);
    res.status(500).send('Error generating QR: ' + err.message);
  }
});

// Start check-in: validate token and redirect to Singpass
router.get('/checkin/start', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Missing token');
  try {
    const pool = await db.pool;
    console.log('DEBUG: Checking token', token);
    const result = await pool.request()
      .input('token', db.sql.NVarChar, token)
      .query('SELECT TOP 1 * FROM CheckinTokens WHERE Token = @token AND Used = 0 AND ExpiresAt > GETDATE()');
    console.log('DEBUG: Query result', result.recordset);
    if (!result.recordset || result.recordset.length === 0) {
      // Extra debug: check if token exists at all
      const exists = await pool.request()
        .input('token', db.sql.NVarChar, token)
        .query('SELECT TOP 1 * FROM CheckinTokens WHERE Token = @token');
      console.log('DEBUG: Token exists at all?', exists.recordset);
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


// After Singpass OIDC callback, render location page to collect GPS
router.get('/checkin/callback', async (req, res) => {
  // In production, extract user info from OIDC id_token
  // For now, just get token from state param
  const token = req.query.state;
  if (!token) return res.status(400).send('Missing token');
  res.render('location', { token });
});

// POST: Complete check-in after location is collected
router.post('/checkin/complete', async (req, res) => {
  try {
    const { token, latitude, longitude } = req.body;
    if (!token) return res.status(400).send('Missing token');

    const pool = await db.pool;
    // TODO: Replace with real Singpass user info from session
    const userId = 'SIMULATED_USER';

    // Mark token as used
    await pool.request()
      .input('token', db.sql.NVarChar, token)
      .query('UPDATE CheckinTokens SET Used = 1 WHERE Token = @token');

    // Insert the check-in event
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
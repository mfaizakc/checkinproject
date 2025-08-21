const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db/db');

const router = express.Router();

// Home page - shows a button to generate QR
router.get('/', (req, res) => {
  res.render('index');
});


// Start check-in: validate token and redirect to Singpass
// router.get('/checkin/start', async (req, res) => {
//   const token = req.query.token;
//   if (!token) return res.status(400).send('Missing token');
//   try {
//     const pool = await db.pool;
//     console.log('DEBUG: Checking token', token);
//     const result = await pool.request()
//       .input('token', db.sql.NVarChar, token)
//       .query('SELECT TOP 1 * FROM CheckinTokens WHERE Token = @token AND Used = 0 AND ExpiresAt > GETDATE()');
//     console.log('DEBUG: Query result', result.recordset);
//     if (!result.recordset || result.recordset.length === 0) {
//       // Extra debug: check if token exists at all
//       const exists = await pool.request()
//         .input('token', db.sql.NVarChar, token)
//         .query('SELECT TOP 1 * FROM CheckinTokens WHERE Token = @token');
//       console.log('DEBUG: Token exists at all?', exists.recordset);
//       return res.status(400).send('Invalid or expired QR code.');
//     }

//     // Redirect to Singpass OIDC login with state=token
//     const CLIENT_ID = process.env.SINGPASS_CLIENT_ID;
//     const REDIRECT_URI = process.env.SINGPASS_REDIRECT_URI;
//     const AUTH_URL = process.env.SINGPASS_AUTH_URL || 'https://stg-id.singpass.gov.sg/v2/authorize';

//     const params = new URLSearchParams({
//       response_type: 'code',
//       client_id: CLIENT_ID,
//       redirect_uri: REDIRECT_URI,
//       scope: 'openid profile',
//       state: token // Use token as state to link check-in
//     });

//     res.redirect(`${AUTH_URL}?${params.toString()}`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });


// // POST: Complete check-in after location is collected
// router.post('/checkin/complete', async (req, res) => {
//   try {
//     const { token, latitude, longitude } = req.body;
//     if (!token) return res.status(400).send('Missing token');

//     const pool = await db.pool;
//     // TODO: Replace with real Singpass user info from session
//     const userId = 'SIMULATED_USER';

//     // Mark token as used
//     await pool.request()
//       .input('token', db.sql.NVarChar, token)
//       .query('UPDATE CheckinTokens SET Used = 1 WHERE Token = @token');

//     // Insert the check-in event
//     await pool.request()
//       .input('userId', db.sql.NVarChar, userId)
//       .input('token', db.sql.NVarChar, token)
//       .input('lat', db.sql.Float, latitude)
//       .input('lng', db.sql.Float, longitude)
//       .query(`INSERT INTO CheckinEvents (UserId, Token, Type, Status, Latitude, Longitude) VALUES (@userId, @token, 'check-in', 'used', @lat, @lng)`);

//     res.send('Check-in recorded. Thank you!');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

module.exports = router;
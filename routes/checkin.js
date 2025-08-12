const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db/db');
const router = express.Router();

// Home page to generate QR
router.get('/', async (req, res) => {
    const token = uuidv4();

    // Simulate a user (replace with Singpass login later)
    const userId = 'user123';

    const pool = await db.pool;
    await pool.request()
        .input('userId', db.sql.NVarChar, userId)
        .input('token', db.sql.NVarChar, token)
        .query(`INSERT INTO CheckinEvents (UserId, Token, Type) VALUES (@userId, @token, 'check-in')`);

    const qrUrl = `http://localhost:3000/scan?token=${token}`;
    const qrData = await QRCode.toDataURL(qrUrl);

    res.render('qr', { qrData });
});

// Scan route (simulate Singpass login)
router.get('/scan', async (req, res) => {
    const token = req.query.token;

    const pool = await db.pool;
    const result = await pool.request()
        .input('token', db.sql.NVarChar, token)
        .query('SELECT * FROM CheckinEvents WHERE Token = @token AND Status = \'active\'');

    if (result.recordset.length === 0) {
        return res.send('Invalid or expired token.');
    }

    // Simulate mark as used
    await pool.request()
        .input('token', db.sql.NVarChar, token)
        .query('UPDATE CheckinEvents SET Status = \'used\' WHERE Token = @token');

    res.send('Check-in recorded successfully.');
});

module.exports = router;

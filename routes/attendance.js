const express = require('express');
const db = require('../db/db');
const router = express.Router();

function getSingaporeTimeISO() {
  const now = new Date();

  // Get UTC+8 time by adding 8 hours in milliseconds
  const sgOffset = 8 * 60 * 60 * 1000;
  const sgTime = new Date(now.getTime() + sgOffset);

  // Format to ISO string without the "Z"
  return sgTime.toISOString().replace('Z', '+08:00');
}

// Attendance page (table view)
router.get('/attendance', (req, res) => {
  res.render('attendance');
});

// Attendance data API (for AJAX table)
router.get('/attendance/data', async (req, res) => {
  const { search, start, end, location } = req.query;
  let query = 'SELECT CheckinEvents.*, Staff.Fullname, Staff.Department FROM CheckinEvents INNER JOIN Staff ON CheckinEvents.NRIC = Staff.NRIC WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (NRIC LIKE @search OR Name LIKE @search)';
    params.push({ name: 'search', type: db.sql.NVarChar(50), value: `%${search}%` });
  }
  if (location) {
    query += ' AND Location = @location';
    params.push({ name: 'location', type: db.sql.NVarChar(50), value: location });
  }
  if (start) {
    query += ' AND Timestamp >= @start';
    params.push({ name: 'start', type: db.sql.DateTime, value: new Date(start) });
  } else {
    // Always get today's date in Singapore time for each request
    const dateOnly = getSingaporeTimeISO().split('T')[0];
    query += ' AND Timestamp >= @start';
    params.push({ name: 'start', type: db.sql.DateTime, value: dateOnly });
  }
  if (end) {
    // Add 1 day to end date to include the whole day
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    query += ' AND Timestamp < @end';
    params.push({ name: 'end', type: db.sql.DateTime, value: endDate });
  }
  query += ' ORDER BY Timestamp DESC';
  try {
    const pool = await db.pool;
    let request = pool.request();
    params.forEach(p => request = request.input(p.name, p.type, p.value));
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Failed to fetch attendance data:', err);
    res.status(500).json([]);
  }
});

module.exports = router;
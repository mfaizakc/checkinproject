const express = require('express');
const db = require('../db/db');
const router = express.Router();
const session = require('express-session');
const flash = require('connect-flash');
const checkLogined = (req, res, next) => {
  if (req.session.user) {
    return next();
  } else {
    req.flash('error', 'Please Login');
    res.redirect('/loginPage');
  }
};

router.get('/loginPage', (req, res) => {
  res.render('login', { error: req.flash('error') });
});

router.get('/login',  async (req, res) => {
const { username, password } = req.query;
if (!username || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/loginPage');
}

// Sample user data (replace with DB lookup in production)
const sampleUsers = [
  { username: 'admin', password: 'admin123' },
  { username: 'user', password: 'user123'}
];
const foundUser = sampleUsers.find(u => u.username === username && u.password === password);
if (!foundUser) {
  req.flash('error', 'Invalid username or password.');
  return res.redirect('/loginPage');
}

// Set session user
req.session.user = {
  username: foundUser.username,
  nric: foundUser.nric,
};
req.flash('success', 'Login successful!');
return res.redirect('/attendance');
});
// LOGOUT ENDPOINT
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      req.flash('error', 'Logout failed.');
      return res.redirect('/files');
    }
    res.clearCookie('connect.sid');
    res.redirect('/loginPage');
  });
});

function getSingaporeTimeISO() {
  const now = new Date();

  // Get UTC+8 time by adding 8 hours in milliseconds
  const sgOffset = 8 * 60 * 60 * 1000;
  const sgTime = new Date(now.getTime() + sgOffset);

  // Format to ISO string without the "Z"
  return sgTime.toISOString().replace('Z', '+08:00');
}

// Attendance page (table view)
router.get('/attendance',checkLogined, (req, res) => {
  res.render('attendance');
});

// Attendance data API (for AJAX table)
router.get('/attendance/data', async (req, res) => {
  const { search, start, end, location } = req.query;
  let query = 'SELECT CheckinEvents.*, Staff.Fullname, Staff.Department FROM CheckinEvents INNER JOIN Staff ON CheckinEvents.NRIC = Staff.NRIC WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (CheckinEvents.NRIC LIKE @search OR Staff.Fullname LIKE @search OR Staff.Department LIKE @search)';
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


// Add Staff page (GET) - show all staff
router.get('/add-staff', checkLogined, async (req, res) => {
  try {
    const pool = await db.pool;
    const result = await pool.request().query('SELECT NRIC, Fullname, Department, [Mon-Fri] FROM Staff ORDER BY Fullname');
    res.render('add-staff', {
      error: req.flash('error'),
      success: req.flash('success'),
      staffList: result.recordset
    });
  } catch (err) {
    res.render('add-staff', {
      error: ['Failed to load staff list.'],
      success: [],
      staffList: []
    });
  }
});

// Add Staff handler (POST)
router.post('/add-staff', checkLogined, async (req, res) => {
  const { nric, fullname, department, monfri } = req.body;
  if (!nric || !fullname || !department) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/add-staff');
  }
  try {
    const pool = await db.pool;
    await pool.request()
      .input('NRIC', db.sql.NVarChar(10), nric)
      .input('Fullname', db.sql.NVarChar(100), fullname)
      .input('Department', db.sql.NVarChar(50), department)
      .input('MonFri', db.sql.Bit, monfri ? 1 : 0)
      .query('INSERT INTO Staff (NRIC, Fullname, Department, [Mon-Fri]) VALUES (@NRIC, @Fullname, @Department, @MonFri)');
    req.flash('success', 'Staff added successfully!');
    return res.redirect('/add-staff');
  } catch (err) {
    if (err && err.originalError && err.originalError.info && err.originalError.info.number === 2627) {
      req.flash('error', 'NRIC already exists.');
    } else {
      req.flash('error', 'Failed to add staff.');
    }
    return res.redirect('/add-staff');
  }
});

module.exports = router;
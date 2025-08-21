const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const checkinRoutes = require('./routes/checkin');
const authRoutes = require('./routes/auth');

const app = express();
const session = require('express-session');
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: 'your-very-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // true if HTTPS
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true
  }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', checkinRoutes);
app.use('/', authRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
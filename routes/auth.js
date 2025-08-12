const express = require('express');
const axios = require('axios');
const qs = require('qs');
const db = require('../db/db');

const router = express.Router();

// Configure these via environment variables
const CLIENT_ID = process.env.SINGPASS_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.SINGPASS_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = process.env.SINGPASS_REDIRECT_URI || 'http://localhost:4000/auth/callback';
// The authorization and token endpoints differ between providers and environment (sandbox/prod)
const AUTH_URL = process.env.SINGPASS_AUTH_URL || 'https://sandbox-login.example.gov.sg/authorize';
const TOKEN_URL = process.env.SINGPASS_TOKEN_URL || 'https://sandbox-login.example.gov.sg/token';
const USERINFO_URL = process.env.SINGPASS_USERINFO_URL || 'https://sandbox-login.example.gov.sg/userinfo';

// Step 1: redirect user to Singpass for login
router.get('/login', (req, res) => {
  const state = Math.random().toString(36).slice(2); // simple state
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile',
    state
  });
});

  res.redirect(`${AUTH_URL}?$
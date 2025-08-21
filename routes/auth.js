const express = require('express');
const axios = require('axios');
const qs = require('qs');
const db = require('../db/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jose = require('node-jose');

// Load ES256 private key for JWT client_assertion
const privateKey = fs.readFileSync(path.join(__dirname, '../signing-private.pem'), 'utf8');
const encryptionKey = fs.readFileSync(path.join(__dirname, '../encryption-private.pem'), 'utf8');
// Configure these via environment variables
const CLIENT_ID = process.env.SINGPASS_CLIENT_ID || 'sDRIq83pbDFJyJHrd7hIBtEX51RPVDbE';
const REDIRECT_URI = process.env.SINGPASS_REDIRECT_URI || 'https://staffattendance.sg-akc.com/callback';

const AUTH_URL = process.env.SINGPASS_AUTH_URL || 'https://stg-id.singpass.gov.sg/auth';
const TOKEN_URL = process.env.SINGPASS_TOKEN_URL || 'https://stg-id.singpass.gov.sg/token';
const USERINFO_URL = process.env.SINGPASS_USERINFO_URL || 'https://stg-id.singpass.gov.sg/userinfo';

// Redirect page: when user clicks the button, go here, then redirect to Singpass login
router.get('/redirect', (req, res) => {
  const CLIENT_ID = process.env.SINGPASS_CLIENT_ID || 'sDRIq83pbDFJyJHrd7hIBtEX51RPVDbE';
  const REDIRECT_URI = process.env.SINGPASS_REDIRECT_URI || 'https://staffattendance.sg-akc.com/callback';
  const AUTH_URL = process.env.SINGPASS_AUTH_URL || 'https://stg-id.singpass.gov.sg/auth';

  // Generate PKCE and state
  function base64url(input) {
    return input.toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const nonce = uuidv4();
  const state = crypto.randomBytes(16).toString('hex');
  req.session.auth = { codeVerifier, codeChallenge, nonce, state };
  console.log('--- /redirect called ---');
  console.log('Generated PKCE and state:', req.session.auth);

  const params = new URLSearchParams({
    scope: 'openid',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    nonce,
    client_id: CLIENT_ID,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  if (req.query.redirect_uri_https_type === 'app_claimed_https') {
    params.append('redirect_uri_https_type', 'app_claimed_https');
  }

  const redirectUrl = `${AUTH_URL}?${params.toString()}`;
  // Log the full redirect URL and all parameters for debugging
  console.log('Redirect URL:', redirectUrl);
  console.log('Authorization request parameters:', {
    scope: 'openid',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    nonce,
    client_id: CLIENT_ID,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  res.redirect(redirectUrl);
});

//$ http GET 'https://stg-id.singpass.gov.sg/auth?scope=openid&response_type=code&redirect_uri=https%3A%2F%2Fpartner.gov.sg%2Fredirect&nonce=bb5e1672-a460-4a9b-874e-c38d55ac3922&client_id=T5sM5a53Yaw3URyDEv2y9129CbElCN2F&state=dGVzdCBzdHJpbmcK&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'

// Step 2: Singpass redirects back to your app with a code
router.get('/callback', async (req, res) => {
  try {
    const receivedQueryParams = req.query;
    console.log('--- /callback called ---');
    console.log('Received query params:', receivedQueryParams);
    // Retrieve PKCE and state from session.auth
    if (!req.session.auth) {
      console.log('No session PKCE/state found. Restarting flow.');
      return res.status(440).send('Session expired or invalid. Please <a href="/redirect">start again</a>.');
    }
    const { codeVerifier, nonce, state } = req.session.auth;
    console.log('Session PKCE and state:', { codeVerifier, nonce, state });
    const CLIENT_ID = process.env.SINGPASS_CLIENT_ID || 'sDRIq83pbDFJyJHrd7hIBtEX51RPVDbE';
    const REDIRECT_URI = process.env.SINGPASS_REDIRECT_URI || 'https://staffattendance.sg-akc.com/callback';
    console.log('CLIENT_ID:', CLIENT_ID);
    console.log('REDIRECT_URI:', REDIRECT_URI);

    // Verify state matches
    if (receivedQueryParams.state !== state) {
      console.log('Invalid state:', receivedQueryParams.state);
      console.log('Expected state:', state);
      return res.status(403).send('Invalid state. Please <a href="/redirect">try again</a>.');
    }

    // Exchange code for access token
    if (!codeVerifier) {
      console.log('Missing codeVerifier in session. Restarting flow.');
      return res.status(440).send('Session missing PKCE. Please <a href="/redirect">start again</a>.');
    }
    const payload = {
      iss: CLIENT_ID,
      sub: CLIENT_ID,
      aud: TOKEN_URL,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
    }

    const header = {
      alg: 'ES256',
      typ: 'JWT',
      kid: "sig-staffATT-2025"
    }


    const client_assertion = jwt.sign(payload, privateKey, { header });

    const tokenPayload = {
      grant_type: 'authorization_code',
      code: receivedQueryParams.code,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: client_assertion,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier
    };
    console.log('Token request payload:', tokenPayload);
    let tokenResponse;
    try {
      tokenResponse = await axios.post(TOKEN_URL, qs.stringify(tokenPayload), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    } catch (tokenErr) {
      console.error('Token endpoint error:', tokenErr);
      if (tokenErr.response) {
        console.error('Token error response data:', tokenErr.response.data);
        return res.status(400).send('Token exchange failed: ' + JSON.stringify(tokenErr.response.data));
      }
      return res.status(500).send('Token exchange failed.');
    }
    console.log('Token response data:', tokenResponse.data);

    const accessToken = tokenResponse.data.access_token;
    const idToken = tokenResponse.data.id_token;
    if (!accessToken) {
      console.log('No access token in response.');
      return res.status(400).send('No access token received.');
    }
    console.log('Access token:', accessToken);

    async function decryptJWE() {
      // Create a keystore and import the private key
      const keystore = jose.JWK.createKeyStore();
      const key = await keystore.add(encryptionKey, 'pem');

      // Decrypt the JWE
      const result = await jose.JWE.createDecrypt(key).decrypt(idToken);

      // Convert payload to string
      const payload = result.payload.toString('utf8');

      console.log('Header:', result.header);
      console.log('Payload:', payload);
      return payload;
    }


    // Decode JWT access token (without verifying signature) for inspection
    let accessTokenPayload = null;
    const jwtString = await decryptJWE();
    try {
      const parts = jwtString.split('.');
      if (parts.length === 3) {
        accessTokenPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        console.log('Decoded id token payload:', accessTokenPayload);
        // Extract NRIC (s=...) from sub
        if (accessTokenPayload.sub) {
          const nricMatch = accessTokenPayload.sub.match(/s=([^,]+)/);
          const uuidMatch = accessTokenPayload.sub.match(/u=([^,]+)/);
          let nric = null;
          let uuid = null;
          if (nricMatch) {
            nric = nricMatch[1];
            console.log('Extracted NRIC:', nric);
          } else {
            console.log('No NRIC found in sub.');
          }
          if (uuidMatch) {
            uuid = uuidMatch[1];
            console.log('Extracted UUID:', uuid);
          }
          // Add this:
          req.session.user = { nric, uuid };

        }
      } else {
        console.log('ID token is not a JWT.');
      }
    } catch (e) {
      console.log('Failed to decode ID token:', e);
    }
    // Redirect to success page after authentication
    return res.redirect('/singpass-success.html');

  } catch (error) {
    console.error('Error during authentication', error);
    res.status(500).send('Authentication error');
  }
});

router.post('/checkin/location', async (req, res) => {
  const { latitude, longitude } = req.body;
  const user = req.session.user; // or however you store the authenticated user
  if (!user || !user.nric) {
    return res.status(401).send('Not authenticated');
  }
  try {
    const pool = await db.pool;
    // Check if user has checked in within the last hour
    const checkResult = await pool.request()
      .input('NRIC', db.sql.NVarChar(20), user.nric)
      .query(`
        SELECT TOP 1 Timestamp 
        FROM CheckinEvents 
        WHERE NRIC = @NRIC 
          AND Timestamp > DATEADD(hour, -1, GETDATE())
        ORDER BY Timestamp DESC
      `);

    if (checkResult.recordset.length > 0) {
      console.log(`User ${user.nric} has already checked in within the last hour.`);
      return res.status(200).send('Already checked in within the last hour.');
    } else {
      await pool.request()
        .input('NRIC', db.sql.NVarChar(20), user.nric)
        .input('UUID', db.sql.NVarChar(50), user.uuid)
        .input('Latitude', db.sql.Float, latitude)
        .input('Longitude', db.sql.Float, longitude)
        .query('INSERT INTO CheckinEvents (NRIC, UUID, Latitude, Longitude) VALUES (@NRIC, @UUID, @Latitude, @Longitude)');
      console.log('Check-in event inserted for NRIC:', user.nric, 'Latitude:', latitude, 'Longitude:', longitude);
      return res.status(200).send('Check-in event inserted.');
    }
  } catch (err) {
    console.error('Failed to save location:', err);
    res.status(500).send('Failed to save location');
  }
});


module.exports = router;
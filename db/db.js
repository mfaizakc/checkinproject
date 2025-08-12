
const sql = require('mssql');

const config = {
  server: '10.64.2.18',
  authentication: {
    type: 'default',
    options: {
      userName: 'akcAutomation',
      password: 'SingaporeAKC1*'
    }
  },
  options: {
    database: 'CheckInDB',
    encrypt: false,
    trustServerCertificate: true
  }
};

const poolPromise = sql.connect(config);

module.exports = {
  pool: poolPromise,
  sql
};

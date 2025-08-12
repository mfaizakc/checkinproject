const sql = require('mssql');

const config = {
    user: 'your_user',
    password: 'your_password',
    server: 'localhost', // or your server name
    database: 'YourDatabase',
    options: {
        trustServerCertificate: true,
    },
};

module.exports = {
    pool: new sql.ConnectionPool(config).connect(),
    sql
};

////////////DATABASE///////////
const Checklist_DB = {
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

module.exports = Checklist_DB;

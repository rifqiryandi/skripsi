const knex = require('knex')({
    // client: 'mysql',
    // connection: {
    //   host: process.env.DB_HOST,
    //   port: 3306,
    //   user: process.env.DB_USER,
    //   password: process.env.DB_PASSWORD,
    //   database: process.env.DB_DATABASE
    // }
    client: 'mssql',
    connection: {
        host: '10.27.0.251',
        port: 1433,
        user: 'sa',
        password: 'm3led4k3x_',
        database: 'NPS'
    }
  })

  
  
  module.exports = { knex }
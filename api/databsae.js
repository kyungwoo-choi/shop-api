'use strict';
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    connectionLimit: config.database.connectionLimit
});

pool.on('acquire', function(connection) {
    console.log(`acquire thread ID : ${connection.threadId}`)
});

pool.on('release', function(connection) {
    console.log(`release thread ID : ${connection.threadId}`)
});

module.exports = pool;

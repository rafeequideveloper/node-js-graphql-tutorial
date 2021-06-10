const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'posts',
    password: 'Mysql@123'
});

module.exports = pool.promise();
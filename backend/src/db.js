const mysql = require('mysql2/promise');

const useCloudDatabase = process.env.DB_MODE === 'cloud';

const databaseConfig = useCloudDatabase
  ? {
      host: process.env.CLOUD_DB_HOST,
      port: Number(process.env.CLOUD_DB_PORT || 3306),
      user: process.env.CLOUD_DB_USER,
      password: process.env.CLOUD_DB_PASSWORD,
      database: process.env.CLOUD_DB_NAME,
      ssl: {}
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'psm_db'
    };

const db = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

module.exports = db;
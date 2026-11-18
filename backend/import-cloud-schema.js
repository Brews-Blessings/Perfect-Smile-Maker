
require('dotenv').config({
    path: require('path').join(__dirname, '.env.cloud-test')
});

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importCloudSchema() {
    let connection;

    try {
        const sqlFile = path.join(
            process.env.USERPROFILE,
            'Documents',
            'psm_cloud_schema_import.sql'
        );

        if (!fs.existsSync(sqlFile)) {
            throw new Error('Schema file not found: ' + sqlFile);
        }

        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('Schema file found.');
        console.log('Connecting to Enzonic Cloud MySQL...');

        connection = await mysql.createConnection({
            host: process.env.CLOUD_DB_HOST,
            port: Number(process.env.CLOUD_DB_PORT || 3306),
            user: process.env.CLOUD_DB_USER,
            password: process.env.CLOUD_DB_PASSWORD,
            database: process.env.CLOUD_DB_NAME,
            ssl: {},
            multipleStatements: true,
            connectTimeout: 15000
        });

        console.log('Cloud connection successful.');
        console.log('Target database:', process.env.CLOUD_DB_NAME);

        await connection.query(sql);

        console.log('CLOUD SCHEMA IMPORT SUCCESSFUL');

    } catch (error) {
        console.error('CLOUD SCHEMA IMPORT FAILED');
        console.error('Error Code:', error.code || 'N/A');
        console.error('Error Message:', error.message);

    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

importCloudSchema();

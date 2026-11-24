
require('dotenv').config({
    path: require('path').join(__dirname, '.env.cloud-test')
});

const mysql = require('mysql2/promise');

async function testCloudOperations() {
    let connection;

    try {
        console.log('Connecting to Enzonic Cloud MySQL...');

        connection = await mysql.createConnection({
            host: process.env.CLOUD_DB_HOST,
            port: Number(process.env.CLOUD_DB_PORT || 3306),
            user: process.env.CLOUD_DB_USER,
            password: process.env.CLOUD_DB_PASSWORD,
            database: process.env.CLOUD_DB_NAME,
            ssl: {},
            connectTimeout: 15000
        });

        console.log('Cloud connection successful!');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS psm_connection_test (
                id INT AUTO_INCREMENT PRIMARY KEY,
                test_message VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Test table created.');

        const [insertResult] = await connection.execute(
            'INSERT INTO psm_connection_test (test_message) VALUES (?)',
            ['PSM cloud database test successful']
        );

        console.log('Test record inserted. ID:', insertResult.insertId);

        const [rows] = await connection.execute(
            'SELECT * FROM psm_connection_test WHERE id = ?',
            [insertResult.insertId]
        );

        console.log('Retrieved test record:', rows[0]);

        await connection.execute(
            'DELETE FROM psm_connection_test WHERE id = ?',
            [insertResult.insertId]
        );

        console.log('Test record cleaned up successfully.');
        console.log('\nCLOUD DATABASE OPERATIONS SUCCESSFUL');

    } catch (error) {
        console.error('\nCLOUD DATABASE TEST FAILED');
        console.error('Error Code:', error.code || 'N/A');
        console.error('Error Message:', error.message);

    } finally {
        if (connection) {
            try {
                await connection.query(
                    'DROP TABLE IF EXISTS psm_connection_test'
                );
                console.log('Temporary test table removed.');
            } catch (cleanupError) {
                console.error('Cleanup warning:', cleanupError.message);
            }

            await connection.end();
        }
    }
}

testCloudOperations();

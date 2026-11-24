
require('dotenv').config({
    path: require('path').join(__dirname, '.env.cloud-test')
});

const mysql = require('mysql2/promise');

async function testCloudSchema() {
    let connection;
    let transactionStarted = false;

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

        await connection.beginTransaction();
        transactionStarted = true;

        // 1. Insert dummy doctor
        const [doctor] = await connection.execute(
            'INSERT INTO doctor (doctor_name) VALUES (?)',
            ['Test Doctor']
        );

        // 2. Insert dummy patient
        const [patient] = await connection.execute(
            `INSERT INTO patient
            (full_name, birthday, address, occupation, civil_status, phone_number)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                'Test Patient',
                '2000-01-01',
                'Test Address',
                'Student',
                'Single',
                '09000000000'
            ]
        );

        // 3. Insert dummy user
        const [user] = await connection.execute(
            'INSERT INTO user (full_name, role, username, password_hash) VALUES (?, ?, ?, ?)',
            [
                'Test User',
                'admin',
                `test_user_${Date.now()}`,
                'TEST_ONLY_NOT_A_REAL_PASSWORD_HASH'
            ]
        );

        // 4. Insert dummy appointment using generated IDs
        const [appointment] = await connection.execute(
            `INSERT INTO appointment
            (patient_id, doctor_id, user_id, procedure_type,
             booking_type, appointment_datetime, appointment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                patient.insertId,
                doctor.insertId,
                user.insertId,
                'General Checkup',
                'Online',
                '2026-11-20 10:00:00',
                'Pending'
            ]
        );

        console.log('All four dummy records inserted.');

        // 5. Retrieve appointment and verify relationships
        const [rows] = await connection.execute(
            `SELECT
                a.appointment_id,
                p.full_name AS patient_name,
                d.doctor_name,
                u.username,
                a.procedure_type,
                a.appointment_status
             FROM appointment a
             JOIN patient p ON a.patient_id = p.patient_id
             JOIN doctor d ON a.doctor_id = d.doctor_id
             JOIN user u ON a.user_id = u.user_id
             WHERE a.appointment_id = ?`,
            [appointment.insertId]
        );

        console.log('Retrieved test appointment:', rows[0]);

        if (rows.length !== 1) {
            throw new Error('Appointment relationship verification failed.');
        }

        console.log('\nCLOUD SCHEMA TEST SUCCESSFUL');

    } catch (error) {
        console.error('\nCLOUD SCHEMA TEST FAILED');
        console.error('Error Code:', error.code || 'N/A');
        console.error('Error Message:', error.message);

    } finally {
        if (connection) {
            if (transactionStarted) {
                try {
                    await connection.rollback();
                    console.log('Transaction rolled back. Test records were not saved.');
                } catch (rollbackError) {
                    console.error('Rollback warning:', rollbackError.message);
                }
            }

            await connection.end();
        }
    }
}

testCloudSchema();


const router = require('express').Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard
// GET /api/dashboard/summary
router.get(['/', '/summary'], authenticateToken, async (req, res) => {
  try {
    // Total patients
    const [patientRows] = await db.query(`
      SELECT COUNT(*) AS totalPatients
      FROM patient
    `);

    // Total appointments
    const [appointmentRows] = await db.query(`
      SELECT COUNT(*) AS totalAppointments
      FROM appointment
    `);

    // Today's appointments count
    const [todayRows] = await db.query(`
      SELECT COUNT(*) AS todayAppointments
      FROM appointment
      WHERE DATE(appointment_datetime) = CURDATE()
    `);

    // Pending appointments count
    const [pendingRows] = await db.query(`
      SELECT COUNT(*) AS pendingAppointments
      FROM appointment
      WHERE LOWER(appointment_status) = 'pending'
    `);

    // Today's appointment list
    const [todayAppointmentList] = await db.query(`
      SELECT
        a.appointment_id,
        a.appointment_datetime,
        a.procedure_type,
        a.booking_type,
        a.appointment_status,
        p.full_name AS patient_name,
        d.doctor_name
      FROM appointment a
      LEFT JOIN patient p
        ON a.patient_id = p.patient_id
      LEFT JOIN doctor d
        ON a.doctor_id = d.doctor_id
      WHERE DATE(a.appointment_datetime) = CURDATE()
      ORDER BY a.appointment_datetime ASC
    `);

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully.',
      data: {
        totalPatients: patientRows[0].totalPatients,
        totalAppointments: appointmentRows[0].totalAppointments,
        todayAppointments: todayRows[0].todayAppointments,
        pendingAppointments: pendingRows[0].pendingAppointments,
        todayAppointmentList
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve dashboard data.'
    });
  }
});

module.exports = router;

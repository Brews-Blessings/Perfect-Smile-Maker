
const router = require('express').Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ==========================================
// GET /api/doctors/slots
// Check dentist availability on a selected date
// ==========================================

router.get('/slots', authenticateToken, async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a doctor ID and appointment date.'
      });
    }

    const selectedDoctor = Number(doctor_id);

    if (!Number.isInteger(selectedDoctor) || selectedDoctor <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID.'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment date format.'
      });
    }

    // Check if doctor exists.
    const [doctors] = await db.query(
      'SELECT doctor_id, doctor_name FROM doctor WHERE doctor_id = ?',
      [selectedDoctor]
    );

    if (!doctors.length) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    // Retrieve booked appointment times.
    const [appointments] = await db.query(
      `SELECT TIME(appointment_datetime) AS appointment_time
       FROM appointment
       WHERE doctor_id = ?
       AND DATE(appointment_datetime) = ?
       AND appointment_status != 'Cancelled'
       ORDER BY appointment_datetime ASC`,
      [selectedDoctor, date]
    );

    // Clinic time slots.
    const availableTimes = [
      '09:00:00',
      '10:00:00',
      '10:30:00',
      '11:00:00',
      '13:00:00',
      '14:00:00',
      '15:00:00'
    ];

    const bookedTimes = appointments.map(appointment =>
      String(appointment.appointment_time).substring(0, 8)
    );

    const slots = availableTimes.map(time => ({
      time,
      available: !bookedTimes.includes(time)
    }));

    return res.status(200).json({
      success: true,
      message: 'Doctor availability retrieved successfully.',
      data: {
        doctor: doctors[0].doctor_name,
        date,
        slots
      }
    });

  } catch (error) {
    console.error('Doctor availability error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve doctor availability.'
    });
  }
});

module.exports = router;

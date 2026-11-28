
const router = require('express').Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ==========================================
// GET /api/doctors/slots
// Check a doctor's availability on a selected date
// ==========================================

const CLINIC_TIMES = [
  '09:00:00',
  '10:00:00',
  '10:30:00',
  '11:00:00',
  '13:00:00',
  '14:00:00',
  '15:00:00'
];

// Validate actual calendar date
function isValidCalendarDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

router.get('/slots', authenticateToken, async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const selectedDoctor = Number(doctor_id);

    // Validate required parameters
    if (!doctor_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a doctor ID and appointment date.'
      });
    }

    // Validate doctor ID
    if (!Number.isInteger(selectedDoctor) || selectedDoctor <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID.'
      });
    }

    // Validate date
    if (!isValidCalendarDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment date. Use a valid YYYY-MM-DD date.'
      });
    }

    // Check if doctor exists
    const [doctors] = await db.query(
      `SELECT doctor_id, doctor_name
       FROM doctor
       WHERE doctor_id = ?`,
      [selectedDoctor]
    );

    if (!doctors.length) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    // Get current date and time directly as formatted strings
    const [clockRows] = await db.query(`
      SELECT
        DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today,
        TIME_FORMAT(CURTIME(), '%H:%i:%s') AS current_time
    `);

    const today = clockRows[0].today;
    const currentTime = clockRows[0].current_time;

    // Reject past dates
    if (date < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check availability for a past date.'
      });
    }

    // Retrieve booked appointment times
    // All appointments except cancelled ones occupy a slot.
    const [appointments] = await db.query(
      `SELECT
         TIME_FORMAT(appointment_datetime, '%H:%i:%s') AS appointment_time
       FROM appointment
       WHERE doctor_id = ?
         AND DATE(appointment_datetime) = ?
         AND appointment_status <> 'Cancelled'`,
      [selectedDoctor, date]
    );

    // Store booked times
    const bookedTimes = new Set(
      appointments.map(appointment => appointment.appointment_time)
    );

    // Determine slot availability
    const slots = CLINIC_TIMES.map(time => {
      const isPastTime = date === today && time <= currentTime;

      return {
        time,
        available: !bookedTimes.has(time) && !isPastTime
      };
    });

    // Return doctor availability
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


const router = require('express').Router();
const db = require('../db');

const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/auth');


// ==========================================
// GET /api/appointments
// Retrieve all appointments
// ==========================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        p.full_name AS patient_name,
        p.phone_number,
        a.doctor_id,
        d.doctor_name,
        a.user_id,
        u.full_name AS created_by,
        a.procedure_type,
        a.booking_type,
        a.appointment_datetime,
        a.appointment_status
      FROM appointment a
      INNER JOIN patient p
        ON a.patient_id = p.patient_id
      INNER JOIN doctor d
        ON a.doctor_id = d.doctor_id
      INNER JOIN user u
        ON a.user_id = u.user_id
      ORDER BY a.appointment_datetime DESC
    `);

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully.',
      data: rows
    });

  } catch (error) {
    console.error('Appointment retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve appointments.'
    });
  }
});


// ==========================================
// POST /api/appointments
// Create a new appointment
// ==========================================

router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      procedure_type,
      booking_type,
      appointment_datetime
    } = req.body;

    const user_id = req.user.userId;

    // Validate required fields

    if (
      !patient_id ||
      !doctor_id ||
      !procedure_type ||
      !booking_type ||
      !appointment_datetime
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required appointment fields.'
      });
    }

    // Validate booking type

    const normalizedBookingType = String(booking_type)
      .trim()
      .toLowerCase();

    if (!['online', 'walk-in'].includes(normalizedBookingType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking type.'
      });
    }

    const finalBookingType =
      normalizedBookingType === 'walk-in' ? 'Walk-in' : 'Online';

    // Determine appointment status

    const appointmentStatus =
      finalBookingType === 'Walk-in'
        ? 'Confirmed'
        : 'Pending';


    // Validate patient

    const [patients] = await db.query(
      'SELECT patient_id FROM patient WHERE patient_id = ?',
      [patient_id]
    );

    if (!patients.length) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }


    // Validate doctor

    const [doctors] = await db.query(
      'SELECT doctor_id FROM doctor WHERE doctor_id = ?',
      [doctor_id]
    );

    if (!doctors.length) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }


    // Validate appointment date

    const appointmentDate = new Date(
      String(appointment_datetime).replace(' ', 'T')
    );

    if (
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate.getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid future appointment date and time.'
      });
    }


    // Check duplicate schedule for the same doctor

    const [conflicts] = await db.query(
      `SELECT appointment_id
       FROM appointment
       WHERE doctor_id = ?
       AND appointment_datetime = ?
       AND appointment_status != 'Cancelled'`,
      [doctor_id, appointment_datetime]
    );

    if (conflicts.length) {
      return res.status(409).json({
        success: false,
        message: 'This doctor already has an appointment at that time.'
      });
    }


    // Insert appointment with automatic status

    const [result] = await db.query(
      `INSERT INTO appointment (
        patient_id,
        doctor_id,
        user_id,
        procedure_type,
        booking_type,
        appointment_datetime,
        appointment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id,
        doctor_id,
        user_id,
        procedure_type.trim(),
        finalBookingType,
        appointment_datetime,
        appointmentStatus
      ]
    );


    // Return successful response

    res.status(201).json({
      success: true,
      message: finalBookingType === 'Walk-in'
        ? 'Walk-in appointment confirmed successfully.'
        : 'Online appointment created successfully.',
      data: {
        appointment_id: result.insertId,
        patient_id,
        doctor_id,
        user_id,
        procedure_type,
        booking_type: finalBookingType,
        appointment_datetime,
        appointment_status: appointmentStatus
      }
    });

  } catch (error) {
    console.error('Appointment creation error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to create appointment.'
    });
  }
});


// ==========================================
// PATCH /api/appointments/:id/status
// Update appointment status (Owner only)
// ==========================================

router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('owner'),
  async (req, res) => {
    try {
      const appointmentId = Number(req.params.id);
      const { appointment_status } = req.body;

      const allowedStatuses = [
        'Pending',
        'Confirmed',
        'Completed',
        'Cancelled'
      ];

      // Validate appointment ID

      if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment ID.'
        });
      }

      // Validate status

      if (!allowedStatuses.includes(appointment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment status.'
        });
      }

      // Check if appointment exists

      const [existing] = await db.query(
        'SELECT appointment_id FROM appointment WHERE appointment_id = ?',
        [appointmentId]
      );

      if (!existing.length) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found.'
        });
      }

      // Update appointment

      await db.query(
        `UPDATE appointment
         SET appointment_status = ?
         WHERE appointment_id = ?`,
        [appointment_status, appointmentId]
      );

      res.status(200).json({
        success: true,
        message: 'Appointment status updated successfully.',
        data: {
          appointment_id: appointmentId,
          appointment_status
        }
      });

    } catch (error) {
      console.error('Appointment status update error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to update appointment status.'
      });
    }
  }
);


module.exports = router;

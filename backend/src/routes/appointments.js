const router = require('express').Router();
const db = require('../db');

const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/auth');

const ALLOWED_STATUSES = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'No-show'
];

const ALLOWED_BOOKING_TYPES = ['Online', 'Walk-in'];

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

// Validate appointment date and time
function parseAppointmentDateTime(value) {
  if (typeof value !== 'string') return null;

  // Accept YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match || !isValidCalendarDate(match[1])) {
    return null;
  }

  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4] || '00');

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  return {
    date: match[1],
    time: `${match[2]}:${match[3]}:${match[4] || '00'}`,
    mysqlDateTime:
      `${match[1]} ${match[2]}:${match[3]}:${match[4] || '00'}`
  };
}


// ==========================================
// GET /api/appointments
// Retrieve appointments
// ==========================================

router.get(
  '/',
  authenticateToken,
  authorizeRoles('owner', 'receptionist'),
  async (req, res) => {
    try {
      const role = String(req.user.role || '').toLowerCase();

      const conditions = [];
      const params = [];

      // Receptionist filters
      if (role === 'receptionist') {
        const { date, status, booking_type } = req.query;

        if (date) {
          if (!isValidCalendarDate(date)) {
            return res.status(400).json({
              success: false,
              data: null,
              message: 'Invalid date. Use a valid date in YYYY-MM-DD format.'
            });
          }

          conditions.push('DATE(a.appointment_datetime) = ?');
          params.push(date);
        }

        if (status) {
          if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
              success: false,
              data: null,
              message: 'Invalid appointment status.'
            });
          }

          conditions.push('a.appointment_status = ?');
          params.push(status);
        }

        if (booking_type) {
          if (!ALLOWED_BOOKING_TYPES.includes(booking_type)) {
            return res.status(400).json({
              success: false,
              data: null,
              message: 'Invalid booking type.'
            });
          }

          conditions.push('a.booking_type = ?');
          params.push(booking_type);
        }
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const baseQuery = `
        FROM appointment a
        INNER JOIN patient p ON a.patient_id = p.patient_id
        INNER JOIN doctor d ON a.doctor_id = d.doctor_id
        INNER JOIN user u ON a.user_id = u.user_id
        ${whereClause}
      `;

      // Owner pagination
      let pagination = null;
      let limitClause = '';
      const queryParams = [...params];

      if (role === 'owner') {
        const page = req.query.page === undefined
          ? 1
          : Number(req.query.page);

        const limit = req.query.limit === undefined
          ? 10
          : Number(req.query.limit);

        if (
          !Number.isInteger(page) ||
          !Number.isInteger(limit) ||
          page < 1 ||
          limit < 1 ||
          limit > 100
        ) {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Invalid pagination parameters.'
          });
        }

        const offset = (page - 1) * limit;

        limitClause = 'LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        const [countRows] = await db.query(
          `SELECT COUNT(*) AS total ${baseQuery}`,
          params
        );

        const total = Number(countRows[0].total);

        pagination = {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        };
      }

      const [rows] = await db.query(
        `
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
          ${baseQuery}
          ORDER BY a.appointment_datetime DESC
          ${limitClause}
        `,
        queryParams
      );

      return res.status(200).json({
        success: true,
        data: {
          appointments: rows,
          pagination
        },
        message: 'Appointments retrieved successfully.'
      });

    } catch (error) {
      console.error('Appointment retrieval error:', error);

      return res.status(500).json({
        success: false,
        data: null,
        message: 'Unable to retrieve appointments.'
      });
    }
  }
);


// ==========================================
// POST /api/appointments
// Create a new appointment
// ==========================================

router.post('/', authenticateToken, async (req, res) => {
  let connection;
  let lockName;
  let lockAcquired = false;

  try {
    const {
      patient_id,
      doctor_id,
      procedure_type,
      booking_type,
      appointment_datetime
    } = req.body;

    const patientId = Number(patient_id);
    const doctorId = Number(doctor_id);
    const userId = Number(req.user.userId);

    // Validate required fields
    if (
      !Number.isInteger(patientId) || patientId <= 0 ||
      !Number.isInteger(doctorId) || doctorId <= 0 ||
      !Number.isInteger(userId) || userId <= 0 ||
      typeof procedure_type !== 'string' ||
      !procedure_type.trim() ||
      typeof booking_type !== 'string' ||
      !booking_type.trim() ||
      !appointment_datetime
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid patient, doctor, procedure, booking type, and appointment date/time.'
      });
    }

    // Validate procedure type
    const procedure = procedure_type.trim();

    if (procedure.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Procedure type must not exceed 50 characters.'
      });
    }

    // Validate booking type
    const normalizedBookingType = booking_type.trim().toLowerCase();

    if (!['online', 'walk-in'].includes(normalizedBookingType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking type. Use Online or Walk-in.'
      });
    }

    const finalBookingType =
      normalizedBookingType === 'walk-in'
        ? 'Walk-in'
        : 'Online';

    // Automatically determine appointment status
    const appointmentStatus =
      finalBookingType === 'Walk-in'
        ? 'Confirmed'
        : 'Pending';

    // Validate appointment date and time
    const parsedDateTime =
      parseAppointmentDateTime(appointment_datetime);

    if (!parsedDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment date/time. Use YYYY-MM-DD HH:mm:ss.'
      });
    }

    // Validate clinic time slot
    if (!CLINIC_TIMES.includes(parsedDateTime.time)) {
      return res.status(400).json({
        success: false,
        message: 'Selected time is not an available clinic time slot.'
      });
    }

    // Check if appointment is in the future using database time
    const [futureCheck] = await db.query(
      'SELECT ? > NOW() AS is_future',
      [parsedDateTime.mysqlDateTime]
    );

    if (Number(futureCheck[0].is_future) !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date and time must be in the future.'
      });
    }

    // Validate patient
    const [patients] = await db.query(
      'SELECT patient_id FROM patient WHERE patient_id = ?',
      [patientId]
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
      [doctorId]
    );

    if (!doctors.length) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    // Prevent simultaneous booking of the same slot
    connection = await db.getConnection();

    lockName =
      `psm_appt_${doctorId}_${parsedDateTime.date.replace(/-/g, '')}_${parsedDateTime.time.replace(/:/g, '')}`;

    const [lockRows] = await connection.query(
      'SELECT GET_LOCK(?, 5) AS acquired',
      [lockName]
    );

    lockAcquired = Number(lockRows[0].acquired) === 1;

    if (!lockAcquired) {
      return res.status(503).json({
        success: false,
        message: 'The selected time slot is busy. Please try again.'
      });
    }

    // Check for an existing active appointment
    // Cancelled appointments do not occupy a slot.
    const [conflicts] = await connection.query(
      `SELECT appointment_id
       FROM appointment
       WHERE doctor_id = ?
         AND appointment_datetime = ?
         AND appointment_status <> 'Cancelled'
       LIMIT 1`,
      [doctorId, parsedDateTime.mysqlDateTime]
    );

    if (conflicts.length) {
      return res.status(409).json({
        success: false,
        message: 'This doctor already has an appointment at that time.'
      });
    }

    // Insert appointment
    const [result] = await connection.query(
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
        patientId,
        doctorId,
        userId,
        procedure,
        finalBookingType,
        parsedDateTime.mysqlDateTime,
        appointmentStatus
      ]
    );

    return res.status(201).json({
      success: true,
      message: finalBookingType === 'Walk-in'
        ? 'Walk-in appointment confirmed successfully.'
        : 'Online appointment created successfully.',
      data: {
        appointment_id: result.insertId,
        patient_id: patientId,
        doctor_id: doctorId,
        user_id: userId,
        procedure_type: procedure,
        booking_type: finalBookingType,
        appointment_datetime: parsedDateTime.mysqlDateTime,
        appointment_status: appointmentStatus
      }
    });

  } catch (error) {
    console.error('Appointment creation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create appointment.'
    });

  } finally {
    // Always release the MySQL connection and named lock
    if (connection) {
      if (lockAcquired && lockName) {
        try {
          await connection.query(
            'SELECT RELEASE_LOCK(?)',
            [lockName]
          );
        } catch (releaseError) {
          console.error(
            'Appointment lock release error:',
            releaseError
          );
        }
      }

      connection.release();
    }
  }
});


// ==========================================
// PATCH /api/appointments/:id/status
// Update appointment status (Owner and Receptionist)
// ==========================================

router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('owner', 'receptionist'),
  async (req, res) => {
    try {
      const appointmentId = Number(req.params.id);
      const { appointment_status } = req.body;

      // Validate appointment ID
      if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment ID.'
        });
      }

      // Validate appointment status
      if (
        typeof appointment_status !== 'string' ||
        !ALLOWED_STATUSES.includes(appointment_status)
      ) {
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

      // Update appointment status
      await db.query(
        `UPDATE appointment
         SET appointment_status = ?
         WHERE appointment_id = ?`,
        [appointment_status, appointmentId]
      );

      return res.status(200).json({
        success: true,
        message: 'Appointment status updated successfully.',
        data: {
          appointment_id: appointmentId,
          appointment_status
        }
      });

    } catch (error) {
      console.error('Appointment status update error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to update appointment status.'
      });
    }
  }
);

module.exports = router;
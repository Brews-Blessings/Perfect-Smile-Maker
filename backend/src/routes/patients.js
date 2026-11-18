
const router = require('express').Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');


// ============================================
// GET /api/patients
// Retrieve all registered patients
// ============================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        patient_id,
        full_name,
        phone_number,
        birthday,
        address,
        occupation,
        civil_status
      FROM patient
      ORDER BY patient_id DESC
    `);

    const patients = rows.map(patient => ({
      patient_id: patient.patient_id,
      name: patient.full_name,
      phone: patient.phone_number,
      birth: patient.birthday,
      address: patient.address,
      occupation: patient.occupation,
      civilStatus: patient.civil_status,
      last: '—',
      status: 'No Appointment'
    }));

    return res.status(200).json({
      success: true,
      message: 'Patient records retrieved successfully.',
      data: patients
    });

  } catch (error) {
    console.error('Patient retrieval error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve patient records.'
    });
  }
});


// ============================================
// POST /api/patients
// Find existing patient or register new patient
// ============================================

router.post('/', authenticateToken, async (req, res) => {
  console.log('[PATIENT POST] Route reached');

  try {
    const { name, phone, birthday, address } = req.body;

    // Validate required fields

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof phone !== 'string' ||
      !phone.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone number are required.'
      });
    }

    const fullName = name.trim();
    const phoneNumber = phone.trim();

    // Check existing patient

    const [existingPatients] = await db.query(
      `SELECT
        patient_id,
        full_name,
        phone_number,
        birthday,
        address,
        occupation,
        civil_status
       FROM patient
       WHERE LOWER(TRIM(full_name)) = LOWER(?)
       AND phone_number = ?
       LIMIT 1`,
      [fullName, phoneNumber]
    );

    if (existingPatients.length > 0) {
      const patient = existingPatients[0];

      console.log('[PATIENT POST] Existing patient found:', patient.patient_id);

      return res.status(200).json({
        success: true,
        message: 'Existing patient found.',
        data: {
          patient_id: patient.patient_id,
          full_name: patient.full_name,
          phone_number: patient.phone_number,
          birthday: patient.birthday,
          address: patient.address,
          occupation: patient.occupation,
          civil_status: patient.civil_status
        },
        existing: true
      });
    }

    // Register new patient

    const [result] = await db.query(
      `INSERT INTO patient (
        full_name,
        phone_number,
        birthday,
        address
      ) VALUES (?, ?, ?, ?)`,
      [
        fullName,
        phoneNumber,
        birthday || null,
        address || null
      ]
    );

    console.log('[PATIENT POST] INSERT successful:', result.insertId);

    // Send successful registration response

    console.log('[PATIENT POST] Sending 201 response');

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: {
        patient_id: result.insertId,
        full_name: fullName,
        phone_number: phoneNumber,
        birthday: birthday || null,
        address: address || null,
        occupation: null,
        civil_status: null
      },
      existing: false
    });

  } catch (error) {
    console.error('[PATIENT POST] ERROR:', error.stack || error);
    console.error('[PATIENT POST] Error code:', error.code);
    console.error('[PATIENT POST] SQL message:', error.sqlMessage);

    return res.status(500).json({
      success: false,
      message: 'Unable to register patient.'
    });
  }
});


// ============================================
// PUT /api/patients/:id
// Update existing patient information
// ============================================

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const patientId = Number(req.params.id);

    const {
      name,
      phone,
      birthday,
      address,
      occupation,
      civilStatus
    } = req.body;

    // Validate patient ID

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID.'
      });
    }

    // Validate required fields

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof phone !== 'string' ||
      !phone.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone number are required.'
      });
    }

    const fullName = name.trim();
    const phoneNumber = phone.trim();

    // Check if patient exists

    const [existing] = await db.query(
      `SELECT patient_id
       FROM patient
       WHERE patient_id = ?`,
      [patientId]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    // Check duplicate patient

    const [duplicates] = await db.query(
      `SELECT patient_id
       FROM patient
       WHERE LOWER(TRIM(full_name)) = LOWER(?)
       AND phone_number = ?
       AND patient_id != ?
       LIMIT 1`,
      [fullName, phoneNumber, patientId]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Another patient with the same name and phone number already exists.'
      });
    }

    // Update patient in MySQL

    await db.query(
      `UPDATE patient
       SET
        full_name = ?,
        phone_number = ?,
        birthday = ?,
        address = ?,
        occupation = ?,
        civil_status = ?
       WHERE patient_id = ?`,
      [
        fullName,
        phoneNumber,
        birthday || null,
        address || null,
        occupation || null,
        civilStatus || null,
        patientId
      ]
    );

    // Retrieve updated patient

    const [updatedRows] = await db.query(
      `SELECT
        patient_id,
        full_name,
        phone_number,
        birthday,
        address,
        occupation,
        civil_status
       FROM patient
       WHERE patient_id = ?`,
      [patientId]
    );

    const patient = updatedRows[0];

    return res.status(200).json({
      success: true,
      message: 'Patient information updated successfully.',
      data: {
        patient_id: patient.patient_id,
        full_name: patient.full_name,
        phone_number: patient.phone_number,
        birthday: patient.birthday,
        address: patient.address,
        occupation: patient.occupation,
        civil_status: patient.civil_status
      }
    });

  } catch (error) {
    console.error('Patient update error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update patient information.'
    });
  }
});

module.exports = router;

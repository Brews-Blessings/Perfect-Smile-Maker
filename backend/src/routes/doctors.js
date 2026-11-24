const router = require('express').Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/auth');

// GET /api/doctors
// Retrieve all registered doctors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT doctor_id, doctor_name
      FROM doctor
      ORDER BY doctor_id ASC
    `);

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully.',
      data: rows
    });

  } catch (error) {
    console.error('Doctor retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve doctors.'
    });
  }
});


// POST /api/doctors
// Add a new doctor (Owner only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('owner'),
  async (req, res) => {
    try {
      const { doctor_name } = req.body;

      if (
        typeof doctor_name !== 'string' ||
        !doctor_name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Doctor name is required.'
        });
      }

      const name = doctor_name.trim();

      const [existing] = await db.query(
        'SELECT doctor_id FROM doctor WHERE LOWER(doctor_name) = LOWER(?)',
        [name]
      );

      if (existing.length) {
        return res.status(409).json({
          success: false,
          message: 'Doctor already exists.'
        });
      }

      const [result] = await db.query(
        'INSERT INTO doctor (doctor_name) VALUES (?)',
        [name]
      );

      res.status(201).json({
        success: true,
        message: 'Doctor added successfully.',
        data: {
          doctor_id: result.insertId,
          doctor_name: name
        }
      });

    } catch (error) {
      console.error('Doctor creation error:', error);

      res.status(500).json({
        success: false,
        message: 'Unable to add doctor.'
      });
    }
  }
);

module.exports = router;
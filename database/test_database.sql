-- =====================================================================
-- PSM database tests. Run ONE statement at a time (Ctrl+Enter) because
-- the "should fail" statements stop a whole script when they error.
-- =====================================================================
USE psm_db;

-- TEST 1: row counts after sample_data.sql (expect 5, 3, 2, 8)
SELECT (SELECT COUNT(*) FROM patient)     AS patients,
       (SELECT COUNT(*) FROM doctor)      AS doctors,
       (SELECT COUNT(*) FROM `user`)      AS users,
       (SELECT COUNT(*) FROM appointment) AS appointments;

-- TEST 2: relationships work (names appear through the foreign keys)
SELECT a.appointment_id, p.full_name AS patient, d.doctor_name, u.full_name AS booked_by,
       a.booking_type, a.appointment_status
  FROM appointment a
  JOIN patient p ON p.patient_id = a.patient_id
  JOIN doctor  d ON d.doctor_id  = a.doctor_id
  JOIN `user`  u ON u.user_id    = a.user_id;

-- TEST 3: SHOULD FAIL - Error 1452 (patient 9999 does not exist)
INSERT INTO appointment (patient_id, doctor_id, user_id, procedure_type, booking_type, appointment_datetime, appointment_status)
VALUES (9999, 1, 1, 'Test', 'Online', NOW(), 'Scheduled');

-- TEST 4: SHOULD FAIL - Error 1062 (username must be unique)
INSERT INTO `user` (full_name, role, username, password_hash)
VALUES ('Duplicate', 'Receptionist', 'owner01', 'x');

-- TEST 5: SHOULD FAIL - Error 1451 (patient 1 still has appointments)
DELETE FROM patient WHERE patient_id = 1;

-- TEST 6: total index count (expect 11)
SELECT COUNT(*) AS total_indexes
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = 'psm_db';

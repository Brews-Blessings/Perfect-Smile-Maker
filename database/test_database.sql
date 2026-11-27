-- =====================================================================
-- PSM database tests. Run ONE statement at a time (Ctrl+Enter) because
-- the "should fail" statements stop a whole script when they error.
-- =====================================================================
USE psm_db;

-- TEST 1: row counts after sample_data.sql (expect 5, 1, 2, 8)
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
VALUES (9999, 1, 1, 'Test', 'Online', NOW(), 'Pending');

-- TEST 4: SHOULD FAIL - Error 1062 (username must be unique)
INSERT INTO `user` (full_name, role, username, password_hash)
VALUES ('Duplicate', 'Receptionist', 'owner01', 'x');

-- TEST 5: SHOULD FAIL - Error 1451 (patient 1 still has appointments)
DELETE FROM patient WHERE patient_id = 1;

-- TEST 6: total index count (expect 11)
SELECT COUNT(*) AS total_indexes
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = 'psm_db';

-- TEST 7: the five statuses are all used and 'Scheduled' is gone
-- (expect Cancelled 1, Completed 2, Confirmed 3, No-show 1, Pending 1; no 'Scheduled' row)
SELECT appointment_status, COUNT(*) AS total
  FROM appointment
 GROUP BY appointment_status
 ORDER BY appointment_status;

-- TEST 8: no doctor is double-booked (expect 0 rows)
-- Cancelled and No-show do not hold a slot, so they are left out.
SELECT doctor_id, appointment_datetime, COUNT(*) AS bookings
  FROM appointment
 WHERE appointment_status NOT IN ('Cancelled', 'No-show')
 GROUP BY doctor_id, appointment_datetime
HAVING COUNT(*) > 1;

-- TEST 9: sample_data.sql can be run again without errors or extra rows
-- Run sample_data.sql a second time, then run TEST 1 again.
-- Expect the same counts: 5, 1, 2, 8.

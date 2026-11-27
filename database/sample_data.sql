
-- =====================================================================
-- PSM sample data for TESTING ONLY (all names/numbers are fake).
-- These are sample records, not real patient data.
-- Run AFTER schema.sql. Safe to run more than once: every insert checks
-- for an existing row first, so nothing is duplicated.
-- Insert order matters because of foreign keys:
-- patient, doctor, user -> appointment
-- IDs are looked up by name/phone/username, never hardcoded.
-- =====================================================================

USE psm_db;

-- PATIENTS (matched on phone number)
INSERT INTO patient
(full_name, birthday, address, occupation, civil_status, phone_number)
SELECT t.full_name, t.birthday, t.address, t.occupation, t.civil_status, t.phone_number
FROM (
  SELECT 'Maria Santos' AS full_name, DATE '1995-03-12' AS birthday,
         '123 Rizal St., Caloocan City' AS address, 'Teacher' AS occupation,
         'Single' AS civil_status, '09171234501' AS phone_number
  UNION ALL SELECT 'Juan Dela Cruz', DATE '1988-07-25', '45 Mabini Ave., Quezon City', 'Engineer', 'Married', '09171234502'
  UNION ALL SELECT 'Ana Reyes', DATE '2001-11-02', '78 Bonifacio Rd., Manila', 'Student', 'Single', '09171234503'
  UNION ALL SELECT 'Carlos Garcia', DATE '1979-01-18', '9 Luna St., Malabon City', 'Driver', 'Married', '09171234504'
  UNION ALL SELECT 'Liza Mendoza', DATE '1992-09-30', '210 Aguinaldo Hwy., Pasay City', 'Nurse', 'Single', '09171234505'
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM patient p WHERE p.phone_number = t.phone_number
);

-- DOCTOR (matched on name)
-- The clinic has ONE doctor. Doctors cannot be added from the app
-- (no Manage Doctors process in the DFD), so the doctor is seeded here.
INSERT INTO doctor (doctor_name)
SELECT t.doctor_name
FROM (
  SELECT 'Dr. Angela M.' AS doctor_name
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM doctor d WHERE d.doctor_name = t.doctor_name
);

-- USERS (testing accounts only; username is UNIQUE)
-- On a re-run the existing row, including its password hash, is left as is.
INSERT INTO `user` (full_name, role, username, password_hash)
VALUES
('Clinic Owner', 'Owner', 'owner01',
 '$2b$10$uhs1ay2BS8ay3.s22ysFp.i6NuQohmMJcccxwttpqeTPu9K544ctC'),
('Clinic Reception', 'Receptionist', 'recep01',
 '$2b$10$OS4WH2e33eWn39hgGKiDgeAuzyMSFjepWRyEqNAP/NIggTkUMyJyq')
ON DUPLICATE KEY UPDATE user_id = user_id;

-- APPOINTMENTS (one row per patient + procedure; looked up by phone,
-- doctor name and username)
-- Every appointment is with the clinic's only doctor, so each row uses its
-- own date and time (one doctor cannot be booked twice at the same time).
-- Statuses used: Pending, Confirmed, Completed, Cancelled, No-show
-- Online bookings start as Pending; walk-ins start as Confirmed.
INSERT INTO appointment
(patient_id, doctor_id, user_id, procedure_type, booking_type,
 appointment_datetime, appointment_status)
SELECT p.patient_id, d.doctor_id, u.user_id,
       t.procedure_type, t.booking_type, t.appt_dt, t.appt_status
FROM (
  SELECT '09171234501' AS phone, 'Dr. Angela M.' AS doctor, 'owner01' AS uname,
         'Teeth Cleaning' AS procedure_type, 'Online' AS booking_type,
         TIMESTAMP(CURDATE(), '09:00:00') AS appt_dt, 'Pending' AS appt_status
  UNION ALL SELECT '09171234502', 'Dr. Angela M.', 'owner01', 'Tooth Extraction', 'Online',
         TIMESTAMP(CURDATE(), '10:00:00'), 'Completed'
  UNION ALL SELECT '09171234503', 'Dr. Angela M.', 'recep01', 'Dental Filling', 'Walk-in',
         TIMESTAMP(CURDATE(), '11:00:00'), 'Confirmed'
  UNION ALL SELECT '09171234504', 'Dr. Angela M.', 'recep01', 'Consultation', 'Walk-in',
         TIMESTAMP(CURDATE(), '14:00:00'), 'Confirmed'
  UNION ALL SELECT '09171234505', 'Dr. Angela M.', 'owner01', 'Braces Adjustment', 'Online',
         DATE_ADD(TIMESTAMP(CURDATE(), '09:00:00'), INTERVAL 1 DAY), 'Confirmed'
  UNION ALL SELECT '09171234501', 'Dr. Angela M.', 'owner01', 'Teeth Whitening', 'Online',
         DATE_SUB(TIMESTAMP(CURDATE(), '15:00:00'), INTERVAL 1 DAY), 'Completed'
  UNION ALL SELECT '09171234502', 'Dr. Angela M.', 'owner01', 'Root Canal', 'Online',
         DATE_SUB(TIMESTAMP(CURDATE(), '10:00:00'), INTERVAL 1 DAY), 'No-show'
  UNION ALL SELECT '09171234503', 'Dr. Angela M.', 'owner01', 'Dental Crown', 'Online',
         DATE_ADD(TIMESTAMP(CURDATE(), '13:00:00'), INTERVAL 2 DAY), 'Cancelled'
) AS t
JOIN patient p ON p.phone_number = t.phone
JOIN doctor  d ON d.doctor_name  = t.doctor
JOIN `user`  u ON u.username     = t.uname
WHERE NOT EXISTS (
  SELECT 1 FROM appointment a
  WHERE a.patient_id = p.patient_id AND a.procedure_type = t.procedure_type
);

-- 'Scheduled' is no longer a valid status. Convert any old rows to Confirmed.
UPDATE appointment
SET appointment_status = 'Confirmed'
WHERE appointment_status = 'Scheduled';

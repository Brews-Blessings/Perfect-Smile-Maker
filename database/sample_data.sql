-- =====================================================================
-- PSM sample data for TESTING ONLY (all names/numbers are fake)
-- The real psm_db tables are empty, so nothing here is real patient data.
-- Run AFTER schema.sql, and run it only ONCE (a second run duplicates rows
-- and fails on the UNIQUE username 'owner01'). Insert order matters because of foreign keys:
-- patient, doctor, user  ->  appointment
-- =====================================================================
USE psm_db;

INSERT INTO patient (full_name, birthday, address, occupation, civil_status, phone_number) VALUES
('Maria Santos',     '1995-03-12', '123 Rizal St., Caloocan City',      'Teacher',    'Single',  '09171234501'),
('Juan Dela Cruz',   '1988-07-25', '45 Mabini Ave., Quezon City',       'Engineer',   'Married', '09171234502'),
('Ana Reyes',        '2001-11-02', '78 Bonifacio Rd., Manila',          'Student',    'Single',  '09171234503'),
('Carlos Garcia',    '1979-01-18', '9 Luna St., Malabon City',          'Driver',     'Married', '09171234504'),
('Liza Mendoza',     '1992-09-30', '210 Aguinaldo Hwy., Pasay City',    'Nurse',      'Single',  '09171234505');

INSERT INTO doctor (doctor_name) VALUES
('Dr. Ramon Villanueva'),
('Dr. Teresa Navarro'),
('Dr. Paolo Fernandez');

-- password_hash values are PLACEHOLDERS, not real bcrypt hashes.
-- The backend (Neo) will create real hashes.
INSERT INTO `user` (full_name, role, username, password_hash) VALUES
('Clinic Owner',   'Owner',        'owner01', '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH_01'),
('Clinic Reception','Receptionist','recep01', '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH_02');

-- user_id 1 = Owner (online bookings), user_id 2 = Receptionist (walk-ins)
-- Dates are relative to today so the Dashboard "Today's appointments" has data.
INSERT INTO appointment
  (patient_id, doctor_id, user_id, procedure_type, booking_type, appointment_datetime, appointment_status) VALUES
(1, 1, 1, 'Teeth Cleaning',     'Online',  TIMESTAMP(CURDATE(), '09:00:00'),                          'Scheduled'),
(2, 2, 1, 'Tooth Extraction',   'Online',  TIMESTAMP(CURDATE(), '10:00:00'),                          'Completed'),
(3, 1, 2, 'Dental Filling',     'Walk-in', TIMESTAMP(CURDATE(), '11:00:00'),                          'Scheduled'),
(4, 3, 2, 'Consultation',       'Walk-in', TIMESTAMP(CURDATE(), '14:00:00'),                          'Scheduled'),
(5, 2, 1, 'Braces Adjustment',  'Online',  DATE_ADD(TIMESTAMP(CURDATE(), '09:00:00'), INTERVAL 1 DAY),  'Scheduled'),
(1, 1, 1, 'Teeth Whitening',    'Online',  DATE_SUB(TIMESTAMP(CURDATE(), '15:00:00'), INTERVAL 1 DAY),  'Completed'),
(2, 3, 1, 'Root Canal',         'Online',  DATE_SUB(TIMESTAMP(CURDATE(), '10:00:00'), INTERVAL 1 DAY),  'No-show'),
(3, 2, 1, 'Dental Crown',       'Online',  DATE_ADD(TIMESTAMP(CURDATE(), '13:00:00'), INTERVAL 2 DAY),  'Cancelled');

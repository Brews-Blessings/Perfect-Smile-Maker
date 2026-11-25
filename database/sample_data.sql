
-- =====================================================================
-- PSM sample data for TESTING ONLY (all names/numbers are fake).
-- These are sample records, not real patient data.
-- Run AFTER schema.sql, and run it only ONCE.
-- Running it again may cause duplicate records or UNIQUE constraint errors.
-- Insert order matters because of foreign keys:
-- patient, doctor, user -> appointment
-- =====================================================================

USE psm_db;

-- PATIENTS
INSERT INTO patient
(full_name, birthday, address, occupation, civil_status, phone_number)
VALUES
('Maria Santos', '1995-03-12', '123 Rizal St., Caloocan City', 'Teacher', 'Single', '09171234501'),
('Juan Dela Cruz', '1988-07-25', '45 Mabini Ave., Quezon City', 'Engineer', 'Married', '09171234502'),
('Ana Reyes', '2001-11-02', '78 Bonifacio Rd., Manila', 'Student', 'Single', '09171234503'),
('Carlos Garcia', '1979-01-18', '9 Luna St., Malabon City', 'Driver', 'Married', '09171234504'),
('Liza Mendoza', '1992-09-30', '210 Aguinaldo Hwy., Pasay City', 'Nurse', 'Single', '09171234505');

-- DOCTORS
INSERT INTO doctor (doctor_name)
VALUES
('Dr. Ramon Villanueva'),
('Dr. Teresa Navarro'),
('Dr. Paolo Fernandez');

-- USERS
-- Testing accounts only
INSERT INTO `user` (full_name, role, username, password_hash)
VALUES
('Clinic Owner', 'Owner', 'owner01',
'$2b$10$uhs1ay2BS8ay3.s22ysFp.i6NuQohmMJcccxwttpqeTPu9K544ctC'),
('Clinic Reception', 'Receptionist', 'recep01',
'$2b$10$OS4WH2e33eWn39hgGKiDgeAuzyMSFjepWRyEqNAP/NIggTkUMyJyq');

-- APPOINTMENTS
-- user_id 1 = Owner
-- user_id 2 = Receptionist
INSERT INTO appointment
(patient_id, doctor_id, user_id, procedure_type, booking_type,
 appointment_datetime, appointment_status)
VALUES
(1, 1, 1, 'Teeth Cleaning', 'Online',
 TIMESTAMP(CURDATE(), '09:00:00'), 'Scheduled'),

(2, 2, 1, 'Tooth Extraction', 'Online',
 TIMESTAMP(CURDATE(), '10:00:00'), 'Completed'),

(3, 1, 2, 'Dental Filling', 'Walk-in',
 TIMESTAMP(CURDATE(), '11:00:00'), 'Scheduled'),

(4, 3, 2, 'Consultation', 'Walk-in',
 TIMESTAMP(CURDATE(), '14:00:00'), 'Scheduled'),

(5, 2, 1, 'Braces Adjustment', 'Online',
 DATE_ADD(TIMESTAMP(CURDATE(), '09:00:00'), INTERVAL 1 DAY), 'Scheduled'),

(1, 1, 1, 'Teeth Whitening', 'Online',
 DATE_SUB(TIMESTAMP(CURDATE(), '15:00:00'), INTERVAL 1 DAY), 'Completed'),

(2, 3, 1, 'Root Canal', 'Online',
 DATE_SUB(TIMESTAMP(CURDATE(), '10:00:00'), INTERVAL 1 DAY), 'No-show'),

(3, 2, 1, 'Dental Crown', 'Online',
 DATE_ADD(TIMESTAMP(CURDATE(), '13:00:00'), INTERVAL 2 DAY), 'Cancelled');

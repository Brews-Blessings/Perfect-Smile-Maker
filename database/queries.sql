-- =====================================================================
-- PSM reference queries for the backend (Neo) and appointments (Haia)
-- Each query is tied to a DFD process. "?" = parameter filled by the backend.
-- Roles: Owner and Receptionist unless stated.
-- =====================================================================
USE psm_db;

-- ---------------------------------------------------------------------
-- Authentication (all processes): look up the user, backend checks the
-- bcrypt hash and uses `role` to decide the menu and permissions
-- ---------------------------------------------------------------------
SELECT user_id, full_name, role, password_hash
  FROM `user`
 WHERE username = ?;

-- ---------------------------------------------------------------------
-- DFD 1.0 MANAGE APPOINTMENTS
-- ---------------------------------------------------------------------

-- Doctor dropdown (online booking / walk-in form)
SELECT doctor_id, doctor_name FROM doctor ORDER BY doctor_name;

-- Owner types a new doctor name in the online booking form
INSERT INTO doctor (doctor_name) VALUES (?);

-- Key transaction: 1.1 receive info -> 1.2 check availability ->
-- 1.3 create appointment -> 1.4 record status. Any failure = ROLLBACK.
START TRANSACTION;

  -- Patient: new patient -> insert the patient file first.
  -- Returning patient -> skip the INSERT and use: SET @patient_id = ?;
  INSERT INTO patient (full_name, birthday, address, occupation, civil_status, phone_number)
  VALUES (?, ?, ?, ?, ?, ?);
  SET @patient_id = LAST_INSERT_ID();

  -- 1.2 Is the doctor's slot still free? (locks it so nobody double-books)
  SELECT COUNT(*) AS taken
    FROM appointment
   WHERE doctor_id = ?
     AND appointment_datetime = ?
     AND appointment_status = 'Scheduled'
     FOR UPDATE;
  -- backend: if taken > 0 -> ROLLBACK and show "slot already booked"
  -- Walk-in (Receptionist): backend also rejects any date other than today.

  -- 1.3 + 1.4 Create the appointment with its initial status
  INSERT INTO appointment
    (patient_id, doctor_id, user_id, procedure_type, booking_type, appointment_datetime, appointment_status)
  VALUES (@patient_id, ?, ?, ?, ?, ?, 'Scheduled');
  -- booking_type: 'Online' (Owner) or 'Walk-in' (Receptionist)

COMMIT;

-- Schedule Check panel: booked times for one doctor on one date
SELECT TIME(appointment_datetime) AS booked_time
  FROM appointment
 WHERE doctor_id = ? AND DATE(appointment_datetime) = ? AND appointment_status = 'Scheduled';

-- 1.4 Record appointment status (Scheduled / Completed / Cancelled / No-show)
UPDATE appointment SET appointment_status = ? WHERE appointment_id = ?;

-- Appointment list - Owner (paging, no filters)
SELECT a.appointment_id, a.appointment_datetime, p.full_name AS patient, d.doctor_name,
       a.procedure_type, a.booking_type, a.appointment_status
  FROM appointment a
  JOIN patient p ON p.patient_id = a.patient_id
  JOIN doctor  d ON d.doctor_id  = a.doctor_id
 ORDER BY a.appointment_datetime DESC
 LIMIT ? OFFSET ?;

-- Dashboard: today's appointments
SELECT a.appointment_datetime, p.full_name AS patient, d.doctor_name,
       a.procedure_type, a.booking_type, a.appointment_status
  FROM appointment a
  JOIN patient p ON p.patient_id = a.patient_id
  JOIN doctor  d ON d.doctor_id  = a.doctor_id
 WHERE a.appointment_datetime >= CURDATE()
   AND a.appointment_datetime <  CURDATE() + INTERVAL 1 DAY
 ORDER BY a.appointment_datetime;

-- Dashboard summary cards
SELECT
  SUM(DATE(appointment_datetime) = CURDATE()) AS todays_appointments,
  SUM(appointment_status = 'Scheduled')       AS scheduled,
  SUM(appointment_status = 'Completed')       AS completed,
  (SELECT COUNT(*) FROM patient)              AS total_patient_files
  FROM appointment;

-- ---------------------------------------------------------------------
-- DFD 2.0 MANAGE PATIENT RECORDS
-- ---------------------------------------------------------------------

-- Patient records list - Owner (paging)
SELECT patient_id, full_name, phone_number, birthday, civil_status
  FROM patient
 ORDER BY full_name
 LIMIT ? OFFSET ?;

-- 2.3 / 2.4 Open a patient file
SELECT patient_id, full_name, birthday, address, occupation, civil_status, phone_number
  FROM patient
 WHERE patient_id = ?;

-- 2.1 / 2.2 Save changes to a patient file
UPDATE patient
   SET full_name = ?, birthday = ?, address = ?, occupation = ?, civil_status = ?, phone_number = ?
 WHERE patient_id = ?;

-- ---------------------------------------------------------------------
-- DFD 3.0 SEARCH AND FILTER (Owner and Receptionist, per updated DFD 3.0)
-- ---------------------------------------------------------------------

-- Search patient records by name or phone (+ optional civil status)
SELECT patient_id, full_name, phone_number, birthday, civil_status
  FROM patient
 WHERE (full_name LIKE CONCAT(?, '%') OR phone_number LIKE CONCAT(?, '%'))
   AND (? IS NULL OR civil_status = ?);

-- Filter appointments by date, status, booking type
SELECT a.appointment_id, a.appointment_datetime, p.full_name, d.doctor_name,
       a.procedure_type, a.booking_type, a.appointment_status
  FROM appointment a
  JOIN patient p ON p.patient_id = a.patient_id
  JOIN doctor  d ON d.doctor_id  = a.doctor_id
 WHERE (? IS NULL OR DATE(a.appointment_datetime) = ?)
   AND (? IS NULL OR a.appointment_status = ?)
   AND (? IS NULL OR a.booking_type = ?)
 ORDER BY a.appointment_datetime
 LIMIT ? OFFSET ?;

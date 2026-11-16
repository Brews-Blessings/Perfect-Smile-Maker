-- =====================================================================
-- Perfect Smile Maker (PSM) - Database Schema (MySQL 8, InnoDB)
-- Matches the approved Phase 2 ERD, SDS Section III, and the psm_db
-- export of 2026-11-16 (MySQL Server 8.0.44).
-- Author: Jessah Mae Quinal (feature/jessah-database)
-- Run order: schema.sql -> sample_data.sql
-- Safe to re-run: uses IF NOT EXISTS and never drops or deletes anything.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS psm_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE psm_db;

-- Patient  (indexes: PRIMARY, idx_patient_full_name, idx_patient_phone_number)
CREATE TABLE IF NOT EXISTS patient (
  patient_id    INT          NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(50)  DEFAULT NULL,
  birthday      DATE         DEFAULT NULL,
  address       VARCHAR(100) DEFAULT NULL,
  occupation    VARCHAR(50)  DEFAULT NULL,
  civil_status  VARCHAR(50)  DEFAULT NULL,
  phone_number  VARCHAR(20)  DEFAULT NULL,
  PRIMARY KEY (patient_id),
  KEY idx_patient_full_name    (full_name),
  KEY idx_patient_phone_number (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctor  (indexes: PRIMARY)
CREATE TABLE IF NOT EXISTS doctor (
  doctor_id    INT         NOT NULL AUTO_INCREMENT,
  doctor_name  VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User  (indexes: PRIMARY, username [UNIQUE])
CREATE TABLE IF NOT EXISTS `user` (
  user_id        INT          NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(50)  DEFAULT NULL,
  role           VARCHAR(50)  DEFAULT NULL,   -- 'Owner' or 'Receptionist'
  username       VARCHAR(50)  DEFAULT NULL,
  password_hash  VARCHAR(225) DEFAULT NULL,   -- bcrypt hash, never plain text
  PRIMARY KEY (user_id),
  UNIQUE KEY username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Appointment  (indexes: PRIMARY, fk_appt_patient, fk_appt_doctor,
--               fk_appt_user, idx_appt_datetime  => 11 indexes in the database)
-- Foreign keys use MySQL's default behavior (no ON DELETE / ON UPDATE clause),
-- so a patient, doctor or user that has appointments cannot be deleted.
CREATE TABLE IF NOT EXISTS appointment (
  appointment_id        INT         NOT NULL AUTO_INCREMENT,
  patient_id            INT         NOT NULL,
  doctor_id             INT         NOT NULL,
  user_id               INT         NOT NULL,
  procedure_type        VARCHAR(50) DEFAULT NULL,
  booking_type          VARCHAR(20) DEFAULT NULL,   -- 'Online' or 'Walk-in'
  appointment_datetime  DATETIME    DEFAULT NULL,
  appointment_status    VARCHAR(20) DEFAULT NULL,   -- Scheduled / Completed / Cancelled / No-show
  PRIMARY KEY (appointment_id),
  KEY fk_appt_patient (patient_id),
  KEY fk_appt_doctor (doctor_id),
  KEY fk_appt_user (user_id),
  KEY idx_appt_datetime (appointment_datetime),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patient (patient_id),
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctor (doctor_id),
  CONSTRAINT fk_appt_user    FOREIGN KEY (user_id)    REFERENCES `user` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

# Database - Perfect Smile Maker

MySQL 8 (InnoDB, utf8mb4_unicode_ci) database for the PSM Appointment and File Tracking Web System.
It follows the approved Phase 2 ERD and SDS Section III, and was checked against an export of the
`psm_db` database (MySQL Server 8.0.44, 2026-11-16).

## Files
| File | Purpose |
|---|---|
| `schema.sql` | Creates the `psm_db` database, 4 tables, primary keys, foreign keys and indexes |
| `sample_data.sql` | Fake test data (5 patients, 3 doctors, 2 users, 8 appointments) |
| `queries.sql` | Reference queries for the backend, grouped by DFD process: login, appointments (key transaction, schedule check, status), patient files, search and filter |
| `test_database.sql` | Tests for relationships, constraints and index count |

## Create and populate the database
Using MySQL Workbench: open each file and run it (lightning bolt), in this order:
1. `schema.sql`
2. `sample_data.sql` (run once only)

Using the command line:
```
mysql -u root -p < database/schema.sql
mysql -u root -p psm_db < database/sample_data.sql
```
`schema.sql` is safe to re-run: it uses `IF NOT EXISTS` and does not drop or delete anything.

## Tables (all lowercase)
| Table | Columns |
|---|---|
| `patient` | patient_id (PK, INT), full_name VARCHAR(50), birthday DATE, address VARCHAR(100), occupation VARCHAR(50), civil_status VARCHAR(50), phone_number VARCHAR(20) |
| `doctor` | doctor_id (PK, INT), doctor_name VARCHAR(50) |
| `user` | user_id (PK, INT), full_name VARCHAR(50), role VARCHAR(50), username VARCHAR(50) UNIQUE, password_hash VARCHAR(225) |
| `appointment` | appointment_id (PK, INT), patient_id (FK), doctor_id (FK), user_id (FK), procedure_type VARCHAR(50), booking_type VARCHAR(20), appointment_datetime DATETIME, appointment_status VARCHAR(20) |

All primary keys are `AUTO_INCREMENT`. The three foreign keys in `appointment` are `NOT NULL`;
all other columns allow `NULL`. **`user` needs backticks in SQL:** `` `user` ``.

## Relationships (all one-to-many; all foreign keys are in `appointment`)
| ERD name | Foreign key constraint | Links |
|---|---|---|
| Has | `fk_appt_patient` | `appointment.patient_id` -> `patient.patient_id` |
| Assigned to | `fk_appt_doctor` | `appointment.doctor_id` -> `doctor.doctor_id` |
| Create/Manage | `fk_appt_user` | `appointment.user_id` -> `user.user_id` |

The foreign keys use MySQL's default behavior (no `ON DELETE` / `ON UPDATE` clause), so a patient,
doctor or user that still has appointments cannot be deleted.

## Indexes (11 in total)
| Table | Indexes |
|---|---|
| `appointment` | PRIMARY, `fk_appt_patient`, `fk_appt_doctor`, `fk_appt_user`, `idx_appt_datetime` |
| `doctor` | PRIMARY |
| `patient` | PRIMARY, `idx_patient_full_name`, `idx_patient_phone_number` |
| `user` | PRIMARY, `username` (UNIQUE) |

## Traceability to the Phase 2 ERD and DFD
**ERD -> database**
| ERD | Database |
|---|---|
| Entities Patient, Appointment, doctor, USER | Tables `patient`, `appointment`, `doctor`, `user` |
| Every attribute and type | Same column names and types (the ERD's `string` columns are `VARCHAR(50)` or `VARCHAR(20)`) |
| Has / Assigned to / Create-Manage (one patient, doctor or user to many appointments) | Foreign keys `fk_appt_patient`, `fk_appt_doctor`, `fk_appt_user`, all `NOT NULL` in `appointment` |

**DFD -> database and queries**
| DFD process | Data store D1 (Patient & Appointment Records) | Queries in `queries.sql` |
|---|---|---|
| 1.0 Manage Appointments (1.1 to 1.4) | `appointment`, with `patient`, `doctor`, `user` | key transaction, schedule check, status update, appointment lists, dashboard |
| 2.0 Manage Patient Records (2.1 to 2.4) | `patient` | patient list, open patient file, update patient file |
| 3.0 Search and Filter (3.1 to 3.3), Owner and Receptionist | `patient` (name, phone, civil status), `appointment` (date, status, booking type) | search and filter queries |
| Login (supports all processes) | `user` | login lookup |

## Value conventions
- `user.role`: `Owner` or `Receptionist`
- `appointment.booking_type`: `Online` or `Walk-in`
- `appointment.appointment_status`: `Scheduled`, `Completed`, `Cancelled`, `No-show`

## Notes for the backend
- Database name: `psm_db`
- `password_hash` in the sample data is a placeholder. Real passwords must be hashed with bcrypt by the backend.
- Use parameterized queries (see `queries.sql`).

## Testing
Run `test_database.sql` one statement at a time. Tests 3, 4 and 5 are supposed to fail with errors
1452, 1062 and 1451. Test 6 should return 11 indexes.

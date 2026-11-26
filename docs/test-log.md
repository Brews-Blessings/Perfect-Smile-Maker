# Test Log – Perfect Smile Maker Phase 4

## 1. Testing Overview

This document records the automated and manual API tests performed for the Perfect Smile Maker backend.

**Testing Environment:**
- Backend: Node.js and Express
- Database: MySQL 8
- API Testing Tool: Postman
- Automated Testing: Node.js Test Runner
- Local API URL: `http://localhost:3000`

**Testing Date:** November 25, 2026
**Tested By:** Mark Neo D. Mendoza

### Test Account Information

The following accounts were used for manual API authentication testing:

| Role | Username |
|---|---|
| Owner | `owner01` |
| Receptionist | `recep01` |

**Note:** Passwords are intentionally excluded from this document for security purposes. Contact the backend developer for the authorized testing credentials.

## 2. Automated Test Results

The following automated tests were executed using `npm.cmd test` from the backend directory.

| No. | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | Health endpoint | 200 OK | 200 OK | Passed |
| 2 | Holidays endpoint without authentication | 401 Unauthorized | 401 Unauthorized | Passed |
| 3 | Patients endpoint without authentication | 401 Unauthorized | 401 Unauthorized | Passed |
| 4 | Dashboard endpoint without authentication | 401 Unauthorized | 401 Unauthorized | Passed |
| 5 | Holidays endpoint with invalid year | 400 Bad Request | 400 Bad Request | Passed |
| 6 | Holidays endpoint with mocked external API failure | 502 Bad Gateway | 502 Bad Gateway | Passed |

**Automated Test Summary:**
- Total Tests: 6
- Passed: 6
- Failed: 0

## 3. Manual API Testing – Postman
Postman screenshots supporting the manual API test results are available in the `docs/images/` folder.

The following API requests were manually tested using Postman.

| No. | Endpoint / Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | GET `/api/health` | 200 OK | 200 OK | Passed |
| 2 | POST `/api/auth/login` – Owner | 200 OK | 200 OK | Passed |
| 3 | GET `/api/dashboard` | 200 OK | 200 OK | Passed |
| 4 | GET `/api/doctors` | 200 OK | 200 OK | Passed |
| 5 | GET `/api/patients` | 200 OK | 200 OK | Passed |
| 6 | GET `/api/patients/1` | 200 OK | 200 OK | Passed |
| 7 | PUT `/api/patients/1` | 200 OK | 200 OK | Passed |
| 8 | POST `/api/doctors` – Owner | 201 Created | 201 Created | Passed |
| 9 | POST `/api/doctors` – Receptionist | 403 Forbidden | 403 Forbidden | Passed |
| 10 | GET `/api/holidays/2026` | 200 OK | 200 OK | Passed |
| 11 | GET `/api/holidays/2026` – Cached Response | 200 OK with cached message | 200 OK with cached message | Passed |
| 12 | GET `/api/holidays/2026` without token | 401 Unauthorized | 401 Unauthorized | Passed |
| 13 | GET `/api/holidays/1800` with valid token | 400 Bad Request | 400 Bad Request | Passed |
| 14 | POST `/api/auth/login` – Receptionist | 200 OK | 200 OK | Passed |
| 15 | GET `/api/doctors` – Owner | 200 OK | 200 OK | Passed |
| 16 | GET `/api/doctors` – Receptionist | 200 OK | 200 OK | Passed |
| 17 | GET `/api/appointments` – Authenticated User | 200 OK | 200 OK | Passed |
| 18 | POST `/api/appointments` – Create Booking | 201 Created | 201 Created | Passed |
| 19 | POST `/api/appointments` – Duplicate Booking | 409 Conflict | 409 Conflict | Passed |

## 4. Testing Conclusion

The automated and manual API tests confirmed that the tested backend endpoints returned the expected HTTP responses.

The tests verified authentication requirements, login functionality for both Owner and Receptionist accounts, role-based access control, patient and doctor endpoint access, holiday retrieval and caching, invalid-year validation, external API failure handling, and appointment management.

The appointment API tests specifically verified successful appointment retrieval, successful booking creation, and duplicate booking prevention. The system returned `409 Conflict` when the same booking request was submitted again, confirming that the duplicate booking validation worked as expected.

All six automated tests passed, with no failed tests. The manual Postman tests also returned the expected HTTP responses for all nineteen documented scenarios.

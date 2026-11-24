# Test Log â€“ Perfect Smile Maker Phase 4

## 1. Testing Overview

This document records the automated and manual API tests performed for the Perfect Smile Maker backend.

**Testing Environment:**
- Backend: Node.js and Express
- Database: MySQL 8
- API Testing Tool: Postman
- Automated Testing: Node.js Test Runner
- Local API URL: `http://localhost:3000`

## 2. Automated Test Results

The following automated tests were executed using `npm.cmd test` from the backend directory.

| No. | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | Health endpoint | 200 OK | 200 OK | Passed |
| 2 | Holidays endpoint without authentication | 401 Unauthorized | 401 Unauthorized | Passed |
| 3 | Patients endpoint without authentication | 401 Unauthorized | 401 Unauthorized | Passed |
| 4 | Dashboard endpoint without authentication | 401 Unauthorized | 401 Unauthorized | Passed |
| 5 | Holidays endpoint with invalid year | 400 Bad Request | 400 Bad Request | Passed |
| 6 | Holidays endpoint with simulated external API failure | 502 Bad Gateway | 502 Bad Gateway | Passed |

**Automated Test Summary:**

- Total tests: 6
- Passed: 6
- Failed: 0

## 3. Manual API Testing â€“ Postman

The following API requests were manually tested using Postman:

| No. | Endpoint / Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | GET `/api/health` | 200 OK | 200 OK | Passed |
| 2 | POST `/api/auth/login` â€“ Owner | 200 OK | 200 OK | Passed |
| 3 | GET `/api/dashboard/summary` | 200 OK | 200 OK | Passed |
| 4 | GET `/api/doctors` | 200 OK | 200 OK | Passed |
| 5 | GET `/api/patients` | 200 OK | 200 OK | Passed |
| 6 | GET `/api/patients/1` | 200 OK | 200 OK | Passed |
| 7 | PUT `/api/patients/1` | 200 OK | 200 OK | Passed |
| 8 | POST `/api/doctors` â€“ Owner | 201 Created | 201 Created | Passed |
| 9 | POST `/api/doctors` â€“ Receptionist | 403 Forbidden | 403 Forbidden | Passed |
| 10 | GET `/api/holidays/2026` | 200 OK | 200 OK | Passed |
| 11 | GET `/api/holidays/2026` â€“ Cached | 200 OK with cached message | 200 OK with cached message | Passed |
| 12 | GET `/api/holidays/2026` without token | 401 Unauthorized | 401 Unauthorized | Passed |
| 13 | GET `/api/holidays/1800` with valid token | 400 Bad Request | 400 Bad Request | Passed |
| 14 | POST `/api/auth/login` - Receptionist | 200 OK | 200 OK | Passed |
| 15 | GET `/api/doctors` - Owner | 200 OK | 200 OK | Passed |
| 16 | GET `/api/doctors` - Receptionist | 200 OK | 200 OK | Passed |

## 4. Testing Conclusion

The automated and manual API tests confirmed that the tested backend endpoints returned the expected HTTP responses. Authentication, role-based access, holiday retrieval, caching, invalid-year validation, and external API failure handling were verified.

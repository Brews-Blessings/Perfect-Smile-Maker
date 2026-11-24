# Bug Log – Perfect Smile Maker Phase 4

## 1. Purpose

This document records errors, setup issues, and access-control checks encountered during Phase 4 backend development and testing. It distinguishes actual defects from expected security behavior.

## 2. Bug Records

| No. | Issue / Error | Cause / Observation | Resolution / Verification | Status |
|---|---|---|---|---|
| 1 | `Cannot find module 'dotenv'` | The backend required the `dotenv` package, but the dependency was not installed in the backend project at the time the error occurred. | Installed the missing dependency in the backend project. The application was then able to load its environment configuration. | Resolved |
| 2 | MySQL Workbench connection/login failure | MySQL Server was reachable at `localhost:3306`, but Workbench returned `Access denied for user 'root'@'localhost'`. This indicated that the supplied root password was not accepted; it was not evidence that the MySQL server was unreachable. Separately, a Node.js connection test using the backend environment configuration returned `DATABASE CONNECTED` and confirmed access to `psm_db`. | The Node.js database connection was verified using the backend `.env` settings and the `psm_db` database. A root-password recovery was also carried out during setup, but a later Workbench login attempt again returned an access-denied error; therefore, the final Workbench root-login status is not confirmed here. | Backend DB connection verified; Workbench root login not confirmed |
| 3 | Holiday API request timeout / external API failure | The external Nager.Date Public Holidays API may take longer than the configured request timeout or may temporarily be unavailable. | Added a 5-second request timeout and error handling that returns HTTP 502 when the external service fails or cannot be reached in time. Automated tests cover the external API failure response. | Resolved |
| 4 | Protected API request without a valid JWT | During testing, requests without a valid JWT were rejected by the authentication middleware. This is expected access-control behavior, not a system defect. | Verified that protected endpoints return HTTP 401 when a request has no valid authentication token. | Expected behavior verified |
| 5 | Receptionist attempts to create a doctor | During role-permission testing, a Receptionist request to create a doctor was rejected because doctor creation is restricted to the Owner role. This is expected role-based access control, not a system defect. | Verified that the request returns HTTP 403 Forbidden for the Receptionist role. | Expected behavior verified |

## 3. Current Status

The missing `dotenv` dependency was addressed, the Node.js backend connection to `psm_db` was verified, and holiday API error handling was implemented and covered by automated tests. Authentication and role restrictions were also verified as expected access-control behavior during testing. The later MySQL Workbench root-login attempt remained unconfirmed and is distinguished from the verified Node.js backend database connection.
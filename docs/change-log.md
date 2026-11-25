# Change Log – Perfect Smile Maker Phase 4

This document records the major backend changes and improvements made during Phase 4 development.

## 1. Backend Setup

- Set up the Node.js and Express backend structure.
- Installed the required dependencies, including Express, MySQL2, dotenv, CORS, bcryptjs, and jsonwebtoken.
- Configured the MySQL database connection using environment variables.
- Added the `/api/health` endpoint to check if the backend is running.

## 2. Authentication and Authorization

- Implemented the login endpoint.
- Added password verification using bcrypt.
- Implemented JWT-based authentication.
- Set the JWT expiration to 8 hours.
- Added middleware for authentication and role-based access control.

## 3. Doctor Management

- Implemented the endpoint for retrieving doctor records.
- Implemented doctor creation for Owner accounts.
- Restricted Receptionist accounts from creating doctors.

## 4. Patient Management

- Implemented patient listing with pagination.
- Added Receptionist-only patient search and civil status filtering.
- Implemented patient detail retrieval.
- Implemented patient information updates.

## 5. Dashboard

- Implemented the dashboard summary endpoint.
- Added counts for today's appointments, appointment statuses, and total patients.
- Added retrieval of today's appointment details.

## 6. Holiday API Integration

- Integrated the Nager.Date Public Holidays API for the Philippines.
- Implemented `GET /api/holidays/{year}`.
- Added year validation and JWT authentication.
- Added a 5-second request timeout.
- Implemented in-memory caching for holiday data by year.
- Added HTTP 502 error handling when the external API is unavailable.

## 7. Testing and Documentation

- Added automated tests for the health endpoint, authentication requirements on protected endpoints, invalid holiday year handling, and external holiday API failure handling.
- Performed manual API testing using Postman, including successful Owner and Receptionist login and role-permission checks.
- Created API integration documentation.
- Created test, bug, and change logs.

## 8. Summary

The Phase 4 backend work covered the backend setup, authentication and authorization, doctor management, patient management, dashboard summary, and holiday API integration. Automated tests were used for the health endpoint and selected protected-endpoint and holiday scenarios. Successful Owner and Receptionist login were checked separately through manual Postman testing; they are not represented as successful automated login tests.
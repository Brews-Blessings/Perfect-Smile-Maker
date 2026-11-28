# Perfect Smile Maker

Appointment and File Tracking Web System for Perfect Smile Maker Dental Clinic.

## Requirements

- Git
- Node.js 24.x
- npm
- MySQL 8.0 or Docker Desktop
- MySQL Workbench (optional)

## 1. Clone the Repository

git clone https://github.com/Brews-Blessings/Perfect-Smile-Maker.git
cd Perfect-Smile-Maker

## 2. Set Up the Database

Using MySQL Workbench, execute these files in order:

1. database/schema.sql
2. database/sample_data.sql (run once only)

Or use the MySQL command line:

mysql -u root -p < database/schema.sql
mysql -u root -p psm_db < database/sample_data.sql

For detailed database documentation and testing instructions, see [`database/README.md`](database/README.md).

## 3. Demo Login Credentials

The following accounts are intended for testing the application's Owner and Receptionist roles.

| Role | Username | Password |
|---|---|---|
| Owner | owner01 | emman1234567 |
| Receptionist | recep01 | chess1234567 |

*Note:* Replace the placeholders above with the actual demo credentials configured in database/sample_data.sql.

These accounts allow the evaluator to test the application using both Owner and Receptionist access.

## 4. Configure the Backend

Navigate to the backend directory:

cd backend

Create your local environment file:

copy .env.example .env

Update .env with your local MySQL credentials and a secure JWT secret.

Example for local Docker MySQL:

env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=psm_db
JWT_SECRET=your_secure_secret

Do not commit your actual .env file.

## 5. Install Backend Dependencies

From the backend directory:

npm ci

## 6. Start the Backend

From the backend directory:

npm start

The backend API runs at:

http://localhost:3000

API health check:

http://localhost:3000/api/health

## 7. Start the Frontend

Open a separate terminal and navigate to the frontend directory:

cd frontend

Start the frontend server:

npx http-server -p 3002

Open the application in your browser:

http://localhost:3002

Keep both the frontend and backend terminals running while testing.

## 8. Test the Application

1. Make sure the MySQL database is running.
2. Make sure the backend is running on port 3000.
3. Make sure the frontend is running on port 3002.
4. Open http://localhost:3002.
5. Select the appropriate login role.
6. Enter the Owner or Receptionist demo credentials listed above.
7. Test the features available to each role.

## 9. Run Automated Tests

From the backend directory:

npm test

---

# Docker Setup

This project uses Docker Compose to run the MySQL database and Node.js backend.

## Prerequisites

- Docker Desktop
- Docker Compose

## 1. Configure Environment Variables

From the project root:

cp .env.docker.example .env

Open the root .env file and configure:

- MYSQL_ROOT_PASSWORD
- DB_PASSWORD
- JWT_SECRET

*Important:* The backend connects to MySQL using the root account. Therefore, DB_PASSWORD must have the same value as MYSQL_ROOT_PASSWORD.

Use a strong, unique password and a secure random JWT secret. Do not commit your actual .env file to Git.

## 2. Start the Application

Run from the project root:

docker compose up --build -d

This starts the MySQL database and backend containers.

## 3. Database Initialization

The Docker Compose configuration mounts these SQL files into MySQL's initialization directory:

- database/schema.sql
- database/sample_data.sql

MySQL automatically executes these scripts in filename order when initializing a fresh database volume.

The scripts run only during the first initialization, when the MySQL data directory is empty.

If the psm_mysql_data volume already contains database data, MySQL will not automatically execute the initialization scripts again.

Changes to schema.sql or sample_data.sql will therefore not automatically update an existing database volume.

*Warning:* Removing the database volume deletes its stored data. Only remove it if you intentionally want to reset the database and understand the consequences.

## 4. Access the Application

- Backend API: http://localhost:3001
- MySQL host port: 3307

The backend connects to MySQL internally through the Docker network using host mysql and port 3306.

## 5. Stop the Containers

Run:

docker compose down

This stops and removes the containers but preserves the named MySQL data volume.


# Perfect Smile Maker

## Docker Setup

This project uses Docker Compose to run the MySQL database and Node.js backend.

### Prerequisites

- Docker Desktop
- Docker Compose

### 1. Configure Environment Variables

Copy the Docker environment example:

```bash
cp .env.docker.example .env
```

Open the `.env` file and configure the following variables:

- `MYSQL_ROOT_PASSWORD`
- `DB_PASSWORD`
- `JWT_SECRET`

**Important:** The backend connects to MySQL using the `root` account. Therefore, `DB_PASSWORD` must have the same value as `MYSQL_ROOT_PASSWORD`.

Use a strong, unique password and a secure random JWT secret. Do not commit your actual `.env` file to Git.

### 2. Start the Application

Run:

```bash
docker compose up --build -d
```

This starts the MySQL database and backend containers.

### 3. Database Initialization

The Docker Compose configuration mounts these SQL files into MySQL's initialization directory:

- `database/schema.sql`
- `database/sample_data.sql`

MySQL automatically executes these scripts in filename order when initializing a fresh database volume.

The scripts run only during the first initialization, when the MySQL data directory is empty.

If the `psm_mysql_data` volume already contains database data, MySQL will not automatically execute the initialization scripts again.

Changes to `schema.sql` or `sample_data.sql` will therefore not automatically update an existing database volume.

**Warning:** Removing the database volume deletes its stored data. Only remove it if you intentionally want to reset the database and understand the consequences.

### 4. Access the Application

- Backend API: http://localhost:3001
- MySQL host port: `3307`

The backend connects to MySQL internally through the Docker network using host `mysql` and port `3306`.

### 5. Stop the Containers

Run:

```bash
docker compose down
```

This stops and removes the containers but preserves the named MySQL data volume.

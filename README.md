# Perfect Smile Maker

Appointment and File Tracking Web System for Perfect Smile Maker Dental Clinic.

## Requirements

- Git
- Node.js 24.x
- npm
- MySQL 8.0 or Docker Desktop (for the MySQL container)

## 1. Clone the Repository

```bash
git clone https://github.com/Brews-Blessings/Perfect-Smile-Maker.git
cd Perfect-Smile-Maker
```

## 2. Set Up the Database

Using MySQL Workbench, execute these files in order:

1. `database/schema.sql`
2. `database/sample_data.sql` (run once only)

Or use the MySQL command line:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p psm_db < database/sample_data.sql
```

For detailed database documentation and testing instructions, see [`database/README.md`](database/README.md).

## 3. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create your local environment file:

```powershell
copy .env.example .env
```

Update `.env` with your local MySQL credentials and a secure JWT secret.

Example for MySQL running on port 3306:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=psm_db
JWT_SECRET=your_secure_secret
```

Do not commit your actual `.env` file.

## 4. Install Dependencies

From the `backend` directory:

```bash
npm ci
```

## 5. Start the Backend

```bash
npm start
```

The backend runs at `http://localhost:3000`.

API health check: `http://localhost:3000/api/health`

## 6. Run Automated Tests

```bash
npm test
```

## Optional: Run MySQL Using Docker

The root `docker-compose.yml` provides a MySQL 8.0 container.

If you followed the backend setup above, return to the project root first:

```bash
cd ..
```

Create a root-level `.env` file with:

```env
MYSQL_ROOT_PASSWORD=your_secure_password
```

From the project root, run:

```bash
docker compose up -d
```

When connecting from the Windows host, configure `backend/.env` with:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=psm_db
```

Docker maps host port `3307` to the container's internal port `3306`.

Import the database schema and sample data separately. The Docker Compose configuration does not automatically initialize them.

To stop the container:

```bash
docker compose down
```

The named database volume is retained when using `docker compose down`.
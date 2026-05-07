# Local Development Setup

## Prerequisites

- Node.js 20+
- PostgreSQL 15+

## Steps

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Create backend `.env`

Create `backend/.env`:

```env
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=itpapp
DB_PASSWORD=yourpassword
DB_PORT=5432

# Auth
JWT_SECRET=some-random-secret-string

# App
NODE_ENV=development
PORT=3000
ADMIN_API_KEY=local-admin-key
```

### 3. Create the database

```bash
psql -U postgres -c "CREATE DATABASE itpapp;"
```

### 4. Run migrations

Start the backend, then trigger migrations in a second terminal:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
curl -X POST http://localhost:3000/api/admin/migrate \
  -H "Content-Type: application/json" \
  -d '{"key": "local-admin-key"}'
```

### 5. Start both servers

```bash
# Terminal 1 — backend (port 3000)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

## Notes

- AWS-dependent features (email notifications, file uploads, scheduled jobs) require additional AWS config and won't work without it.
- Core features (ITPs, NCRs, user auth) work with just PostgreSQL.

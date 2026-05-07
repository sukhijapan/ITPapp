<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# Construction Quality Management System

A full-stack construction quality management application for managing Inspection and Test Plans (ITPs), Non-Conformance Reports (NCRs), witness points, and inspection workflows. Built for construction projects where multiple parties (Subcontractors, Head Contractors, Clients) collaborate on quality assurance with role-based access control, real-time notifications, and professional PDF reporting.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js/Express | 5.2 | Backend API |
| React | 19 | Frontend SPA |
| TypeScript | 6.0 | Frontend type safety |
| PostgreSQL | 15+ | Database |
| AWS CDK | - | Infrastructure as Code |
| AWS Lambda | - | Serverless compute |
| Vite | 8.0 | Frontend build tool |

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+
- **AWS CLI** v2 (for deployment)

## Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd construction-quality-management
   ```

2. **Install dependencies**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure environment**

   ```bash
   cp backend/.env.example backend/.env
   # Fill in database credentials and other values in backend/.env
   ```

4. **Run database migrations**

   ```bash
   cd backend && npm run start
   # In another terminal, trigger migrations:
   curl -X POST http://localhost:3000/api/admin/migrate \
     -H "Content-Type: application/json" \
     -d '{"key": "YOUR_ADMIN_API_KEY"}'
   ```

5. **Start development servers**

   ```bash
   # Backend (from backend/)
   cd backend && npm run dev

   # Frontend (from frontend/)
   cd frontend && npm run dev
   ```

## Project Structure

```
├── backend/          # Express API (Node.js, deployed to AWS Lambda)
├── frontend/         # React SPA (TypeScript, deployed to CloudFront/S3)
├── infrastructure/   # AWS CDK stacks (TypeScript)
├── e2e/              # End-to-end tests (Playwright)
└── docs/             # Full documentation suite
```

## Available Scripts

### Backend (`backend/`)

| Script | Command | Description |
|--------|---------|-------------|
| dev | `npm run dev` | Start development server with hot reload (nodemon) |
| start | `npm run start` | Start production server |
| test | `npm run test` | Run unit tests (Jest) |

### Frontend (`frontend/`)

| Script | Command | Description |
|--------|---------|-------------|
| dev | `npm run dev` | Start Vite development server |
| build | `npm run build` | TypeScript compile and Vite production build |
| lint | `npm run lint` | Run ESLint |
| preview | `npm run preview` | Preview production build locally |

## Documentation

See the [full documentation](./docs/README.md) for detailed guides including API reference, database schema, architecture decisions, user guides, and workflow diagrams.

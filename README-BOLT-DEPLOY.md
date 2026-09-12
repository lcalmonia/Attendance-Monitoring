# WorkSphere — Bolt deployment notes

This repository contains the CV Group of Companies Attendance & Payroll application.

## Current architecture

- React 19 + Vite + TypeScript frontend
- Express production server entrypoint (`server.ts`)
- `/api/health` health endpoint
- `/api/state` temporary server-side persistence adapter for preview/testing
- Existing payroll and attendance calculations remain in the frontend codebase

## Important production note

The original application stored all application state in browser `localStorage`. That is suitable only for a single-browser demo and cannot provide shared employee attendance/payroll data across devices.

The `bolt-ready` branch introduces a server API boundary and a small file-backed persistence adapter so the application can run as a full-stack service during development/preview. For real production payroll, replace `server/persistence.ts` with a managed persistent database adapter (for example, the database provisioned by the chosen hosting platform) before onboarding employees.

Do **not** treat browser `localStorage` as the source of truth in production.

## Bolt setup

1. Import the `bolt-ready` branch from GitHub.
2. Install dependencies with `npm install`.
3. Build with `npm run build`.
4. Run the production server with `npm start`.
5. Provide a durable database/persistent storage service and set `PERSISTENCE_FILE` only for preview environments where a durable volume is guaranteed.
6. Store secrets in the platform environment/secrets settings, never in source code.

## Recommended production work before payroll go-live

- Replace file-backed state with a managed relational database.
- Add real password authentication and session/token handling.
- Add server-side role/permission enforcement.
- Move sensitive payroll calculations and finalization checks server-side.
- Add database transactions for payroll finalization and attendance writes.
- Add backups and audit retention.
- Test multi-device concurrent attendance and payroll access.

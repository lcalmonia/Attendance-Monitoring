# WorkSphere Attendance & Payroll

## Netlify deployment architecture

This branch is prepared for Netlify:

- React + Vite frontend deployed from `dist`
- Netlify Functions for server-side APIs
- Netlify Database as shared persistent application storage
- Netlify Blobs for uploaded files and generated documents

## Deploy

1. Import this repository into Netlify.
2. Select the `netlify-ready` branch.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Enable **Data & Storage > Database** if Netlify does not automatically provision it.
6. Deploy.

The migration in `netlify/database/migrations` creates the shared application-state table. Netlify applies migrations during deployment.

## Local development

```bash
npm install
npm run netlify:dev
```

For database setup:

```bash
npm run db:init
```

## Storage policy

Use **Netlify Database** for attendance, payroll, employees, schedules, overtime, deductions, incentives, holidays, audit logs, and application state.

Use **Netlify Blobs** for employee documents, attachments, exports, and generated reports. Do not use Blobs as the primary payroll database.

## Important security note

The current application originated as a prototype and still requires a full server-side authentication and authorization migration before real employee payroll should be used in production.

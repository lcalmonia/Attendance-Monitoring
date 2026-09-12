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


## Authentication

WorkSphere now includes server-backed authentication:

- First deployment opens a one-time **Create Super Admin Account** setup screen.
- Users sign in with **Employee ID + password**.
- Passwords are hashed server-side using Node's scrypt password derivation.
- Sessions are stored in Netlify Database and expire after seven days.
- New employees receive a temporary password equal to their Employee ID and are required to change it after their first sign-in.
- The existing **Reset Password** action re-provisions the temporary password server-side.

No Super Admin password is committed to GitHub. Create the first credentials directly on the live setup screen after deployment.

### Security roadmap

The current migration protects login credentials and requires authentication for shared state access. The next production-hardening step is replacing the whole-application state API with role-scoped server-side CRUD endpoints so employees cannot access or submit data outside their authorized records.

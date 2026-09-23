# Boow Dashboard Audit

## Dashboard coverage

The uploaded repository contains these major UI modules:

- DashboardOverview
- PersonalData / Employee table and detail
- Attendance
- Leave
- Overtime & Incentive
- Payroll
- BPJS
- Recruitment
- Organization Structure
- Performance & Safety
- Regulations
- Remuneration
- Actuarial Remuneration
- PHK / PKWT
- Perjalanan Dinas
- KPI
- Security Audit
- AI Copilot Chat

## Backend/API coverage

The source also contains API routes for employees, departments, job positions, org chart, actuarial calculations, minimum wages, regulations, security/compliance and performance/safety.

## Important findings

1. The dashboard is a strong presentation layer for JARWO's mining-HR skills.
2. The source currently has two persistence patterns: Supabase plus in-memory/file-backed stores. These should be consolidated before production.
3. The source audit identifies missing serverless parity for some modules and an AI chat endpoint that still writes to local JSON.
4. Clean architecture: Dashboard -> JARWO API/adapter -> Hermes skill/agent/workflow -> HRIS/Supabase
5. Do not expose real credentials in the repository. Use GitHub/Vercel environment secrets.

## Recommended next integration

Map each dashboard module to the existing mining-HR agents and workflows, then replace dashboard-local AI/data calls with JARWO API adapters.

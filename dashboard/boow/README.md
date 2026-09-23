# Boow Dashboard imported into JARWO

Imported from the uploaded Boow-main dashboard repository.

## What was found

- React 19 + Vite frontend
- Express/TypeScript API layer
- Supabase integration
- Firebase/Google authentication configuration
- 20+ HR dashboard modules
- Actuarial, payroll, BPJS, leave, attendance, overtime/incentive, recruitment, organization, performance & safety, regulations, security/compliance, and AI copilot components.

## Integration note

This directory is the staging location for the Boow dashboard. The original project contains its own package/runtime configuration and serverless API layout, so it should be integrated into JARWO as the dashboard/presentation layer rather than replacing JARWO's Hermes skill/workflow layer.

The uploaded source archive remains the reference source for the full frontend/API tree. Before production deployment, secrets/configuration must be supplied through environment variables and the Supabase-backed modules should be consolidated to avoid duplicate data stores.

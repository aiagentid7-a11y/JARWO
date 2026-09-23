# GAS UI/View Audit

Audit target: `main` at commit `8e8f27849a69306fad51f40f96c00119e2524225`.

## Screen-by-screen findings

| Screen | Finding | Severity | Recommended fix |
|---|---|---:|---|
| Dashboard | Uses 18dp horizontal padding while most primary screens use 16dp | Medium | Normalize to 16dp |
| Dashboard | Header left content has no flexible width; right action cluster can crowd it on narrow devices | High | Give left column `weight(1f)` |
| Dashboard | Long THP Rupiah value shares a row with the `Bersih` badge and has no width bound | High | Give amount `weight(1f)`, `maxLines=1`, ellipsis |
| AttendanceInput | Primary screen grid is already 16dp | — | No confirmed symmetry defect |
| AuditK3 | Uses 18dp horizontal padding | Medium | Normalize to 16dp |
| BPJS Claim Guide | No confirmed primary-grid defect | — | No change required |
| Compensation THR/PHK | Primary screen grid is already 16dp | — | No change required |
| Leave Tracker | No confirmed primary-grid defect | — | No change required |
| More Features Hub | Uses 18dp horizontal padding | Medium | Normalize to 16dp |
| Onboarding | Uses 24dp horizontal padding intentionally for focused onboarding content | — | Keep |
| Overtime Tracker | No confirmed primary-grid defect from source audit | — | No change required |
| Payroll Calculator | Primary screen grid is already 16dp | — | No change required |
| Payslip Detail Dialog | Dialog/card controls its own width; not part of primary screen grid | — | Keep |
| Profile Settings | No confirmed primary-grid defect | — | No change required |
| Splash | 32dp content padding is intentional for centered branding | — | Keep |
| Tax Report | Primary screen grid is already 16dp | — | No change required |
| Work Shift Schedule | Long hero heading can compete with the scheme badge | High | Make heading weighted, max 2 lines, ellipsis |
| Work Shift Schedule | Selected shift name has no flexible width before the time badge | High | Give left column `weight(1f)` |
| Yearly Calendar | Primary screen grid is already 16dp | — | No change required |

## Shared component audit

- K3 Compliance Card: internal spacing is component-specific; no confirmed global symmetry defect.
- K3 Recommendation Box: internal spacing is component-specific; no confirmed global symmetry defect.
- K3 Weekly Log Table: table-specific spacing should remain independent of screen margins.
- Attendance Photo Components: internal badge/card spacing is component-specific.
- Common/Dialog components: should preserve their local container padding rather than inheriting tab-screen margins.

## Priority

1. Dashboard responsive header and THP row.
2. Work Shift responsive heading and shift row.
3. Normalize 18dp primary-screen margins to 16dp in Dashboard, Audit K3, and More Features.

## Verification note

This is a source-level UI audit. It does not claim pixel-perfect verification on a physical device because a running Android emulator/device screenshot was not available through the repository connector. The findings above are based on the Compose source and focus on deterministic layout risks such as inconsistent grids and unconstrained horizontal rows.

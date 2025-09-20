# OPS CySec Core Baseline

This repository implements the **OPS Cyber Security Core Framework** with alignment to **NIST CSF**, **CISA Cyber Essentials**, and **PCI DSS**. The solution is an internal-facing order console with no public exposure; nevertheless, the baseline below keeps the environment hardened.

## Governance & Policy Alignment

| Objective | Implementation | Framework Alignment |
|-----------|----------------|---------------------|
| Executive sponsorship | Operations owner recorded in internal runbook; security sign-off required for UI changes. | NIST ID.GV-1, CISA Gov | 
| Unified policy | `SECURITY.md` + internal SOP define configuration, testing, deployment. | NIST ID.GV-2, CISA Gov, PCI DSS 12 |
| Compliance matrix | Table in this document maps each control to NIST, CISA and PCI DSS requirements. | NIST ID.GV-3 |

## Identify

| Control | Implementation | Framework Alignment |
|---------|----------------|---------------------|
| Asset inventory | Repository inventory limited to hardened UI (`index.html`) and legacy splash (`this1`). Assets registered in CMDB. | NIST ID.AM-1/2, PCI DSS 2 |
| Risk assessment | Static security checklist executed on each change; CSP and strict headers enforced to mitigate XSS and MITM. | NIST ID.RA-1, PCI DSS 6.1 |
| Supply-chain | No third-party libraries; fetch endpoints restricted to Google Apps Script. Vendor review captured in change record. | NIST ID.SC-1, PCI DSS 12.8 |

## Protect

| Control | Implementation | Framework Alignment |
|---------|----------------|---------------------|
| Access control | Repository limited to MFA-enabled maintainers; UI enforces neutral theme toggles only for internal use. | NIST PR.AC-1, CISA AC, PCI DSS 8 |
| Data protection | CSP restricts resources to `'self'`; requests sent over HTTPS with minimal payload. No PAN data stored. | NIST PR.DS-2, PCI DSS 3,4 |
| Awareness & training | Security notes embedded in repo, linking to OPS policy; runbook includes quarterly phishing simulation. | NIST PR.AT-1 |
| Vulnerability management | Static linting + manual checklist; dependencies none. Hotfix SLA < 30 days documented. | NIST PR.MA-1, PCI DSS 6.2 |

## Detect

| Control | Implementation | Framework Alignment |
|---------|----------------|---------------------|
| Continuous monitoring | Commit hooks log changes; front-end registers `console.error` for anomalous responses. | NIST DE.CM-1 |
| Anomaly detection | Rate-limiting and payload caps on submissions guard against abuse. | NIST DE.AE-1, CISA monitoring |
| Testing & drills | Semi-annual tabletop recorded; pentest requirement logged in change log referencing PCI DSS 11.3. | PCI DSS 11.3 |

## Respond

| Control | Implementation | Framework Alignment |
|---------|----------------|---------------------|
| Incident response plan | Linked SOP includes escalation steps; toast notifications expose user-facing failures. | NIST RS.RP |
| Communication | UI failure paths log to console and display neutral language for operators. | NIST RS.CO |
| Forensics | Orders tagged with ISO timestamp before transfer to Google Apps Script for later correlation. | NIST RS.AN |

## Recover

| Control | Implementation | Framework Alignment |
|---------|----------------|---------------------|
| Continuity | Google Sheet export + Git history support rollback; instructions to redeploy static assets documented. | NIST RC.RP |
| Lessons learned | Post-incident review mandated by runbook; metrics (MTTD/MTTR) appended to change review. | NIST RC.IM |
| Reporting | Submission logs kept 90 days in Apps Script sheet to support PCI DSS 10 monitoring. | PCI DSS 10 |

## Operational Controls

- **Web governance:** Roles defined in runbook: Web Governance Lead, IT Ops, Security Officer, Legal reviewer. Version control enforced via Git + signed commits.
- **HTTP security:** Enforced meta headers for CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, CORP/COOP. CORS restricted to internal Apps Script endpoint only.
- **Cookies & storage:** No cookies used; no localStorage writes. Eliminates PCI DSS cardholder data exposure.
- **Accessibility & UX:** `index.html` includes ARIA announcements for cart totals, high-contrast design, keyboard-friendly controls.
- **Internationalization:** Language toggles default to ES/EN with sanitized strings; alt page instructs use of main UI.
- **Monitoring & logging:** Network errors logged to console; Apps Script responses audited by timestamp + ISO format.

## Maintenance Checklist

1. Review CSP and endpoint allow-list on every new integration.
2. Re-run static tests and manual smoke tests before deploy.
3. Confirm rate-limits match transaction baseline (update `ORDER_RATE_LIMIT_MS` if volume increases).
4. Record changes in OPS governance dashboard with control mapping updates.
5. Archive deprecated artefacts (e.g., `this1`) when no longer needed.


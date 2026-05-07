# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Construction Quality Management application. ADRs document significant technical decisions made during the design and development of the system.

## What is an ADR?

An Architecture Decision Record captures a single architectural decision along with its context and consequences. Each ADR is numbered sequentially and follows a consistent format:

```markdown
# ADR-NNN: Title

## Status
Accepted | Superseded | Deprecated

## Context
The problem or situation that required a decision.

## Decision
What was decided and why.

## Consequences
Positive and negative outcomes of this decision.
```

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](./001-serverless-express.md) | Express on Lambda via serverless-http | Accepted |
| [002](./002-s3-notification-pattern.md) | S3-based notification pattern (VPC boundary crossing) | Accepted |
| [003](./003-eventbridge-auto-waivers.md) | EventBridge Scheduler for witness point auto-waivers | Accepted |
| [004](./004-jwt-rbac.md) | JWT authentication with role-based access control | Accepted |
| [005](./005-external-sign-off-tokens.md) | Token-based external approval pattern | Accepted |
| [006](./006-pdf-generation-jspdf.md) | jsPDF with auto-table for professional reports | Accepted |
| [007](./007-monorepo-structure.md) | Single repository for all application components | Accepted |
| [008](./008-cloudfront-s3-spa.md) | CloudFront + S3 for frontend hosting with SPA routing | Accepted |

## Creating a New ADR

1. Copy the template format above
2. Number sequentially (next: `009`)
3. Use a descriptive filename: `NNN-short-description.md`
4. Set status to `Accepted`
5. Add an entry to the index table above

## Conventions

- ADRs are immutable once accepted. If a decision is reversed, create a new ADR and mark the old one as `Superseded`
- Keep context sections factual and concise
- Document both positive and negative consequences
- Link to relevant code or configuration where helpful

---

[← Back to Documentation Index](../README.md)

<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
  Maintainer: Development Team
-->

# Workflow Diagrams

Visual representations of the key business processes in the Construction Quality Management application. All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub, VS Code, and most documentation tools.

---

## Diagrams Index

### State Machine Diagrams

These diagrams show the lifecycle states and transitions for core entities:

| Workflow | Description |
|----------|-------------|
| [ITP Lifecycle](./itp-lifecycle.md) | Draft → Open → Pending Review → Approved/Rejected → Closed |
| [Point Sign-Off Flow](./point-sign-off.md) | Approval flow with HP blocking, NCR blocking, and role-based checks |
| [NCR Lifecycle](./ncr-lifecycle.md) | Open → Resolved → Verified → Closed |
| [Witness Point Flow](./witness-point-flow.md) | Notification creation, notice period, responses, and auto-waiver |

### Sequence Diagrams

These diagrams show the step-by-step interactions between system components:

| Workflow | Description |
|----------|-------------|
| [External Sign-Off](./external-sign-off.md) | Token generation, email delivery, validation, and execution |
| [User Onboarding](./user-onboarding.md) | Invitation creation, email, token validation, and registration |
| [Media Upload](./media-upload.md) | Presigned URL request, direct S3 upload, and metadata storage |

---

## How to Read These Diagrams

**State diagrams** show the possible states an entity can be in (boxes) and the transitions between them (arrows with labels). The `[*]` symbol represents the start or end of the lifecycle.

**Sequence diagrams** show interactions between participants (columns) over time (top to bottom). Arrows represent messages or API calls, and notes provide additional context.

---

## Related Documentation

- [Architecture Overview](../architecture.md) — System-level diagrams showing component interactions
- [Feature Overview](../features.md) — High-level description of all features
- [User Guide](../user-guide/README.md) — Step-by-step instructions for each workflow

---

[← Back to Documentation Index](../README.md)

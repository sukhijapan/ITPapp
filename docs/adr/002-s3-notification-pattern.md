# ADR-002: S3-Based Notification Pattern (VPC Boundary Crossing)

## Status

Accepted

## Context

The backend Lambda runs inside a VPC to access the PostgreSQL RDS instance. However, sending emails via Amazon SES requires internet access, which VPC Lambdas do not have without a NAT Gateway.

Options considered:
1. **NAT Gateway** — Provides internet access from VPC but costs ~$32/month minimum plus data transfer charges
2. **VPC Endpoint for SES** — SES does not offer a VPC endpoint
3. **S3 as a message queue** — VPC Lambda writes to S3 (via free Gateway Endpoint), a non-VPC Lambda reads and sends email
4. **SQS with VPC Endpoint** — SQS supports VPC endpoints but adds another service to manage

## Decision

We use **S3 as an asynchronous message bridge** between the VPC-bound backend Lambda and a non-VPC notifier Lambda that sends emails via SES.

The pattern:
1. Backend Lambda (in VPC) writes a JSON file to the notification S3 bucket via the free S3 Gateway Endpoint
2. S3 emits an `OBJECT_CREATED` event for any `.json` file
3. The notifier Lambda (outside VPC) is triggered, reads the JSON payload, and sends the email via SES

The notification bucket uses key prefixes to route different notification types:
- `ncr/` — NCR creation notifications
- `email/` — User onboarding emails (invitations, password resets)
- `wp-notification/` — Witness point notification and waiver emails

Lifecycle rules auto-delete notification files after 7 days.

```javascript
// backend/src/services/notificationService.js
const key = `ncr/${ncrId}-${Date.now()}.json`;
await s3.send(new PutObjectCommand({
  Bucket: NOTIFICATION_BUCKET,
  Key: key,
  Body: JSON.stringify(payload),
  ContentType: 'application/json',
}));
```

## Consequences

**Positive:**
- Zero additional cost — S3 Gateway Endpoint is free, S3 storage for small JSON files is negligible
- Eliminates NAT Gateway ($32+/month savings)
- Decouples email sending from request processing — API responses are never blocked by email delivery
- Built-in retry: S3 event notifications have automatic retry with DLQ support
- Notification payloads are preserved for debugging and audit (7-day retention)
- Non-blocking by design: notification failures are logged but never fail the API request

**Negative:**
- Eventual consistency — emails are not sent synchronously (acceptable for all current use cases)
- Debugging requires checking both backend logs and notifier Lambda logs
- JSON schema between producer and consumer is an implicit contract (no compile-time validation)
- S3 event notifications have a small delay (typically <1 second, occasionally up to a few seconds)

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)

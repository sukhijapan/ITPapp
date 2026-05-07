# ADR-003: EventBridge Scheduler for Witness Point Auto-Waivers

## Status

Accepted

## Context

Witness point notifications have a defined notice period. If no recipient responds (confirm or decline attendance) before the planned inspection time, the witness point must be automatically waived so the contractor can proceed without superintendent attendance.

This requires a reliable timer mechanism that fires at a specific future time for each individual notification. Options considered:

1. **Polling/cron job** — A Lambda runs every N minutes, queries for expired notifications, and processes them
2. **SQS delay queues** — Maximum delay is 15 minutes, insufficient for notice periods of hours/days
3. **Step Functions Wait state** — Reliable but expensive at scale and complex to manage per-notification
4. **EventBridge Scheduler** — One-shot schedules that fire at an exact time, auto-delete after completion

## Decision

We use **AWS EventBridge Scheduler** to create one-shot schedules for each witness point notification. When a notification is created, the backend creates a schedule set to fire at the notification's expiry time.

Architecture:
1. Backend Lambda creates an EventBridge Schedule via `@aws-sdk/client-scheduler`
2. Schedule fires at expiry time, invoking the `wp-timer` Lambda (outside VPC)
3. `wp-timer` Lambda calls the backend API's auto-waive endpoint with an internal secret
4. Backend processes the auto-waiver (updates status, records waiver, sends emails)

As a reliability fallback, a **sweep Lambda** runs every 5 minutes via an EventBridge Rule, querying the database for any expired notifications that were missed (e.g., if schedule creation failed).

```javascript
// backend/src/services/witnessPointTimerService.js
const input = {
  Name: `wp-notification-${notificationId}-${Date.now()}`,
  ScheduleExpression: `at(${formattedExpiryTime})`,
  ScheduleExpressionTimezone: 'UTC',
  FlexibleTimeWindow: { Mode: 'FLEXIBLE', MaximumWindowInMinutes: 5 },
  Target: {
    Arn: WP_TIMER_LAMBDA_ARN,
    RoleArn: WP_TIMER_ROLE_ARN,
    Input: JSON.stringify({ notificationId })
  },
  ActionAfterCompletion: 'DELETE'
};
```

The schedule's `ActionAfterCompletion: 'DELETE'` ensures automatic cleanup after firing.

## Consequences

**Positive:**
- Precise timing — schedules fire at the exact expiry time (within a 5-minute flexible window)
- No polling overhead — each notification has its own schedule, no database scanning required
- Auto-cleanup — schedules delete themselves after firing
- Cost-effective — EventBridge Scheduler is free for up to 14 million invocations/month
- Graceful degradation — if schedule creation fails, `scheduler_arn` is set to NULL and the sweep Lambda catches it within 5 minutes
- Idempotent processing — `processAutoWaiver` checks notification status before acting

**Negative:**
- Eventual consistency — the 5-minute flexible window means waivers may fire up to 5 minutes late
- Complexity — three Lambda functions involved (backend, wp-timer handler, wp-timer sweep)
- Circular dependency avoidance — requires pre-determined function names and ARN string construction in CDK
- IAM complexity — dedicated scheduler role with PassRole permission required
- Cancellation requires ARN tracking — must store `scheduler_arn` on the notification record to cancel if a recipient responds before expiry

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)

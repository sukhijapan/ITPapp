<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# Witness Points

Witness Points (WP) are inspection points that require notification to stakeholders before sign-off. Unlike Hold Points, Witness Points don't permanently block progress — if stakeholders don't respond within the notice period, the system automatically waives their attendance.

## How Witness Points Work

The Witness Point flow:

1. A point with type **WP** is reached in the ITP
2. A notification is raised, alerting designated recipients
3. Recipients have a **notice period** to respond (confirm or decline attendance)
4. If the notice period expires without a response, attendance is **automatically waived**
5. The point can then be signed off

## Raising a Witness Point Notification

### Steps

1. Open the ITP and navigate to the Witness Point
2. Click **Raise Notification** (or the notification icon)
3. The system sends notifications to all configured recipients
4. A countdown timer begins based on the project's notice period setting

### Expected Outcome

- All designated recipients receive an email notification
- The notification includes details about the inspection point, location, and timing
- A timer starts counting down the notice period

## Notice Period

The notice period is the time window during which recipients can respond to the notification.

- **Configurable per project** — Set between 1 and 168 hours (1 hour to 7 days)
- **Default** — Configured by the Head Contractor or Admin in project settings
- **Countdown** — Starts when the notification is raised

### Checking Remaining Time

1. Open the Witness Point notification
2. The remaining time is displayed as a countdown
3. When time reaches zero, auto-waiver is triggered

## Responding to a Notification

Recipients can respond in two ways:

### Confirming Attendance

1. Open the notification (via email link or in-app)
2. Click **Confirm** — you will attend the inspection
3. The point sign-off should wait until you've witnessed the inspection

### Declining Attendance

1. Open the notification (via email link or in-app)
2. Click **Decline** — you will not attend
3. Your attendance is waived immediately
4. The point can proceed to sign-off without waiting for the notice period to expire

### Responding via Email Link

- Each notification email contains a unique token-based link
- Click the link to respond directly without logging into the application
- The link is valid for the duration of the notice period

## Auto-Waiver Behavior

If a recipient does not respond before the notice period expires:

- Their attendance is **automatically waived** by the system
- The waiver is recorded with the reason "auto-waived due to notice period expiry"
- The point becomes available for sign-off
- No manual action is required

### How Auto-Waiver is Processed

The system uses a scheduled timer (EventBridge) that:
1. Checks for expired notice periods every 5 minutes
2. Automatically waives any notifications that have passed their deadline
3. Records the waiver in the audit trail

## Cancelling a Notification

If a notification was raised in error or circumstances change:

### Steps

1. Open the active notification
2. Click **Cancel**
3. The notification is cancelled and recipients are no longer expected to respond

### Important Notes

- Only the person who raised the notification (or an Admin) can cancel it
- Cancelling does not affect the point's ability to be signed off

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Raise WP notification | ✓ | ✓ | ✗ | ✓ |
| Respond to notification | ✓ | ✓ | ✓ | ✓ |
| Cancel notification | ✓ | ✓ | ✗ | ✓ |
| Configure notice period | ✗ | ✓ | ✗ | ✓ |
| View notification audit | ✓ | ✓ | ✓ | ✓ |

## Tips & Common Questions

**Q: What happens if all recipients decline?**  
A: The point can be signed off immediately — no need to wait for the notice period.

**Q: Can I extend the notice period after raising a notification?**  
A: No. The notice period is fixed when the notification is raised. Cancel and re-raise if more time is needed.

**Q: Who are the default recipients?**  
A: Recipients are configured per project in the Witness Point configuration. Typically includes the Head Contractor and Client representatives.

**Q: What if I confirm attendance but can't make it?**  
A: Contact the person who raised the notification. They may cancel and re-raise, or proceed with sign-off if appropriate.

**Q: Is there a record of who was notified and how they responded?**  
A: Yes. The notification audit trail records all notifications, responses, and auto-waivers with timestamps.

**Q: Can I respond after the notice period expires?**  
A: No. Once auto-waived, the response window is closed.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)

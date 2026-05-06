# Requirements Document

## Introduction

The Witness Point Notification & Timer feature automates the end-to-end workflow for witness point inspections on civil infrastructure projects. Currently, contractors raise inspection notifications via email or phone, superintendents respond informally, and the audit trail is fragmented across multiple systems. This feature integrates the notification, countdown timer, response, auto-waiver, and audit trail into the existing ITP execution workflow, ensuring a single source of truth for witness point attendance decisions.

This feature is distinct from the existing external sign-off system (token-based, 48hr expiry). External sign-off handles the actual approval/rejection of an ITP point. Witness point notification handles the pre-inspection attendance workflow — notifying the superintendent that an inspection is upcoming and tracking whether they intend to attend.

## Glossary

- **Notification_Service**: The backend service responsible for creating, storing, and dispatching witness point notification requests via the existing S3 → Lambda → SES email pipeline.
- **Timer_Service**: The backend service responsible for tracking notice period countdowns and triggering auto-waiver logic when the notice period expires without a response.
- **Witness_Point**: An ITP inspection point of type 'WP' where the superintendent is invited to attend but work may proceed if they do not respond within the agreed notice period.
- **Notice_Period**: The configurable duration (in hours) between when a notification is raised and when the planned inspection occurs. Default is 24 hours.
- **Auto_Waiver**: The automatic transition that occurs when a notice period expires without the recipient confirming attendance or explicitly declining — the superintendent is deemed to have waived their right to witness.
- **Notification_Recipient**: A user (internal or external) designated to receive witness point notifications, typically the superintendent (Head Contractor) or client representative.
- **Inspection_Notification**: A formal request raised by the contractor informing the superintendent of a planned inspection at a witness point, including date, time, location, and scope.
- **Response_Token**: A secure, time-limited token embedded in the notification email that allows the recipient to respond (confirm attendance, decline, or request reschedule) without logging into the application.
- **Planned_Inspection_Time**: The date and time at which the contractor intends to perform the inspection at the witness point.
- **Notification_Status**: The lifecycle state of a witness point notification: 'Pending', 'Confirmed', 'Declined', 'Expired', 'Cancelled'.

## Requirements

### Requirement 1: Raise Inspection Notification

**User Story:** As a Subcontractor, I want to raise a formal inspection notification for a witness point, so that the superintendent is informed of the planned inspection with adequate notice.

#### Acceptance Criteria

1. WHEN a user with Subcontractor or Head Contractor role initiates a notification for an ITP point of type 'WP', THE Notification_Service SHALL create an Inspection_Notification record containing the ITP point reference, planned inspection time, location description, and scope of work to be inspected.
2. WHEN an Inspection_Notification is created, THE Notification_Service SHALL validate that the planned inspection time is at least the configured Notice_Period in the future relative to the current time.
3. IF the planned inspection time is less than the configured Notice_Period in the future, THEN THE Notification_Service SHALL reject the notification with an error message stating the minimum required notice period.
4. WHEN an Inspection_Notification is created successfully, THE Notification_Service SHALL set the Notification_Status to 'Pending' and record the creation timestamp.
5. WHEN an Inspection_Notification is created, THE Notification_Service SHALL dispatch an email to each designated Notification_Recipient via the existing S3 → Lambda → SES pipeline within 60 seconds of creation.
6. THE Notification_Service SHALL prevent creation of duplicate active notifications for the same ITP point — only one notification with status 'Pending' SHALL exist per witness point at any time.
7. IF the ITP instance status is not 'Open', THEN THE Notification_Service SHALL reject the notification request with an error indicating the ITP must be open for execution.

### Requirement 2: Notice Period Timer

**User Story:** As a project quality manager, I want the system to track the countdown from notification to planned inspection time, so that all parties have visibility into the remaining notice period.

#### Acceptance Criteria

1. WHEN an Inspection_Notification is created, THE Timer_Service SHALL calculate and store the notice period expiry time as the planned inspection time minus the configured Notice_Period.
2. WHILE an Inspection_Notification has status 'Pending', THE Timer_Service SHALL expose the remaining time until the planned inspection via the API as hours, minutes, and seconds.
3. THE Timer_Service SHALL support configurable Notice_Period values at the project level, with a minimum of 1 hour and a maximum of 168 hours (7 days), defaulting to 24 hours.
4. WHEN the Notice_Period expiry time is reached and the Notification_Status is still 'Pending', THE Timer_Service SHALL trigger the Auto_Waiver process.
5. WHEN the planned inspection time is modified by the notification creator, THE Timer_Service SHALL recalculate the notice period expiry and re-validate that the new planned time satisfies the minimum Notice_Period from the current time.

### Requirement 3: Recipient Response Workflow

**User Story:** As a superintendent, I want to respond to a witness point notification by confirming attendance, declining, or requesting a reschedule, so that the contractor knows whether I will attend the inspection.

#### Acceptance Criteria

1. WHEN a notification email is dispatched, THE Notification_Service SHALL include a unique Response_Token in the email that allows the recipient to respond without logging into the application.
2. WHEN a recipient uses the Response_Token to confirm attendance, THE Notification_Service SHALL update the Notification_Status to 'Confirmed' and record the respondent identity and timestamp.
3. WHEN a recipient uses the Response_Token to decline attendance, THE Notification_Service SHALL update the Notification_Status to 'Declined', record the decline reason provided by the recipient, and trigger the Auto_Waiver process.
4. WHEN a recipient uses the Response_Token to request a reschedule, THE Notification_Service SHALL record the requested new time and notify the original notification creator, keeping the Notification_Status as 'Pending'.
5. THE Notification_Service SHALL reject any response submitted after the planned inspection time has passed, returning an error indicating the notification has expired.
6. THE Response_Token SHALL expire at the planned inspection time and SHALL be single-use — once a response is submitted, the same token SHALL not accept further responses.
7. WHEN a recipient is an authenticated internal user, THE Notification_Service SHALL allow response via the application interface without requiring the Response_Token.

### Requirement 4: Auto-Waiver Logic

**User Story:** As a contractor, I want the system to automatically waive the superintendent's attendance requirement when the notice period expires without a response, so that work is not unnecessarily delayed.

#### Acceptance Criteria

1. WHEN the Notice_Period expiry time is reached and no recipient has responded with 'Confirmed' or 'Declined', THE Timer_Service SHALL update the Notification_Status to 'Expired' and create an Auto_Waiver record.
2. WHEN an Auto_Waiver is triggered, THE Notification_Service SHALL send a confirmation email to the notification creator confirming that the witness point is now available for inspection without superintendent attendance.
3. WHEN an Auto_Waiver is triggered, THE Notification_Service SHALL send a notification to the original recipient informing them that their attendance right has been waived due to non-response.
4. WHEN a recipient explicitly declines attendance, THE Timer_Service SHALL immediately trigger the Auto_Waiver process without waiting for the notice period to expire.
5. WHEN an Auto_Waiver is triggered (by expiry or decline), THE Notification_Service SHALL update the associated ITP point metadata to indicate that the witness point may proceed to sign-off without superintendent attendance.
6. THE Timer_Service SHALL record the waiver trigger reason ('timer_expired' or 'recipient_declined') in the Auto_Waiver record.

### Requirement 5: Notification Cancellation

**User Story:** As a Subcontractor, I want to cancel a pending inspection notification if the planned work is postponed, so that the superintendent is not expecting an inspection that will not occur.

#### Acceptance Criteria

1. WHEN the notification creator cancels a pending Inspection_Notification, THE Notification_Service SHALL update the Notification_Status to 'Cancelled' and record the cancellation reason and timestamp.
2. WHEN an Inspection_Notification is cancelled, THE Notification_Service SHALL send a cancellation email to all Notification_Recipients who were previously notified.
3. IF the Notification_Status is not 'Pending', THEN THE Notification_Service SHALL reject the cancellation request with an error indicating only pending notifications can be cancelled.
4. WHEN an Inspection_Notification is cancelled, THE Timer_Service SHALL stop tracking the notice period for that notification.

### Requirement 6: Audit Trail

**User Story:** As a quality auditor, I want a complete audit trail of all witness point notification activities, so that I can verify compliance with contractual notice requirements during project audits.

#### Acceptance Criteria

1. WHEN any Notification_Status transition occurs, THE Notification_Service SHALL create an audit log entry containing the notification ID, ITP point ID, ITP instance ID, previous status, new status, acting user or system identifier, and timestamp.
2. THE Notification_Service SHALL record all email dispatch events (sent, failed, bounced) in the audit log with the recipient email address and dispatch timestamp.
3. THE Notification_Service SHALL record all response events (confirmed, declined, reschedule requested) in the audit log with the respondent identity and response content.
4. THE Notification_Service SHALL record all Auto_Waiver events in the audit log with the trigger reason and the time elapsed since notification creation.
5. THE Notification_Service SHALL store audit log entries in the existing audit_logs table using a JSONB metadata field to capture notification-specific details.
6. THE Notification_Service SHALL make the complete notification audit trail available via API, filterable by ITP instance, ITP point, notification status, and date range.

### Requirement 7: Recipient Management

**User Story:** As a Head Contractor, I want to configure which users receive witness point notifications for each project, so that the correct superintendent or client representative is notified for each inspection.

#### Acceptance Criteria

1. THE Notification_Service SHALL support configuring default Notification_Recipients at the project level, associating one or more users (by role or specific user) as default recipients for witness point notifications.
2. WHEN raising an Inspection_Notification, THE Notification_Service SHALL pre-populate recipients from the project-level defaults and allow the creator to add or remove recipients for that specific notification.
3. THE Notification_Service SHALL support both internal users (with application accounts) and external recipients (identified by email address only) as Notification_Recipients.
4. WHEN an external recipient is specified, THE Notification_Service SHALL use the Response_Token mechanism for their response workflow.
5. WHEN an internal recipient is specified, THE Notification_Service SHALL send both an email notification and an in-application notification.

### Requirement 8: Integration with Existing Sign-Off Workflow

**User Story:** As a quality manager, I want the witness point notification workflow to integrate with the existing ITP sign-off process, so that the notification outcome (attendance confirmed or waiver triggered) is visible when performing the actual sign-off.

#### Acceptance Criteria

1. WHEN a witness point sign-off is initiated, THE Notification_Service SHALL display the notification outcome (confirmed attendance, auto-waiver with reason, or no notification raised) alongside the sign-off form.
2. WHILE a witness point has an active notification with status 'Pending' and the notice period has not expired, THE Notification_Service SHALL display a warning on the sign-off form indicating that the notification workflow is still in progress.
3. THE Notification_Service SHALL NOT block sign-off of a witness point regardless of notification status — witness points are advisory, not mandatory hold points.
4. WHEN a witness point is signed off, THE Notification_Service SHALL record the notification status at the time of sign-off in the sign-off audit log entry metadata.
5. WHEN a witness point has notification status 'Confirmed' and the superintendent has not signed off, THE Notification_Service SHALL display a visual indicator that the superintendent confirmed attendance but has not yet provided their sign-off.

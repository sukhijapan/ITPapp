# Implementation Plan: Witness Point Notification & Timer

## Overview

This plan implements the witness point notification workflow in incremental steps, building from database schema through backend services, API controller, infrastructure (EventBridge timer Lambda), and finally frontend components. Each step builds on the previous, ensuring no orphaned code. The implementation follows existing patterns: external sign-off for token-based workflows, S3 → Lambda → SES for email dispatch, and the ITP controller pattern for transactions and audit logging.

## Tasks

- [x] 1. Database migration and schema setup
  - [x] 1.1 Create migration file `backend/database/migrations/005_witness_point_notifications.sql`
    - Create ENUM types: `wp_notification_status` ('Pending', 'Confirmed', 'Declined', 'Expired', 'Cancelled') and `wp_waiver_reason` ('timer_expired', 'recipient_declined')
    - Create `wp_notifications` table with all columns (id, itp_point_id, itp_instance_id, created_by, status, planned_inspection_time, notice_period_hours, expiry_time, location_description, scope_of_work, scheduler_arn, responded_by, responded_at, response_reason, requested_reschedule_time, cancelled_by, cancelled_at, cancellation_reason, timestamps)
    - Create partial unique index `idx_wp_notifications_pending_point` on `itp_point_id WHERE status = 'Pending'`
    - Create `wp_notification_recipients` table (id, notification_id, user_id, email, recipient_name, is_external, notified_at, created_at)
    - Create `wp_response_tokens` table (id, notification_id, recipient_id, token, expires_at, used_at, created_at)
    - Create `wp_auto_waivers` table (id, notification_id, itp_point_id, trigger_reason, triggered_at, time_elapsed_hours, metadata)
    - Create `project_wp_config` table (id, project_id UNIQUE, notice_period_hours with CHECK 1-168, timestamps)
    - Create `project_wp_default_recipients` table (id, project_id, user_id, email, recipient_name, is_external, role_filter, created_at)
    - ALTER TABLE `itp_points` ADD COLUMN `wp_waiver_status JSONB`
    - _Requirements: 1.1, 1.6, 2.1, 2.3, 3.1, 4.1, 4.6, 7.1_

  - [ ]* 1.2 Write unit tests for migration SQL validity
    - Verify all foreign key references are correct
    - Verify ENUM values match design specification
    - Verify CHECK constraints on notice_period_hours
    - _Requirements: 2.3_

- [x] 2. Backend service: witnessPointConfigService
  - [x] 2.1 Create `backend/src/services/witnessPointConfigService.js`
    - Implement `getProjectConfig(projectId)` — returns config or default (24 hours) if none exists
    - Implement `updateProjectConfig(projectId, { noticePeriodHours })` — validates range [1, 168], upserts config
    - Implement `getDefaultRecipients(projectId)` — returns array of default recipients for the project
    - Implement `addDefaultRecipient(projectId, { userId, email, recipientName, isExternal, roleFilter })`
    - Implement `removeDefaultRecipient(recipientId)`
    - _Requirements: 2.3, 7.1, 7.2_

  - [ ]* 2.2 Write property test for notice period configuration validation
    - **Property 7: Notice period configuration validation**
    - Test that values in [1, 168] are accepted and values outside are rejected
    - Test that missing config returns default of 24 hours
    - **Validates: Requirements 2.3**

- [x] 3. Backend service: witnessPointService (core notification lifecycle)
  - [x] 3.1 Create `backend/src/services/witnessPointService.js` with `createNotification`
    - Accept parameters: pointId, creatorId, { plannedInspectionTime, location, scope, recipientIds, externalRecipients }
    - Validate ITP point exists and is type 'WP'
    - Validate ITP instance status is 'Open'
    - Validate planned inspection time >= now + notice_period_hours (from project config)
    - Validate no existing 'Pending' notification for the point
    - Calculate expiry_time = planned_inspection_time - notice_period_hours
    - Insert into `wp_notifications` with status 'Pending'
    - Insert recipients into `wp_notification_recipients` (merge project defaults with provided overrides)
    - Generate crypto-random response tokens for each recipient, insert into `wp_response_tokens`
    - Queue notification emails via S3 (one per recipient, using existing emailService pattern)
    - Create audit log entry for notification creation
    - Use database transaction (BEGIN/COMMIT/ROLLBACK pattern from externalSignOffService)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.2, 7.3, 7.4_

  - [ ]* 3.2 Write property tests for notification creation validation
    - **Property 2: Time validation enforces notice period**
    - Generate random planned times and notice periods; verify acceptance iff planned_time >= now + notice_period
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 3.3 Write property test for duplicate prevention
    - **Property 3: Duplicate prevention**
    - Verify that creating a second notification for a point with an existing 'Pending' notification is rejected
    - **Validates: Requirements 1.6**

  - [x] 3.4 Implement `getNotificationByPoint(pointId)` and `getNotificationById(notificationId)`
    - Query wp_notifications with JOIN to recipients and tokens
    - Return full notification object with recipients list and status
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 3.5 Implement `respondToNotification` and `respondViaToken`
    - `respondViaToken(token, { responseType, reason, requestedTime })`: validate token not expired, not used, notification still pending
    - `respondToNotification(notificationId, { responseType, respondentId, reason, requestedTime })`: for authenticated internal users
    - Handle 'confirm': update status to 'Confirmed', record respondent and timestamp
    - Handle 'decline': update status to 'Declined', record reason, trigger auto-waiver
    - Handle 'reschedule': keep status 'Pending', record requested_reschedule_time, notify creator
    - Mark token as used (set used_at)
    - Create audit log entry for response
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 3.6 Write property tests for response state machine
    - **Property 9: Response state machine**
    - Generate random valid responses and verify correct status transitions
    - **Property 10: Token validity constraints**
    - Verify tokens rejected after planned_inspection_time or after use
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 3.7 Implement `cancelNotification(notificationId, userId, reason)`
    - Validate notification exists and status is 'Pending'
    - Update status to 'Cancelled', record cancelled_by, cancelled_at, cancellation_reason
    - Send cancellation email to all recipients
    - Cancel EventBridge schedule (call timerService.cancelTimer)
    - Create audit log entry
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.8 Write property test for cancellation state machine
    - **Property 14: Cancellation state machine**
    - Verify cancellation succeeds only when status is 'Pending', rejected for all other statuses
    - **Validates: Requirements 5.1, 5.3**

  - [x] 3.9 Implement `getAuditTrail({ instanceId, pointId, status, dateFrom, dateTo })`
    - Query audit_logs with JSONB metadata filtering
    - Support filtering by ITP instance, ITP point, notification status, and date range
    - Return ordered results with pagination
    - _Requirements: 6.1, 6.5, 6.6_

  - [ ]* 3.10 Write property test for audit trail filtering
    - **Property 16: Audit trail filtering**
    - Generate random audit entries and filter combinations; verify results match all specified criteria
    - **Validates: Requirements 6.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Backend service: witnessPointTimerService
  - [x] 5.1 Create `backend/src/services/witnessPointTimerService.js`
    - Implement `createTimer(notificationId, expiryTime)`: create EventBridge Scheduler one-shot schedule targeting the wp-timer Lambda, store scheduler_arn on the notification record
    - Implement `cancelTimer(notificationId)`: delete the EventBridge schedule by ARN, set scheduler_arn to NULL
    - Implement `getRemainingTime(notificationId)`: calculate remaining time as planned_inspection_time - now, return { hours, minutes, seconds }
    - Use `@aws-sdk/client-scheduler` for EventBridge Scheduler API calls
    - Handle schedule creation failure gracefully (log error, set scheduler_arn to NULL for fallback sweep)
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.4_

  - [x] 5.2 Implement `processAutoWaiver(notificationId)`
    - Validate notification exists and status is still 'Pending' (idempotent — no-op if already responded/cancelled)
    - Update notification status to 'Expired'
    - Insert record into `wp_auto_waivers` with trigger_reason 'timer_expired' and time_elapsed_hours
    - Update `itp_points.wp_waiver_status` JSONB with waiver metadata
    - Send waiver confirmation email to notification creator
    - Send waiver notification email to original recipients
    - Create audit log entry
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 5.3 Implement auto-waiver on decline (called from respondToNotification when responseType is 'decline')
    - Insert record into `wp_auto_waivers` with trigger_reason 'recipient_declined'
    - Update `itp_points.wp_waiver_status` JSONB
    - Send waiver confirmation email to creator
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ]* 5.4 Write property tests for timer and auto-waiver logic
    - **Property 5: Expiry time calculation**
    - For random planned_inspection_time T and notice_period N, verify expiry = T - N hours
    - **Property 11: Auto-waiver on expiry**
    - Verify pending notifications at expiry time trigger waiver with reason 'timer_expired'
    - **Property 12: Auto-waiver on decline**
    - Verify decline triggers immediate waiver with reason 'recipient_declined'
    - **Property 13: Waiver record completeness**
    - Verify waiver record contains trigger_reason and ITP point metadata is updated
    - **Validates: Requirements 2.1, 2.4, 4.1, 4.4, 4.5, 4.6**

  - [ ]* 5.5 Write property test for remaining time calculation
    - **Property 6: Remaining time calculation**
    - For random planned_inspection_time T and current time now < T, verify remaining = T - now decomposed correctly
    - **Validates: Requirements 2.2**

- [x] 6. Backend controller and routes
  - [x] 6.1 Create `backend/src/controllers/witnessPointController.js`
    - Implement all 11 endpoint handlers following itpController pattern (request validation, error handling, try/catch)
    - `createNotification` — POST, authenticated, role check (SC/HC only)
    - `getNotificationByPoint` — GET, authenticated
    - `getNotificationById` — GET, authenticated
    - `cancelNotification` — POST, authenticated, creator-only check
    - `respondAuthenticated` — POST, authenticated (internal user response)
    - `getRemainingTime` — GET, authenticated
    - `getAuditTrail` — GET, authenticated
    - `processAutoWaive` — POST, internal only (Lambda invocation, validate with shared secret or internal header)
    - `validateToken` — GET, public
    - `respondViaToken` — POST, public
    - `getProjectWPConfig` — GET, authenticated
    - `updateProjectWPConfig` — PUT, authenticated, role check (HC/Admin only)
    - _Requirements: 1.1, 3.7, 5.1, 6.6, 7.1, 8.3_

  - [x] 6.2 Create `backend/src/routes/witnessPointNotifications.js`
    - Register all routes with appropriate middleware (auth for authenticated, none for public token routes)
    - Follow externalSignOff.js pattern for public vs authenticated route separation
    - _Requirements: 3.1, 3.7_

  - [x] 6.3 Register routes in `backend/src/index.js`
    - Import witnessPointNotifications routes
    - Mount at `/api/wp-notifications`
    - Add project WP config routes to existing projects router or as sub-routes
    - _Requirements: All API endpoints_

  - [ ]* 6.4 Write unit tests for witnessPointController
    - Test request validation (missing fields, invalid types)
    - Test role authorization checks
    - Test error response formats match design error handling table
    - _Requirements: 1.2, 1.3, 1.7, 5.3_

- [x] 7. Email templates for witness point notifications
  - [x] 7.1 Add email functions to `backend/src/services/emailService.js`
    - `sendWitnessPointNotificationEmail(toEmail, token, context)` — notification raised, includes response link with token
    - `sendWitnessPointWaiverEmail(toEmail, context)` — auto-waiver triggered, sent to creator
    - `sendWitnessPointWaiverNoticeEmail(toEmail, context)` — waiver notice sent to recipient
    - `sendWitnessPointCancellationEmail(toEmail, context)` — notification cancelled
    - `sendWitnessPointRescheduleRequestEmail(toEmail, context)` — reschedule requested, sent to creator
    - All use S3 → Lambda → SES pattern with `wp-notification/` key prefix
    - _Requirements: 1.5, 4.2, 4.3, 5.2, 3.4_

  - [ ]* 7.2 Write unit tests for email payload format
    - Verify each email function produces correct S3 payload structure
    - Verify response token link is correctly embedded
    - _Requirements: 1.5, 6.2_

- [x] 8. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Infrastructure: Timer Lambda and CDK updates
  - [x] 9.1 Create `infrastructure/lambda/wp-timer/index.js`
    - Lambda handler triggered by EventBridge Scheduler
    - Extract notification ID from event payload
    - Call backend auto-waive endpoint (POST /api/wp-notifications/:id/auto-waive) with internal auth header
    - Handle errors gracefully (log and return, don't throw to avoid retries on permanent failures)
    - _Requirements: 2.4, 4.1_

  - [x] 9.2 Create fallback sweep logic in wp-timer Lambda
    - Secondary handler (or scheduled rule) that runs every 5 minutes
    - Query for notifications WHERE status='Pending' AND expiry_time <= NOW() AND scheduler_arn IS NULL
    - Call auto-waive for each found notification
    - _Requirements: 2.4, 4.1 (fallback mechanism from design error handling)_

  - [x] 9.3 Update CDK stack `infrastructure/lib/itpapp-stack.ts`
    - Add new Lambda function for wp-timer handler
    - Add EventBridge Scheduler IAM role with `scheduler:CreateSchedule` and `scheduler:DeleteSchedule` permissions for the backend Lambda
    - Add `@aws-sdk/client-scheduler` dependency to backend Lambda
    - Add S3 lifecycle rule for `wp-notification/` prefix with 7-day expiry
    - Grant wp-timer Lambda permission to invoke backend API
    - _Requirements: 2.4, 4.1_

- [x] 10. Frontend: WitnessPointResponse page (public token-based response)
  - [x] 10.1 Create `frontend/src/pages/WitnessPointResponse.tsx`
    - Mirror `ExternalSignOff.tsx` pattern for token-based public page
    - Extract token from URL params (React Router)
    - On mount: call GET `/api/wp-notifications/token/:token/validate` to get notification context
    - Display: project name, ITP name, point description, planned inspection time, location, scope
    - Three response buttons: "Confirm Attendance", "Decline", "Request Reschedule"
    - Decline: show textarea for reason (required)
    - Reschedule: show datetime picker for proposed new time (required)
    - Submit: POST `/api/wp-notifications/token/:token/respond` with { responseType, reason, requestedTime }
    - Show success/error states, handle expired/used token gracefully
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 10.2 Add route for WitnessPointResponse in `frontend/src/App.tsx`
    - Add route: `/wp-response/:token` → `WitnessPointResponse` component
    - Public route (no ProtectedRoute wrapper)
    - _Requirements: 3.1_

- [x] 11. Frontend: Notification components for ITP Execution
  - [x] 11.1 Create `frontend/src/components/CountdownTimer.tsx`
    - Accept props: `plannedInspectionTime` (ISO string), `status` (notification status)
    - Calculate remaining time client-side, update every second with setInterval
    - Display as HH:MM:SS format
    - Show "Expired" when time reaches zero
    - Only render countdown when status is 'Pending'
    - _Requirements: 2.2_

  - [x] 11.2 Create `frontend/src/components/RaiseNotificationModal.tsx`
    - Modal form with fields: planned inspection time (datetime-local input), location description, scope of work
    - Pre-populate recipients from project defaults (fetched on open)
    - Allow adding/removing recipients (internal user search + external email input)
    - Validate planned time is in the future
    - Submit: POST `/api/wp-notifications` with form data
    - Show loading state and error handling
    - _Requirements: 1.1, 1.2, 7.2, 7.3_

  - [x] 11.3 Create `frontend/src/components/NotificationPanel.tsx`
    - Accept props: `pointId`, `pointType`, `itpStatus`
    - Fetch notification state: GET `/api/wp-notifications/point/:pointId`
    - Display notification status badge (color-coded: Pending=yellow, Confirmed=green, Declined=orange, Expired=red, Cancelled=gray)
    - Show CountdownTimer when status is 'Pending'
    - Show "Raise Notification" button when: pointType='WP', itpStatus='Open', no active notification
    - Show waiver indicator when auto-waiver has been triggered
    - Show warning banner when notification is pending and user attempts sign-off
    - Show "Confirmed but not signed off" indicator per Requirement 8.5
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 11.4 Integrate NotificationPanel into `frontend/src/pages/ITPExecution.tsx`
    - Render NotificationPanel for each point where type='WP'
    - Pass pointId, pointType, and ITP instance status as props
    - Wire RaiseNotificationModal open/close from NotificationPanel button
    - Ensure sign-off is NOT blocked by notification status (advisory warning only)
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 12. Frontend: Project WP Configuration
  - [x] 12.1 Create `frontend/src/components/WPConfigSection.tsx`
    - Fetch current config: GET `/api/projects/:id/wp-config`
    - Notice period input (number input, 1-168 hours, with validation)
    - Default recipients list with add/remove functionality
    - Add recipient: search internal users or enter external email
    - Save: PUT `/api/projects/:id/wp-config`
    - _Requirements: 2.3, 7.1, 7.2, 7.3_

  - [x] 12.2 Integrate WPConfigSection into `frontend/src/pages/ProjectDetails.tsx`
    - Add "Witness Point Settings" section to project details page
    - Only visible to Head Contractor and Admin roles
    - _Requirements: 7.1_

- [x] 13. Integration: Sign-off audit metadata
  - [x] 13.1 Modify `backend/src/controllers/itpController.js` signOffPoint method
    - Before sign-off, query wp_notifications for the point being signed off
    - Include notification status in the audit log metadata for the sign-off event
    - This is a small addition to the existing logAudit call in signOffPoint
    - _Requirements: 8.4_

  - [ ]* 13.2 Write property test for sign-off non-blocking invariant
    - **Property 19: Sign-off not blocked by notification status**
    - For any notification status (or no notification), verify sign-off succeeds
    - **Property 20: Sign-off audit includes notification status**
    - Verify sign-off audit metadata includes notification status when a notification exists
    - **Validates: Requirements 8.3, 8.4**

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows existing patterns: externalSignOffService for token workflows, emailService for S3-based email dispatch, itpController for transaction handling and audit logging
- `@aws-sdk/client-scheduler` needs to be added to backend dependencies for EventBridge Scheduler integration
- fast-check is already available in devDependencies for property-based testing

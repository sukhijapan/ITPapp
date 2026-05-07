<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
  Maintainer: Development Team
-->

# Glossary

This glossary maps construction QA terminology and technical concepts to their meaning within the Construction Quality Management application. Terms are organized into three sections and listed alphabetically within each.

---

## Table of Contents

- [Construction QA Terms](#construction-qa-terms)
- [Application Workflow Terms](#application-workflow-terms)
- [Technical Infrastructure Terms](#technical-infrastructure-terms)

---

## Construction QA Terms

| Term | Definition |
|------|-----------|
| **Corrective Action** | The work performed to fix a non-conformance. Recorded on the NCR as part of the resolution process. |
| **Disposition** | The decision on how to handle a non-conformance (e.g., rework, accept as-is, reject). Recorded during NCR resolution. |
| **Drawing Reference** | A reference to the engineering drawing associated with an ITP point, identifying the specific construction element being inspected. |
| **Hold Point (HP)** | An inspection point that blocks all subsequent points in the sequence until it is signed off by an authorized role. The most restrictive point type. |
| **Inspection and Test Plan (ITP)** | The core quality document that defines a series of inspection points for a specific construction activity or lot. Tracks quality compliance from start to finish. |
| **Inspection Point (IP)** | A basic inspection point requiring sign-off but without notification or blocking requirements. The least restrictive point type. |
| **ITP Instance** | A specific execution of an ITP template, created for a particular lot or work area. Contains the actual sign-off records and progresses through the lifecycle. |
| **ITP Template** | A reusable definition of an ITP structure including point types, sequences, and descriptions. Used to create ITP instances. |
| **Lot Number** | An identifier for the specific construction lot or work area that an ITP instance covers. |
| **Non-Conformance Report (NCR)** | A formal record of a defect or deviation from specifications discovered during an inspection. Linked to a specific ITP point. |
| **Point Sequence** | The numerical order of inspection points within an ITP. Hold Points enforce sequential completion — earlier HPs must be signed off before later points can proceed. |
| **Review Point (RP)** | An inspection point that requires document review and sign-off but does not block subsequent points or require advance notification. |
| **Root Cause** | The underlying reason a non-conformance occurred. Documented during NCR resolution to prevent recurrence. |
| **Sample Point (SP)** | An inspection point for material sampling or testing. Requires sign-off to confirm the sample was taken and results recorded. |
| **Verification** | The process of confirming that a corrective action has been properly implemented. Performed by the Head Contractor or Client to close an NCR. |
| **Witness Point (WP)** | An inspection point that requires advance notification to stakeholders, giving them the opportunity to attend the inspection. If no response is received, attendance is automatically waived. |

---

## Application Workflow Terms

| Term | Definition |
|------|-----------|
| **Approved** | ITP status indicating the plan has been reviewed and accepted by the Head Contractor or Client. Transitions to Closed. |
| **Auto-Close** | The automatic transition of an ITP from Pending Review to Closed when approved. No manual close action is required. |
| **Auto-Waiver** | The automatic waiving of witness point attendance when no recipient responds before the notice period expires. Allows the contractor to proceed with the inspection. |
| **Closed** | Terminal status for both ITPs (all approvals complete) and NCRs (verification complete). Represents a finished quality record. |
| **Confirm** | A witness point notification response indicating the recipient will attend the inspection. |
| **Decline** | A witness point notification response indicating the recipient waives their right to attend the inspection. |
| **Draft** | Initial ITP status. The plan is being prepared and is not yet active. Points cannot be signed off in this state. |
| **External Sign-Off** | A sign-off performed by a party outside the system via a secure tokenized link. Used for third-party inspectors or regulatory bodies. |
| **Notice Period** | The minimum advance warning time (configured per project) before a witness point inspection occurs. Recipients must be notified at least this far in advance. |
| **Open** | Active status for both ITPs (points can be signed off) and NCRs (defect has been raised but not yet resolved). |
| **Pending Review** | ITP status indicating all points are approved and the plan is awaiting final review by the Head Contractor or Client. |
| **Rejected** | ITP status indicating the plan was reviewed and not accepted. Can transition back to Open via resubmission for further work. |
| **Resolved** | NCR status indicating a corrective action has been provided but not yet verified by the Head Contractor or Client. |
| **Sign-Off** | The act of approving an inspection point, recording the signatory, role, and timestamp. Subject to HP blocking and NCR blocking rules. |
| **Verified** | NCR status indicating the corrective action has been confirmed as adequate. Transitions to Closed. |

---

## Technical Infrastructure Terms

| Term | Definition |
|------|-----------|
| **CloudFront** | AWS content delivery network (CDN) used to serve the React SPA frontend with HTTPS enforcement and SPA routing (404 → index.html). |
| **EventBridge Schedule** | A one-shot AWS EventBridge Scheduler rule that fires at a specific future time. Used to trigger witness point auto-waivers at expiry. |
| **JWT (JSON Web Token)** | A stateless authentication token issued on login, containing the user's ID and role. Included as a Bearer token in API request headers. |
| **Lambda Function URL** | A direct HTTPS endpoint for an AWS Lambda function, used to expose the backend API without API Gateway. Reduces cost and eliminates the 30-second timeout. |
| **Presigned URL** | A time-limited S3 URL that grants temporary permission to upload or download a specific file. Used for direct browser-to-S3 media uploads (expires after 5 minutes). |
| **RBAC (Role-Based Access Control)** | The permission system that restricts actions based on the user's assigned role. Four roles: Subcontractor, Head Contractor, Client, Admin. |
| **S3 Gateway Endpoint** | A free VPC endpoint that allows Lambda functions inside the VPC to access S3 without internet access or NAT Gateway. |
| **S3 Notification Pattern** | The architecture pattern where the VPC-based backend Lambda writes JSON to S3, triggering a non-VPC Lambda to send emails via SES. Avoids NAT Gateway costs. |
| **serverless-http** | An npm package that wraps an Express application to run inside AWS Lambda, translating Lambda events into standard HTTP request/response objects. |
| **SES (Simple Email Service)** | AWS email service used for sending transactional emails: invitations, password resets, witness point notifications, and NCR alerts. |

---

[← Back to Documentation Index](./README.md)

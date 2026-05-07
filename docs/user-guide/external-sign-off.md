<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# External Sign-Off

External sign-off allows you to request approval from people who don't have an account in the system — such as third-party inspectors, consultants, or regulatory authorities. They receive a secure link via email and can approve without logging in.

## How External Sign-Off Works

1. You request an external sign-off on an ITP point
2. The system generates a unique, time-limited token
3. An email is sent to the external party with a sign-off link
4. The external party clicks the link, reviews the details, and completes the sign-off
5. Their approval is recorded against the ITP point

## Requesting an External Sign-Off

### Steps

1. Open the ITP and navigate to the point requiring external approval
2. Click **Request External Sign-Off**
3. Enter the external party's details:
   - **Name** — The person's full name
   - **Email** — Where to send the sign-off link
   - **Company** — Their organization (optional)
4. Click **Send Request**

### Expected Outcome

- An email is sent to the specified address with a unique sign-off link
- The request is recorded against the ITP point
- The token is valid for **48 hours**

## The 48-Hour Token Expiry

External sign-off tokens have a strict expiry:

- **Valid for 48 hours** from the time the request is created
- After 48 hours, the link no longer works
- If the token expires, you must create a new request

### Why 48 Hours?

- Security — Limits the window of exposure for the sign-off link
- Urgency — Encourages timely response from external parties
- Audit — Provides a clear timeline for when approvals were requested and completed

## Completing Sign-Off via Link (External Party)

When an external party receives the email:

### Steps (for the External Party)

1. Open the email and click the **Sign Off** link
2. The link opens a page showing:
   - ITP details (name, project, lot number)
   - Point details (description, type, sequence)
   - Any attached media or evidence
3. Review the information
4. Click **Approve** to complete the sign-off
5. A confirmation page is displayed

### What the External Party Sees

- They do **not** need to create an account or log in
- The page shows only the relevant point information
- Once signed, they cannot undo the approval
- The page confirms their sign-off was recorded

## Tracking External Sign-Off Requests

### Viewing Request Status

1. Open the ITP point
2. External sign-off requests are listed with their status:
   - **Pending** — Email sent, awaiting response
   - **Completed** — External party has signed off
   - **Expired** — 48-hour window has passed without sign-off

### Re-Requesting After Expiry

If a token expires:

1. Navigate to the point
2. Create a new external sign-off request
3. A fresh 48-hour token is generated and emailed

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Request external sign-off | ✓ | ✓ | ✗ | ✓ |
| View external sign-off status | ✓ | ✓ | ✓ | ✓ |
| Complete sign-off (external party) | N/A | N/A | N/A | N/A |

Note: External parties are not system users — they interact only through the token-based link.

## Tips & Common Questions

**Q: Can I send multiple external sign-off requests for the same point?**  
A: Yes. You can request sign-off from multiple external parties on the same point.

**Q: What if the external party didn't receive the email?**  
A: Check the email address was correct. If needed, create a new request with the correct address. The original token remains valid until it expires.

**Q: Can I cancel an external sign-off request?**  
A: The token will expire naturally after 48 hours. There is no explicit cancel action — simply don't use the token.

**Q: Does external sign-off replace internal sign-off?**  
A: No. External sign-off is an additional approval. The point still requires internal sign-off from authorized roles.

**Q: Is the external sign-off link secure?**  
A: Yes. Each link contains a cryptographically random token that is single-use and time-limited. The token cannot be guessed or reused.

**Q: What information does the external party see?**  
A: Only the specific point details, ITP name, project name, and any attached media. They cannot access other parts of the system.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)

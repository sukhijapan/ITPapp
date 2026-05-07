# ADR-005: Token-Based External Approval Pattern

## Status

Accepted

## Context

Construction quality management requires sign-offs from external parties (e.g., third-party inspectors, client representatives) who do not have accounts in the system. These parties need to approve or reject specific inspection points without creating an account or logging in.

Requirements:
- External parties must be able to sign off on individual ITP points
- No account creation or login required
- Time-limited access (cannot remain valid indefinitely)
- Secure — tokens must not be guessable
- Auditable — the system must record who signed off and when

Options considered:
1. **Temporary user accounts** — Creates account management overhead, external parties may never log in again
2. **Magic links with JWT** — JWTs are self-contained but harder to invalidate
3. **Database-backed opaque tokens** — Simple, revocable, time-limited
4. **OAuth2 with external IdP** — Massive overkill for one-time approvals

## Decision

We use **cryptographically random opaque tokens** stored in the database with a **48-hour expiry**. Each token is scoped to a single ITP point and a specific external signer.

**Flow:**
1. An authenticated user requests an external sign-off for a specific point
2. Backend generates a 32-byte random token (`crypto.randomBytes(32).toString('hex')`)
3. Token is stored in `external_sign_off_tokens` table with point ID, email, role, and expiry
4. An email is sent to the external party with a link containing the token
5. External party clicks the link, views the point details, and submits approval/rejection
6. Token is marked as used (`used_at` timestamp set)

```javascript
// backend/src/services/externalSignOffService.js
const token = crypto.randomBytes(32).toString('hex');
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS); // 48 hours

// Any existing unused tokens for this point are invalidated
await client.query(
  "UPDATE external_sign_off_tokens SET used_at = CURRENT_TIMESTAMP WHERE itp_point_id = $1 AND used_at IS NULL",
  [pointId]
);
```

**Validation checks on sign-off execution:**
- Token exists and is not expired
- Token has not been used
- ITP instance is in `Open` status
- No unsigned Hold Points precede this point (HP blocking)
- No unresolved NCRs linked to this point (for approval)

## Consequences

**Positive:**
- Zero friction for external parties — no account, no login, just click a link
- Secure — 256-bit random tokens are not guessable (2^256 possible values)
- Time-limited — 48-hour expiry prevents stale links from being used weeks later
- Single-use — once used, the token cannot be reused
- Auditable — `external_sign_off_tokens` table records email, timestamp, and the sign-off action
- Revocable — existing tokens are invalidated when a new sign-off is requested for the same point

**Negative:**
- Email dependency — if the email is not delivered, the external party cannot sign off
- No identity verification beyond email — anyone with the link can sign off (mitigated by 48-hour expiry and single-use)
- Token stored in plaintext — if the database is compromised, tokens could be used (mitigated by short expiry)
- One token per point — requesting a new sign-off invalidates the previous token, which could confuse the original recipient

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)

# ADR-004: JWT Authentication with Role-Based Access Control

## Status

Accepted

## Context

The application serves four distinct user roles with different permission levels:
- **Subcontractor** (role_id: 1) — Creates and executes ITPs, raises NCRs
- **Head Contractor** (role_id: 2) — Reviews and approves ITPs, manages projects
- **Client** (role_id: 3) — Views and approves ITPs, read-only access to most resources
- **Admin** (role_id: 4) — Full system access, user management, configuration

The system needs stateless authentication suitable for a serverless Lambda backend where there is no persistent server process to maintain sessions.

Options considered:
1. **Session-based auth** — Requires a session store (Redis/DynamoDB), adds latency and cost
2. **JWT tokens** — Stateless, self-contained, no external store needed
3. **AWS Cognito** — Managed auth but adds vendor lock-in and complexity for a simple role model
4. **OAuth2/OIDC** — Overkill for a single-application system with no third-party integrations

## Decision

We use **JWT (JSON Web Tokens)** for authentication with a simple **role-based access control (RBAC)** model. The implementation uses the `jsonwebtoken` library with a symmetric secret (`JWT_SECRET` environment variable).

**Authentication flow:**
1. User logs in with email/password
2. Backend verifies credentials against bcrypt-hashed password in PostgreSQL
3. Backend issues a JWT containing `{ id, email, roleId, roleName }`
4. Client sends JWT in `Authorization: Bearer <token>` header on subsequent requests

**Authorization middleware:**
```javascript
// backend/src/middleware/auth.js — verifies JWT
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;

// backend/src/middleware/role.js — checks role
module.exports = (allowedRoleIds) => {
  return (req, res, next) => {
    if (!allowedRoleIds.includes(req.user.roleId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};
```

Routes apply both middleware in sequence:
```javascript
router.post('/projects', auth, role([2, 4]), projectController.create);
```

## Consequences

**Positive:**
- Stateless — no session store required, perfect for Lambda's ephemeral execution model
- Simple — two middleware functions handle all auth/authz logic
- Fast — JWT verification is a local cryptographic operation, no network call
- Flexible — role arrays on routes make permission changes trivial
- Self-contained — token carries all information needed for authorization decisions

**Negative:**
- No token revocation — once issued, a JWT is valid until expiry (mitigated by short expiry times)
- Secret rotation requires redeployment — changing `JWT_SECRET` invalidates all active tokens
- Role changes require re-login — if an admin changes a user's role, the old JWT still carries the previous role
- No refresh token mechanism — users must re-authenticate when the token expires
- Symmetric signing — if `JWT_SECRET` is compromised, tokens can be forged (acceptable for single-service architecture)

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)

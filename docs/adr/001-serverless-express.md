# ADR-001: Express on Lambda via serverless-http

## Status

Accepted

## Context

The application requires a REST API backend serving 60+ endpoints across multiple domains (authentication, ITPs, NCRs, media, witness points, etc.). The team needed to choose between:

1. **API Gateway + individual Lambda functions** — one function per endpoint or resource group
2. **Express on Lambda** — a single Lambda running a full Express application via an adapter
3. **Container-based deployment** — ECS/Fargate running Express

Key constraints:
- Small team needing rapid iteration
- Existing Express expertise
- Cost sensitivity (construction industry SaaS, not high-traffic)
- Need for local development parity with production

## Decision

We use **Express 5 running on AWS Lambda** via the `serverless-http` adapter (v4). The Lambda is exposed through a Lambda Function URL (not API Gateway) to reduce cost and complexity.

The backend Lambda (`ItpBackend`) runs inside a VPC for database access and is configured with:
- Node.js 20.x runtime
- 2048 MB memory, 90-second timeout
- Function URL with CORS configured for the frontend domain
- `serverless-http` wraps the Express app, handling binary content types (PDF, images)

```javascript
// backend/src/index.js
const serverless = require('serverless-http');
const express = require('express');
const app = express();

// ... route registration ...

module.exports.handler = serverless(app, {
  binary: ['application/pdf', 'application/octet-stream', 'image/*'],
});
```

## Consequences

**Positive:**
- Single codebase with standard Express patterns (middleware, routing, error handling)
- Local development runs the same Express app directly (`node src/index.js`)
- Familiar ecosystem: `express-rate-limit`, `multer`, `morgan`, `cors` all work unchanged
- Lambda Function URL eliminates API Gateway costs and 30-second timeout limit
- Cold starts are acceptable (~1-2s) given the non-real-time nature of construction QA workflows

**Negative:**
- Single Lambda handles all traffic — cannot scale individual endpoints independently
- Cold starts affect first request after idle period (mitigated by 2048 MB memory allocation)
- 90-second timeout is a hard ceiling for any single request (PDF generation is the longest operation)
- Binary response handling requires explicit content-type declaration in `serverless-http` config
- Cannot use Lambda@Edge or CloudFront Functions for API routing

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)

# ADR-008: CloudFront + S3 for Frontend Hosting with SPA Routing

## Status

Accepted

## Context

The frontend is a React 19 Single Page Application (SPA) that uses client-side routing (React Router). It needs to be served globally with low latency, handle direct URL access to any route, and enforce HTTPS.

Options considered:
1. **S3 static website hosting** — Simple but no HTTPS on custom domains, no edge caching
2. **CloudFront + S3** — Global CDN, HTTPS, custom error responses for SPA routing
3. **Amplify Hosting** — Managed but less control over caching and infrastructure
4. **Lambda@Edge SSR** — Server-side rendering adds complexity not needed for this application
5. **Vercel/Netlify** — External hosting, less integration with AWS infrastructure

## Decision

We use **Amazon CloudFront** as a CDN in front of an **S3 bucket** for frontend hosting. The S3 bucket uses `BlockPublicAccess.BLOCK_ALL` — CloudFront accesses it via an Origin Access Identity (OAI), not public bucket access.

**SPA routing** is handled via CloudFront custom error responses:
```typescript
// infrastructure/lib/itpapp-stack.ts
errorResponses: [
  { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
  { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
],
```

When a user navigates directly to `/projects/123`, S3 returns a 404 (no such key). CloudFront intercepts this and serves `index.html` with a 200 status, allowing React Router to handle the route client-side.

**Deployment** uses CDK's `BucketDeployment` construct which:
1. Uploads the built frontend (`frontend/dist`) to S3
2. Creates a CloudFront invalidation (`/*`) to clear cached assets

```typescript
new s3_deployment.BucketDeployment(this, 'DeployFrontend', {
  sources: [s3_deployment.Source.asset('../frontend/dist')],
  destinationBucket: frontendBucket,
  distribution,
  distributionPaths: ['/*'],
});
```

## Consequences

**Positive:**
- Global edge caching — assets served from the nearest CloudFront PoP (200+ locations)
- HTTPS enforced — `ViewerProtocolPolicy.REDIRECT_TO_HTTPS` ensures all traffic is encrypted
- SPA routing works — custom error responses serve `index.html` for all routes
- Cost-effective — S3 storage is pennies/month for a built React app, CloudFront free tier covers 1TB/month
- No server to manage — fully managed infrastructure, no patching or scaling concerns
- Secure — S3 bucket is not publicly accessible, only CloudFront can read from it
- Cache invalidation on deploy — users always get the latest version after deployment

**Negative:**
- No server-side rendering — initial page load sends an empty HTML shell (acceptable for an authenticated app where SEO is irrelevant)
- Cache invalidation delay — CloudFront invalidations can take 1-5 minutes to propagate globally
- Custom error response is a blunt instrument — all 404s become 200s, making it harder to detect genuinely missing assets (mitigated by hashed filenames in the build output)
- No per-route caching control — all routes serve the same `index.html` (fine for SPAs)
- CloudFront distribution changes are slow to deploy (~5-10 minutes)

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)

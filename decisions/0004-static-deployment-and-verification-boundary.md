# 0004. Static deployment and verification boundary

**Status:** Accepted
**Date:** 2026-09-11

## Context

The website is a static build. Publication should preserve exact generated output, security headers, custom 404 behavior, a constrained dependency graph, and a clear separation between verifying a release and authorizing deployment.

## Decision

Use Cloudflare Workers Static Assets as the production target with no Worker application script. `wrangler.jsonc` serves `./dist`, uses `404-page` not-found handling and `drop-trailing-slash` HTML handling, binds the apex custom domain, and disables `workers.dev` and Preview URLs.

The repository pins its release Node/npm baseline and dependency graph. CI runs verification with read-only permissions and does not deploy. Approved identity assets are hash-pinned. Source/build verifiers enforce durable security, metadata, route, asset, and public-boundary constraints without encoding ordinary editorial or visual choices as machine policy.

The production deployment CLI remains outside the website build dependency graph. Each release records the exact release-tool version and verifies the live domain, routing, response headers, and any host-injected analytics or behavior after deployment.

Astro emits first-party CSS as external stylesheets so the production CSP does not need `unsafe-inline` style execution.

## Consequences

- Build verification and publication authority remain separate.
- The generated static artifact can be audited before deployment.
- CI cannot publish the site.
- Routine copy and styling changes remain maintainable without rewriting verification code unless they change a durable release constraint.

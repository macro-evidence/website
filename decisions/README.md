# Architecture Decision Records

Non-trivial technical and public-interface decisions for the Macro Evidence website are recorded here, per [`GOVERNANCE.md`](https://github.com/macro-evidence/governance/blob/main/GOVERNANCE.md) §5.

These are decisions specific to this repository. Decisions that genuinely apply across multiple Macro Evidence repositories or to the organization's structure itself are recorded in [`governance/decisions/`](https://github.com/macro-evidence/governance/tree/main/decisions) instead.

## Format

One file per decision: `NNNN-short-title.md`, numbered sequentially, using:

```
# NNNN. Short title

**Status:** Proposed / Accepted / Superseded
**Date:** YYYY-MM-DD

## Context
What problem or question this addresses.

## Decision
What was decided.

## Consequences
Expected benefits, trade-offs, risks, and follow-up implications.
```

**Decision count per ADR:** Most ADRs record one coherent decision boundary under the singular `## Decision` heading. An ADR may use a plural `## Decisions` heading only when multiple decisions are inseparable. Decisions that can be accepted, revisited, or superseded independently receive separate ADR numbers.

## Decisions

- [0001. First-party organization website boundary](0001-first-party-organization-website-boundary.md)
- [0002. Static low-data site architecture](0002-static-low-data-site-architecture.md)
- [0003. Separate source, content, identity, and third-party rights](0003-separate-source-content-identity-and-third-party-rights.md)
- [0004. Static deployment and verification boundary](0004-static-deployment-and-verification-boundary.md)
- [0005. Keep canonical records in their owning repositories, not website mirrors](0005-keep-canonical-records-in-their-owning-repositories.md)

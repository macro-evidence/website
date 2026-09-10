# 0003. Separate source, content, identity, and third-party rights

**Status:** Accepted
**Date:** 2026-09-11

## Context

The repository contains software/source code, visitor-facing editorial content, official Macro Evidence identity assets, and separately licensed third-party material used by the build. Those rights layers should not be conflated.

## Decision

Use separate licensing boundaries:

- Website software, source code, configuration, and repository implementation documentation under Apache License 2.0 (`LICENSE`).
- Visitor-facing textual content under Creative Commons Attribution-ShareAlike 4.0 International (`LICENSE-CONTENT` and `LICENSING.md`).
- Official Macro Evidence identity assets outside those blanket grants, governed separately by `BRAND_ASSETS.md`, the Trademarks Policy, and applicable law.
- Separately licensed third-party material under its applicable upstream terms, with relevant provenance and notices recorded in `THIRD_PARTY_NOTICES.md`.

Website-owned summaries or adaptations of organization material remain visitor-facing content under CC BY-SA 4.0. Canonical governance, policy, contribution, and security records are not republished as repository-owned website snapshots; relevant pages link to the canonical repositories that own those records.

Package metadata identifies the website software package as Apache-2.0 while repository documentation keeps visitor-content, identity, and third-party licensing boundaries explicit. The public `/licensing` route gives visitors a first-party orientation to the same boundaries. The production build carries the exact Apache-2.0, CC BY-SA 4.0, and Inter OFL texts under `/licenses/` together with the Inter attribution notice.

## Consequences

- Software reuse, editorial-content reuse, and identity rights remain legible.
- Website summaries can reference canonical public records without creating a second licensed snapshot corpus.
- Public identity downloads do not silently become Apache- or CC-licensed assets.
- Third-party material does not silently inherit the repository software or visitor-content license.
- Visitors can inspect the applicable website license texts without needing to infer the repository rights model from GitHub.
- New content, assets, and dependencies must be classified into the appropriate rights layer before release.

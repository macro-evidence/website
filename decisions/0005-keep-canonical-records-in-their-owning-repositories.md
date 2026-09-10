# 0005. Keep canonical records in their owning repositories, not website mirrors

**Status:** Accepted
**Date:** 2026-09-11

## Context

Macro Evidence's institutional website needs to make governance, participation, security, and identity policy understandable without obscuring which repository actually owns each record.

A pinned first-party mirror of selected `governance` and `.github` records was evaluated during initial implementation. The approach could preserve immutable source provenance and support offline builds, but it also duplicated a large document corpus inside the website, required synchronization and Markdown-publication machinery, and produced a repository-document reading experience inside pages designed as an institutional website. Browser review showed that long record titles, document tables, source-oriented metadata, and source-authored outbound links weakened compact-screen usability and did not eliminate every unexpected transition to GitHub.

The mirror therefore introduced ongoing maintenance and presentation cost without enough additional visitor value for the initial organization website.

## Decision

Keep canonical organization records in the repositories that own them and make the first-party website an orientation layer rather than a second document repository.

The website:

- Explains the organization, governance model, contribution path, security reporting path, identity-use boundary, and other visitor-facing subjects in concise website-owned copy.
- Links to the current canonical record in `macro-evidence/governance`, `macro-evidence/.github`, or another owning repository when full source material is needed.
- Makes a GitHub destination explicit in the link text or immediately associated context before the visitor activates the link.
- Does not store synchronized canonical-record snapshots, a canonical-record manifest, or canonical-record rendering routes.
- Does not fetch canonical source repositories during build, CI, or serving.
- Does not treat a website summary as a replacement for the canonical source record.

Repository-specific technical documentation and decision records remain on their repository surfaces. The organization website may link to those records where useful but does not mirror them merely to avoid an external transition.

## Consequences

- The website remains a focused institutional experience, and its responsive design does not have to double as a general Markdown document reader.
- Canonical ownership is direct rather than represented through synchronized copies. A visitor who wants the full record may leave `macro-evidence.com`, but the destination is explicit before activation and the source shown is the current canonical repository.
- Normal website builds remain reproducible without canonical-source network access because external canonical links are navigation targets, not build inputs. Upstream governance changes do not create a stale website mirror that requires synchronization before publication.
- The repository no longer needs canonical-record snapshotting, synchronization, drift detection, rendering, or record-provenance machinery.
- A dedicated first-party documentation or record-reading surface may be reconsidered later if user need, content volume, or product maturity supplies evidence that the additional system creates enough value to justify its cost.

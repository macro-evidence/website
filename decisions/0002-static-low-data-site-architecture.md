# 0002. Static low-data site architecture

**Status:** Accepted
**Date:** 2026-09-11

## Context

The organization website is primarily an institutional information surface. Its core jobs do not require accounts, forms, behavioral analytics, embedded third-party applications, a service worker, or client-side application state. Visitors do benefit from choosing a light, dark, or system theme without changing their whole environment.

## Decision

Ship the website as statically generated HTML and CSS with one small first-party theme-preference script.

The launch site has:

- No contact form, account system, newsletter widget, scheduling widget, or upload surface.
- No advertising tracker or website analytics/RUM beacon in repository code.
- No third-party embeds.
- No service worker or installable application behavior.
- No site search at the current content scale.
- One first-party local-storage preference for `System`, `Light`, or `Dark`.
- No network request from the theme script.
- One first-party-served Inter variable webfont, produced at build time from an exact-pinned OFL-1.1 package dependency rather than loaded from a remote font origin.

The content-security policy permits first-party scripts and fonts only and keeps inline script attributes, remote font origins, frames, forms, workers, and unexpected connections disabled.

## Consequences

- The site remains inexpensive to host, cache, audit, and reproduce.
- Privacy behavior stays narrow and explainable.
- A future form, analytics beacon, account system, third-party embed, service worker, remote font origin, or materially broader client application requires explicit review.
- The exact-pinned font package remains subject to ordinary dependency review and release verification.
- Ordinary visual or copy maintenance does not reopen this architecture.

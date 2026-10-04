# Macro Evidence Website

[![Verification](https://github.com/macro-evidence/website/actions/workflows/verification.yml/badge.svg?branch=main&event=push)](https://github.com/macro-evidence/website/actions/workflows/verification.yml)

Source for the Macro Evidence organization website at [macro-evidence.com](https://macro-evidence.com/).

## Purpose and scope

This repository owns the first-party organization website: routes, components, styling, static assets, build and deployment configuration, verification tooling, and website-owned visitor copy. The durable repository boundary is recorded in [decision 0001](decisions/0001-first-party-organization-website-boundary.md).

[Macro Data Observatory (MDO)](https://github.com/macro-evidence/macro-data-observatory) is a separate product surface. Until a first-party MDO product site is deployed and verified, the organization website routes visitors to MDO's public GitHub repository without duplicating volatile product documentation, provider inventories, APIs, catalogue behavior, or future product interfaces.

Organization-wide governance, policy, contribution, security, and cross-cutting decision records remain with their canonical repositories. This repository owns website-specific implementation and visitor orientation, not a second copy of those records.

## Repository structure

```text
.github/             Dependency-maintenance and verification workflows
decisions/           Repository-specific architecture decision records
public/              Static resources, security metadata, identity assets, and theme helper
scripts/             Verification and license-publication tooling
src/components/      Shared Astro components
src/layouts/         Shared page shell
src/pages/           Website routes
src/styles/          Global CSS modules by responsibility
```

Root files define runtime, package, deployment, licensing, and repository-maintenance behavior.

## Toolchain and local development

The supported runtime baseline is:

- Node.js **24.21.0** exactly
- npm **12.0.2** exactly

Direct framework, compiler, build, and other package dependencies are exact-pinned in [`package.json`](package.json); [`package-lock.json`](package-lock.json) is the authoritative resolved dependency graph. Use `npm ci` for a clean reproducible install rather than independently selecting dependency versions. npm dependency install scripts are deny-by-default; reviewed exceptions are declared in `package.json`.

The build emits Inter as a first-party static webfont. Its exact package identity, license, integrity, and upstream attribution are recorded in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md); visitors do not contact a third-party font host.

Install and start the development server:

```sh
npm ci
npm run dev
```

Apply the repository's canonical code/configuration formatting and run the static lint gates:

```sh
npm run format
npm run format:check
npm run lint
```

Prettier owns executable/source/configuration formatting in the paths declared by `package.json`; it does **not** rewrite Markdown prose. Markdown is checked separately with the exact-pinned `markdownlint-cli2` dependency. This repository's Markdown lint baseline keeps the standard rules while disabling line-length enforcement so policy prose, tables, and durable URLs are not mechanically reflowed.

Build production output:

```sh
npm run build
```

Run the complete release gate after a clean install:

```sh
npm run release:verify
```

Preview generated output:

```sh
npm run preview
```

## Architecture and invariants

The site is statically generated and intentionally low-data. Repository code contains no contact form, account system, advertising tracker, website analytics/RUM beacon, third-party embed, or service worker. Theme preference is the only persistent browser state. This boundary is recorded in [decision 0002](decisions/0002-static-low-data-site-architecture.md).

`System`, `Light`, and `Dark` are stored under the first-party `macro-evidence-theme` local-storage key; the theme helper makes no network requests.

The Content Security Policy permits the required first-party static resources while keeping remote font origins, frames, forms, unexpected connections, and unsafe inline/eval execution disabled.

Canonical source repositories are navigation destinations only, not build or runtime dependencies. The website does not maintain synchronized copies of canonical governance, contribution, security, or other policy records; that ownership boundary is recorded in [decision 0005](decisions/0005-keep-canonical-records-in-their-owning-repositories.md).

The site publishes `/llms.txt` as a concise machine-oriented index of public first-party sources and declares it with `rel="describedby"`. This is a discovery aid, not a replacement for canonical records, search-engine metadata, or crawler controls. Schema.org `Organization` and `WebSite` metadata remain CSP-compatible microdata rather than inline JSON-LD so the strict no-inline-script boundary is preserved.

`robots.txt` intentionally permits ordinary crawling and advertises the sitemap. Bad-bot mitigation is a live edge/security concern rather than a source-level attempt to distinguish trustworthy automation by user-agent text alone.

The footer copyright range is derived from the UTC build year, so generated HTML may change when the calendar year changes even if source bytes do not.

Responsive behavior is one fluid system with bounded breakpoints. The compact header/footer architecture remains active below `72rem`; the desktop header/footer architecture activates together at `72rem` and above.

## Routes

| Route | Role |
| --- | --- |
| `/` | Organization proposition, working principles, MDO relationship, public record, and participation |
| `/software` | Software portfolio boundary and MDO relationship |
| `/principles` | Engineering and decision principles |
| `/about` | Mission, vision, identity, and stewardship posture |
| `/governance` | First-party governance orientation and explicit links to canonical public records |
| `/contribute` | Contribution orientation, contributor-rights boundary, and canonical source links |
| `/sponsor` | Sponsorship purpose and independence boundary |
| `/contact` | Inquiry routing |
| `/privacy` | Website-specific data-handling orientation |
| `/security` | Private vulnerability-reporting orientation and canonical Security Policy link |
| `/trademarks` | Identity-use orientation and canonical Trademarks Policy link |
| `/licensing` | Source, content, identity, and third-party licensing orientation |
| `/brand-assets` | Official public-distribution identity assets and concise use guidance |
| `/404` | Noindex page-not-found route |

## Interface conventions

- Global navigation uses ordinary navigation labels; current first-party routes use `aria-current="page"`.
- Body and reference links keep a persistent non-color-only affordance.
- `→` is reserved for standalone directional text actions at the end of a content block or card. It is not added to global navigation, inline prose links, email addresses, downloads, or pill actions.
- External destinations remain ordinary same-tab links. When the destination is not already obvious from its label or context, the visible link text names the service or destination.
- When a visitor-facing link leaves for GitHub and the destination is not already obvious, **GitHub** is named in the link text or immediately associated context before activation.
- Public-record cards contain one explicit link rather than making the entire card a link.
- Disclosure chevrons point toward the revealed content; theme choices use a checkmark to identify the stored preference.
- `System`, `Light`, and `Dark` are peer choices and use one shared option geometry in compact and footer theme controls; their surrounding disclosure/popover containers may differ by role.
- Primary and secondary actions use fill/border treatment rather than positional motion as the hover-state cue.

## Verification and release

The release path verifies canonical code/configuration formatting, Markdown structure, repository/source constraints, frozen identity assets, Astro diagnostics, generated routes and metadata, internal link/resource integrity, security headers, first-party font delivery, licensing material, and the dependency audit.

| Command | Responsibility |
| --- | --- |
| `npm run format` | Apply the exact-pinned Prettier formatting baseline |
| `npm run format:check` | Verify that source and configuration files match the canonical formatting baseline |
| `npm run lint:code` | ESLint and Astro static-analysis rules for executable repository source |
| `npm run lint:markdown` | Repository Markdown structure and hygiene checks |
| `npm run lint` | Run both code and Markdown lint gates |
| `npm run verify:source` | Repository/source constraints and durable architecture boundaries |
| `npm run verify:assets` | Hash-pinned official identity assets |
| `npm run copy:licenses` | Exact website and Inter license material carried into built output |
| `npm run verify:dist` | Generated routes, metadata, links, resources, security, and licensing output |
| `npm run release:verify` | Full build plus production-dependency vulnerability audit |

GitHub Actions runs the release verification path for pull requests, pushes to `main`, and manual dispatch with read-only permissions, the `ubuntu-24.04` runner, SHA-pinned actions, the exact Node/npm baseline, and a clean `npm ci`. CI verifies candidates but has no deployment authority.

Dependabot opens bounded weekly pull requests for npm dependencies and GitHub Actions. They remain subject to review and release verification; this repository defines no auto-merge or deployment workflow.

The production target is Cloudflare Workers Static Assets. [`wrangler.jsonc`](wrangler.jsonc) serves the audited `./dist`, uses the generated `404.html` for unmatched routes, preserves no-trailing-slash URLs, binds production to `macro-evidence.com`, and disables both `workers.dev` and Preview URLs. No Worker application script is used. The deployment and verification boundary is recorded in [decision 0004](decisions/0004-static-deployment-and-verification-boundary.md).

Local `npm run preview` verifies the generated site, but it does not prove Cloudflare's application of `_headers` or other host behavior. Publication is a separate authorized release action using an explicitly selected Wrangler version. After deployment, verify the live domain, routing, response headers, static assets, host behavior, and any host-injected analytics/RUM or other unexpected behavior.

## Governance and decisions

Organization-wide mission and platform scope, governance, documentation standards, contribution policy, and trademark policy are maintained in [`macro-evidence/governance`](https://github.com/macro-evidence/governance). Organization-wide GitHub contribution mechanics, the Code of Conduct, Security Policy, and community-health defaults are maintained in [`macro-evidence/.github`](https://github.com/macro-evidence/.github).

Repository-specific architecture and public-interface decisions are indexed in [`decisions/README.md`](decisions/README.md). Decisions that genuinely apply across multiple Macro Evidence repositories belong in [governance's `decisions/`](https://github.com/macro-evidence/governance/tree/main/decisions). Read the applicable ADR before changing a durable boundary; routine copy edits, link corrections, and ordinary maintenance do not require a new ADR unless they cross one.

The website's `/contribute` and `/security` routes are visitor-facing orientation, not canonical policy records. Organization-wide participation, acceptance, and contributor-rights policy is canonical in the governance repository's [Contribution Policy](https://github.com/macro-evidence/governance/blob/main/CONTRIBUTION_POLICY.md); vulnerability-reporting policy is canonical in the [Security Policy](https://github.com/macro-evidence/.github/blob/main/SECURITY.md) maintained by `macro-evidence/.github`.

## Licensing

The repository has four rights layers, as established by [decision 0003](decisions/0003-separate-source-content-identity-and-third-party-rights.md):

- website source/software and repository implementation documentation — [Apache License 2.0](LICENSE);
- visitor-facing textual content — [CC BY-SA 4.0](LICENSE-CONTENT), with boundaries in [`LICENSING.md`](LICENSING.md);
- official Macro Evidence identity assets — excluded from both blanket grants and governed as described in [`BRAND_ASSETS.md`](BRAND_ASSETS.md), the canonical [Trademarks Policy](https://github.com/macro-evidence/governance/blob/main/TRADEMARKS.md), and applicable law;
- third-party material — retained under its applicable upstream terms, with relevant provenance in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

The production build exposes the corresponding first-party orientation at `/licensing` and carries the applicable license texts under `/licenses/`.

# Website licensing boundaries

The Macro Evidence website repository contains four rights categories: website source/software, visitor-facing textual content, official identity assets, and separately licensed third-party material. The applicable terms depend on the material being used.

## Visitor-facing textual content — CC BY-SA 4.0

Unless specifically identified otherwise, the human-readable institutional prose rendered to visitors by the website is licensed under the **Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0)**. The complete license text is in [`LICENSE-CONTENT`](LICENSE-CONTENT).

This scope includes page copy, headings, descriptive metadata, and other authored prose embedded in Astro templates. Where an Astro source file contains both program/source code and rendered prose, the prose is covered by CC BY-SA 4.0 while the surrounding source code remains covered by Apache-2.0 as described below.

Some website-owned orientation summarizes or adapts public Macro Evidence governance, contribution, security, or policy material. The website does not maintain synchronized copies of those canonical records. Relevant pages link to the owning public repository when the complete current record is needed.

## Website source/software — Apache-2.0

Program/source code, CSS, build and verification scripts, configuration, CI definitions, and repository implementation documentation are licensed under the **Apache License 2.0**. The complete license text is in [`LICENSE`](LICENSE).

The Apache-2.0 grant does not replace or override the CC BY-SA 4.0 terms for visitor-facing prose described above.

## Official Macro Evidence identity assets — separately governed

Official Macro Evidence identity assets are excluded from both blanket grants above. See [`BRAND_ASSETS.md`](BRAND_ASSETS.md) and the canonical [Trademarks Policy](https://github.com/macro-evidence/governance/blob/main/TRADEMARKS.md). The first-party [`/trademarks`](https://macro-evidence.com/trademarks) route provides visitor-facing orientation to that policy.

## Third-party material

Third-party dependencies and other third-party material retain their own license terms. Package dependencies are installed through the package manager rather than vendored into repository source unless a specific published artifact requires separate treatment.

The website uses `@fontsource-variable/inter@5.3.0` at build time to emit a first-party-served Inter webfont. Inter remains third-party font software under the SIL Open Font License 1.1 and is not covered by either the repository's Apache-2.0 grant or the visitor-content CC BY-SA 4.0 grant. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

The public `/licensing` route provides a visitor-facing orientation to these categories and exposes the applicable license texts under `/licenses/`.

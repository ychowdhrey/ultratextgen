# Architecture reference

Mechanism, measurements and incident history for each subsystem. These files are
**not** loaded into Claude's context automatically — they are what a
`.claude/rules/` file points at when the *why* matters.

**Start with [`claude-context-architecture.md`](./claude-context-architecture.md)** if
you are deciding where a new piece of knowledge belongs.

| Doc | Covers | Rules that link here |
|---|---|---|
| [`claude-context-architecture.md`](./claude-context-architecture.md) | the four-layer context design and the contract for adding knowledge | root `CLAUDE.md` |
| [`content-lanes.md`](./content-lanes.md) | Guide/Answer, Library/Symbol, the `updates/` pillar, hub↔spoke and peer link generation, library hub coverage, the cannibalization record, tool duplication | `content-architecture` |
| [`translation-parity.md`](./translation-parity.md) | every parity axis and why it exists, the hreflang mesh's four failure modes, the three untranslated-string classes, numeric parity, locale string attestation | `localization` |
| [`frontend-runtime.md`](./frontend-runtime.md) | module map, load order, the flair layer, opt-in surfaces, the platform-preview modal, pre-rendering | `frontend-javascript`, `html-pages` |
| [`unicode-style-registry.md`](./unicode-style-registry.md) | the style object's real shape, the five `type` values, and the 2026-08-11 correction | `unicode-style-registry` |
| [`copy-share-save.md`](./copy-share-save.md) | the one Share implementation, the typed saved store, `share_destination`, the two script-order bugs | `copy-share-analytics` |
| [`faq-schema.md`](./faq-schema.md) | the 214-page drift, the dead answer half, and the runtime schema rewrite | `html-pages` |
| [`accessibility.md`](./accessibility.md) | the measured baseline, the duplicate-id bug, blocking vs advisory | `accessibility` |
| [`page-art.md`](./page-art.md) | the hero/OG pipeline, `--only` prefix matching, title fitting, page-derived motifs, the four font rules | `html-pages`, `generated-artifacts`, `fonts` |
| [`editorial-standard.md`](./editorial-standard.md) | what the corpus actually contains, the em-dash passes, clean-on-touch, CTA routing, spec sentence reuse | `editorial-copy`, `editorial-footprint` |
| [`monetization.md`](./monetization.md) | the Auto Ads stack, the destroyed-units measurement, the anchor/toast fix, the traffic-coverage data | `ads-and-monetization` |
| [`webfonts.md`](./webfonts.md) | why Cloudflare was dropping 17 of 24 families, and the subset reasoning | `fonts` |
| [`discovery-and-delivery.md`](./discovery-and-delivery.md) | the discovery model, the `_redirects` dynamic cap, the Functions invocation budget, `<lastmod>` significance, `llms.txt` | `discovery-and-routing` |
| [`validation-system.md`](./validation-system.md) | audit/check/fix architecture, the six ways a check has reported nothing, probe design | `tooling-and-gates` |
| [`check-surfaces.md`](./check-surfaces.md) | pages that assert facts: the counter, the zalgo cards and cascade, the comparison table | `frontend-javascript`, `tooling-and-gates` |
| [`parallel-sessions.md`](./parallel-sessions.md) | duplicate claimants, the twice-built shared module, PR overlap, stranded work, shallow clones | root `CLAUDE.md` |

## Related reference outside this directory

| Doc | Covers |
|---|---|
| [`../README.md`](../README.md) | **the lane and ownership map**, the generated gate inventory, and the weekly infrastructure review |
| [`../decisions/`](../decisions/) | recorded owner decisions and ratified exceptions |
| [`../printables/`](../printables/) | the render defect registry, print settings and letterforms, render audits |
| [`../jtbd-principles.md`](../jtbd-principles.md), [`../page-vs-section-decisions.md`](../page-vs-section-decisions.md) | page-type-agnostic principles and the page-vs-section gate |
| [`../unicode-library-workflow.md`](../unicode-library-workflow.md), [`../library-locale-translation-workflow.md`](../library-locale-translation-workflow.md), [`../guide-content-workflow.md`](../guide-content-workflow.md) | the lane workflows |
| [`../locale-parent-governance.md`](../locale-parent-governance.md), [`../local-language-intelligence.md`](../local-language-intelligence.md) | locale registries and the vocabulary library |
| [`../source-attribution.md`](../source-attribution.md), [`../em-dash-policy.md`](../em-dash-policy.md), [`../editorial-footprint-risk.md`](../editorial-footprint-risk.md), [`../efr-quality-gate.md`](../efr-quality-gate.md) | the editorial and citation standards in full |
| [`../llms-txt.md`](../llms-txt.md), [`../collection-grid-prerender.md`](../collection-grid-prerender.md), [`../webmaster-tools-registrations-2026-08-20.md`](../webmaster-tools-registrations-2026-08-20.md) | discovery surfaces in full |
| [`../pinterest-pin-generation.md`](../pinterest-pin-generation.md) and siblings | the Pinterest pipeline |
| [`../infra-review/`](../infra-review/) | the dated weekly infrastructure reviews |

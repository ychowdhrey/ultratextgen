# `/answers/` opportunity backlog

Reusable backlog of candidate answer pages, distilled from GSC `/answers/`
performance (snapshot 2026-06-28). **Raw analytics CSVs are intentionally not
stored** — impressions/positions drift, so only the durable signal lives here:
the query *themes* and the pages they justify. Re-pull live numbers from GSC when
prioritizing; the clusters below are stable.

## Status: PARKED until after AdSense approval

Do **not** build these yet. A batch of short Q&A pages during AdSense review
risks the thin-content / low-value checks. After approval, build them **deep**
(real framework + ≥4 FAQs + downstream CTA per `docs/jtbd-build-spec.md`), not thin.

## Durable signal

The 11 live `/answers/` pages earn strong impressions but almost **zero clicks** —
the zero-click wall in `docs/direction-audit-2026-06-27.md`. The Discord pages
dominate demand, and the generic `discord-allowed-characters` page is absorbing
many distinct per-field intents that each deserve their own verdict-first page.

## Candidate pages (highest → lowest demand cluster)

| Query theme | Candidate page |
|---|---|
| Discord display-name allowed characters | `/answers/discord-display-name-allowed-characters/` |
| Discord channel-name rules (lowercase/hyphen) | `/answers/discord-channel-name-allowed-characters/` |
| Discord username allowed characters / rules | `/answers/discord-username-allowed-characters/` |
| Discord server-nickname characters | `/answers/discord-nickname-allowed-characters/` |
| Discord fraktur/blackletter without Nitro | section on existing `do-you-need-nitro-for-discord-fonts` page |
| Discord server-name allowed characters | `/answers/discord-server-name-allowed-characters/` |
| Discord character limits (per field) | `/answers/discord-character-limits/` |
| Discord role-name characters | `/answers/discord-role-name-allowed-characters/` |
| Discord about-me / bio unicode | `/answers/discord-bio-about-me-characters/` |

Also already specced (and parked):
- `/answers/how-to-make-text-small-on-discord/` — `docs/jtbd-build-spec-small-text-2026-06-27.md`
- Question-shaped rows OPP-0775/0776/0778/0779/0781 — `docs/guide-opportunity-map-2026-06-28.md`

## Build note

When splitting the generic `discord-allowed-characters` page into per-field pages,
convert it into a hub that links down to each field page, and cross-link back —
otherwise the parent cannibalizes the children.

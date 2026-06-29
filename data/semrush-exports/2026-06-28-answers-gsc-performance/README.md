# `/answers/` GSC performance export — 2026-06-28

Google Search Console "Performance on Search" export (via Semrush), **filtered to
the `/answers/` hub**. Stored as the demand backlog for future answer pages.

## Status: PARKED until after AdSense approval

We are **not** building these pages yet. Spinning up a batch of short Q&A pages
during AdSense review risks tripping the thin-content / low-value-content checks.
Build only **after** approval, and build them deep (real framework + ≥4 FAQs +
downstream CTA per `docs/jtbd-build-spec.md`), not thin.

## What's in this folder

| File | Contents |
|---|---|
| `Queries.csv` | **350 answer queries** with clicks / impressions / CTR / position — the full demand bank |
| `Pages.csv` | Per-page performance for the 11 live `/answers/` pages |
| `Countries.csv`, `Devices.csv` | Audience breakdown |
| `Chart.csv`, `Search appearance.csv`, `Filters.csv` | Date series, SERP features, export filter |

- **Filter:** Search type = Web · Date = last 3 months · Page contains `https://ultratextgen.com/answers/`
- **Headline:** nearly all queries are **0-click despite strong impressions** —
  e.g. `discord-allowed-characters` 2,929 impr / 0 clicks,
  `do-you-need-nitro-for-discord-fonts` 1,530 impr / 0 clicks. Confirms the
  zero-click wall called out in `docs/direction-audit-2026-06-27.md`.

## Candidate answer pages this data supports (build post-AdSense)

Demand clusters in `Queries.csv`, by impressions (avg position in parens):

| Cluster | Impr | Candidate page |
|---|---|---|
| Discord display-name allowed chars | ~350 (6.9) | `/answers/discord-display-name-allowed-characters/` |
| Discord channel-name rules (lowercase/hyphen) | ~309 (8.4) | `/answers/discord-channel-name-allowed-characters/` |
| Discord username allowed chars/rules | ~257 (7.2) | `/answers/discord-username-allowed-characters/` |
| Discord server-nickname chars | ~175 (9.8) | `/answers/discord-nickname-allowed-characters/` |
| Discord fraktur/blackletter w/o Nitro | ~171 (6.2) | section on existing nitro page |
| Discord server-name allowed chars | ~126 (7.3) | `/answers/discord-server-name-allowed-characters/` |
| Discord character limits | ~70 (8.2) | `/answers/discord-character-limits/` |
| Discord role-name chars | ~41 (7.3) | `/answers/discord-role-name-allowed-characters/` |
| Discord about-me / bio unicode | ~34 (5.4) | `/answers/discord-bio-about-me-characters/` |

Plus the already-specced (also parked) `/answers/how-to-make-text-small-on-discord/`
(see `docs/jtbd-build-spec-small-text-2026-06-27.md`) and the question-shaped rows
in `docs/guide-opportunity-map-2026-06-28.md` (OPP-0775/0776/0778/0779/0781).

When splitting the generic `discord-allowed-characters` page into per-field pages,
convert it into a hub that links down to each field page (avoid cannibalization).

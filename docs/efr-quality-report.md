# EFR Quality Gate — whole-site report

Generated 2026-09-02 by `npm run report:efr` (`scripts/audit-efr.js`). **Informational** — this report never fails a build; `npm run check:efr` is the per-PR gate.

EFR is the Editorial Footprint Risk score from `scripts/lib/editorial-footprint.js` (0–100, higher = reads more like a filled-in template). **It is a diagnostic and publishing quality-control metric, not an SEO ranking factor, and not an AI detector.** Thresholds, ratchet rules and the editor playbook: `docs/efr-quality-gate.md`.

Baseline for the "previous" column: `data/editorial_footprint_baseline.json` (committed 2026-09-02).

## Updates

English pages, calibrated. PASS ≤ 5 · REVIEW ≤ 7 · FAIL > 7.

| | |
|---|---:|
| Pages checked | 11 |
| Pass | 8 |
| Review | 1 |
| Fail | 2 |
| Mean EFR | 3.66 |
| Median EFR | 3.3 |
| P90 EFR | 7.6 |
| Locale pages (uncalibrated) | 56 |
| Hub index (unclassified) | 1 |

**Since baseline (2026-09-02):** 11 pages compared · regressions 0 · improvements 0 · new failures 0 · resolved failures 0. A regression or improvement is a move of 0.5 or more.

### Top 11 Updates by EFR — editorial backlog

| EFR | status | band | lever | previous | Δ | pct (en) | route | major contributors |
|---:|---|---|---|---:|---:|---:|---|---|
| 9.5 | FAIL | fail / editorial rewrite required | facts (specificityDeficit 89%) | 9.5 | 0 | p44.2 | `/updates/forza-horizon-6-gamertag-rules/` | specificityDeficit 8.4, rhythmRepetition 1.0 · 0 em dashes, 14 distinct facts, 1 three-item list |
| 7.6 | FAIL | fail / editorial rewrite required | facts (specificityDeficit 92%) | 7.6 | 0 | p37.2 | `/updates/telegram-premium-message-limit/` | specificityDeficit 7.0, rhythmRepetition 0.6 · 0 em dashes, 13 distinct facts, 0 three-item lists |
| 5.1 | REVIEW | review | phrasing (promotionalVagueness 72%) | 5.1 | 0 | p25.1 | `/updates/middle-east-currency-symbols-scorecard/` | promotionalVagueness 3.7, specificityDeficit 0.6 · 1 em dash, 32 distinct facts, 1 three-item list |
| 4.3 | PASS | target | facts (specificityDeficit 77%) | 4.3 | 0 | p21.2 | `/updates/unicode-18-release-date-confirmed/` | specificityDeficit 3.3, rhythmRepetition 0.5 · 1 em dash, 27 distinct facts, 0 three-item lists |
| 3.4 | PASS | target | mixed (structuralTemplate 49%) | 3.4 | 0 | p11.8 | `/updates/unicode-18-beta-review-opens/` | structuralTemplate 1.7, rhythmRepetition 1.1, punctuationFingerprint 0.7 · 1 em dash, 43 distinct facts, 3 three-item lists, shape shared with 1 sibling |
| 3.3 | PASS | target | facts (specificityDeficit 79%) | 3.3 | 0 | p11.2 | `/updates/lienquan-mobile-name-penalty-update/` | specificityDeficit 2.6, rhythmRepetition 0.7 · 0 em dashes, 18 distinct facts, 1 three-item list |
| 2.2 | PASS | exceptional | template (structuralTemplate 77%) | 2.2 | 0 | p6.4 | `/updates/unicode-18-most-anticipated-emoji/` | structuralTemplate 1.7, rhythmRepetition 0.5 · 0 em dashes, 27 distinct facts, 1 three-item list, shape shared with 1 sibling |
| 2.2 | PASS | exceptional | facts (specificityDeficit 70%) | 2.2 | 0 | p6.4 | `/updates/whatsapp-usernames-rollout/` | specificityDeficit 1.5, rhythmRepetition 0.6 · 0 em dashes, 18 distinct facts, 1 three-item list |
| 1.4 | PASS | exceptional | mixed (punctuationFingerprint 56%) | 1.4 | 0 | p3.4 | `/updates/xbox-gamertag-15-character-limit/` | punctuationFingerprint 0.8, rhythmRepetition 0.6 · 1 em dash, 20 distinct facts, 2 three-item lists |
| 0.9 | PASS | exceptional | phrasing (rhythmRepetition 100%) | 0.9 | 0 | p1.7 | `/updates/unicode-17-new-emoji-rollout/` | rhythmRepetition 0.9 · 0 em dashes, 45 distinct facts, 1 three-item list |
| 0.4 | PASS | exceptional | phrasing (rhythmRepetition 100%) | 0.4 | 0 | p0 | `/updates/uae-dirham-symbol-unicode-18/` | no dimension at or above 0.5 · 0 em dashes, 31 distinct facts, 4 three-item lists |
| 8.4 | UNCLASSIFIED | hub index — no threshold | — | 8.4 | 0 | p40.3 | `/updates/` | punctuationFingerprint 8.0 · 18 em dashes, 33 distinct facts, 1 three-item list |

### Locale updates — UNCALIBRATED

Scored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see `docs/editorial-footprint-risk.md`). Ranked by percentile **within each page's own locale**.

| locale | pct within locale | EFR | previous | Δ | route |
|---|---:|---:|---:|---:|---|
| ar | p45.5 | 6.6 | 6.6 | 0 | `/ar/updates/unicode-18-beta-review-opens/` |
| ar | p44.9 | 6.4 | 6.4 | 0 | `/ar/updates/unicode-18-most-anticipated-emoji/` |
| ar | p29.2 | 3.8 | 3.8 | 0 | `/ar/updates/uae-dirham-symbol-unicode-18/` |
| ar | p1.7 | 0.7 | 0.7 | 0 | `/ar/updates/unicode-18-release-date-confirmed/` |
| ar | p0.6 | 0.3 | 0.3 | 0 | `/ar/updates/middle-east-currency-symbols-scorecard/` |
| de | p66 | 14.1 | 14.1 | 0 | `/de/updates/unicode-18-beta-startet/` |
| de | p37.3 | 6.2 | 6.2 | 0 | `/de/updates/unicode-18-emoji-abstimmung/` |
| de | p19 | 3.7 | 3.7 | 0 | `/de/updates/unicode-18-erscheinungsdatum-bestaetigt/` |
| de | p0.4 | 0.5 | 0.5 | 0 | `/de/updates/naher-osten-waehrungssymbole-unicode-18/` |
| de | p0.4 | 0.5 | 0.5 | 0 | `/de/updates/vae-dirham-symbol-unicode-18/` |
| es | p50.8 | 9.6 | 9.6 | 0 | `/es/updates/unicode-18-nuevos-emojis-votacion/` |
| es | p39 | 6.6 | 6.6 | 0 | `/es/updates/unicode-18-beta-comienza-revision/` |
| es | p3.1 | 1.1 | 1.1 | 0 | `/es/updates/unicode-18-fecha-lanzamiento-confirmada/` |
| es | p1.2 | 0.6 | 0.6 | 0 | `/es/updates/simbolo-dirham-emiratos-unicode-18/` |
| es | p1 | 0.5 | 0.5 | 0 | `/es/updates/simbolos-moneda-oriente-medio-unicode-18/` |
| fr | p65.6 | 12.8 | 12.8 | 0 | `/fr/updates/unicode-18-date-de-sortie-confirmee/` |
| fr | p30.3 | 5.7 | 5.7 | 0 | `/fr/updates/unicode-18-nouveaux-emojis-vote/` |
| id | p1.5 | 1 | 1 | 0 | `/id/updates/unicode-18-emoji-baru-voting/` |
| id | p1.1 | 0.9 | 0.9 | 0 | `/id/updates/tanggal-rilis-unicode-18-dipastikan/` |
| it | p58.7 | 11.8 | 11.8 | 0 | `/it/updates/revisione-beta-unicode-18/` |
| it | p58.3 | 11.7 | 11.7 | 0 | `/it/updates/data-di-uscita-unicode-18-confermata/` |
| it | p9.4 | 2.6 | 2.6 | 0 | `/it/updates/simbolo-dirham-unicode-18/` |
| it | p0 | 0.5 | 0.5 | 0 | `/it/updates/simboli-valuta-medio-oriente-unicode-18/` |
| ja | p27.6 | 4 | 4 | 0 | `/ja/updates/unicode-18-most-anticipated-emoji/` |
| ja | p1.5 | 1 | 1 | 0 | `/ja/updates/unicode-18-release-date-confirmed/` |
| ko | p61.2 | 8.6 | 8.6 | 0 | `/ko/updates/unicode-18-imoji-tupyo/` |
| ko | p57.8 | 6.6 | 6.6 | 0 | `/ko/updates/unicode-18-beta-sijak/` |
| ko | p2.9 | 0.9 | 0.9 | 0 | `/ko/updates/dirham-giho-unicode-18/` |
| ko | p1 | 0.5 | 0.5 | 0 | `/ko/updates/jungdong-hwapye-giho-unicode-18/` |
| ko | p0 | 0.3 | 0.3 | 0 | `/ko/updates/unicode-18-chulsi-il-hwakjeong/` |
| nl | p37.2 | 12.8 | 12.8 | 0 | `/nl/updates/unicode-18-beta-van-start/` |
| nl | p27.6 | 6.4 | 6.4 | 0 | `/nl/updates/unicode-18-nieuwe-emoji-stemming/` |
| nl | p24.6 | 5.3 | 5.3 | 0 | `/nl/updates/unicode-18-releasedatum-bevestigd/` |
| nl | p1.5 | 0.6 | 0.6 | 0 | `/nl/updates/dirham-symbool-unicode-18/` |
| nl | p1 | 0.5 | 0.5 | 0 | `/nl/updates/valutasymbolen-midden-oosten-unicode-18/` |
| pl | p3 | 0.9 | 0.9 | 0 | `/pl/updates/unicode-18-nowe-emoji-glosowanie/` |
| pl | p2 | 0.8 | 0.8 | 0 | `/pl/updates/unicode-18-data-premiery-potwierdzona/` |
| pt | p60 | 12.3 | 12.3 | 0 | `/pt/updates/data-de-lancamento-unicode-18-confirmada/` |
| pt | p2.2 | 1.2 | 1.2 | 0 | `/pt/updates/unicode-18-novos-emojis-votacao/` |
| ru | p46.1 | 9.5 | 9.5 | 0 | `/ru/updates/unicode-18-release-date-confirmed/` |
| ru | p7.8 | 1.8 | 1.8 | 0 | `/ru/updates/unicode-18-most-anticipated-emoji/` |
| sv | p22.7 | 1.6 | 1.6 | 0 | `/sv/updates/unicode-18-betagranskning-oppnar/` |
| sv | p13.6 | 0.7 | 0.7 | 0 | `/sv/updates/dirham-symbol-unicode-18/` |
| sv | p9.1 | 0.6 | 0.6 | 0 | `/sv/updates/valutasymboler-mellanostern-unicode-18/` |
| th | p13.4 | 3.3 | 3.3 | 0 | `/th/updates/unicode-18-most-anticipated-emoji/` |
| th | p5.7 | 2.3 | 2.3 | 0 | `/th/updates/unicode-18-release-date-confirmed/` |
| tr | p84.3 | 23.1 | 23.1 | 0 | `/tr/updates/unicode-18-beta-inceleme-basliyor/` |
| tr | p54.3 | 10.3 | 10.3 | 0 | `/tr/updates/unicode-18-cikis-tarihi-onaylandi/` |
| tr | p37.4 | 7.3 | 7.3 | 0 | `/tr/updates/unicode-18-yeni-emoji-oylama/` |
| tr | p4.3 | 1.4 | 1.4 | 0 | `/tr/updates/dirhem-sembolu-unicode-18/` |
| tr | p0.4 | 0.5 | 0.5 | 0 | `/tr/updates/orta-dogu-para-birimi-sembolleri-unicode-18/` |
| vi | p31.9 | 10.8 | 10.8 | 0 | `/vi/updates/lien-quan-khoa-doi-ten/` |
| vi | p27.6 | 8.6 | 8.6 | 0 | `/vi/updates/unicode-18-xac-nhan-ngay-phat-hanh/` |
| vi | p2.7 | 1 | 1 | 0 | `/vi/updates/emoji-moi-unicode-18/` |
| zh-tw | p17.2 | 6.2 | 6.2 | 0 | `/zh-tw/updates/unicode-18-xin-biaoqing-fuhao/` |
| zh-tw | p0 | 0.9 | 0.9 | 0 | `/zh-tw/updates/unicode-18-fabu-riqi-queren/` |

## Guides

English pages, calibrated. PASS ≤ 7 · REVIEW ≤ 8 · FAIL > 8.

| | |
|---|---:|
| Pages checked | 32 |
| Pass | 19 |
| Review | 1 |
| Fail | 12 |
| Mean EFR | 6.95 |
| Median EFR | 5.5 |
| P90 EFR | 14.1 |
| Locale pages (uncalibrated) | 90 |
| Hub index (unclassified) | 1 |

**Since baseline (2026-09-02):** 32 pages compared · regressions 0 · improvements 0 · new failures 0 · resolved failures 0. A regression or improvement is a move of 0.5 or more.

### Top 20 Guides by EFR — editorial backlog

| EFR | status | band | lever | previous | Δ | pct (en) | route | major contributors |
|---:|---|---|---|---:|---:|---:|---|---|
| 23.9 | FAIL | severe editorial footprint | mixed (specificityDeficit 46%) | 23.9 | 0 | p94.3 | `/guide/linkedin-comment-styling/` | specificityDeficit 11.1, formulaicSyntax 4.2, formulaicPhraseDensity 3.7 · 23 em dashes, 4 distinct facts, 10 three-item lists, 2 formulaic phrases |
| 17.9 | FAIL | severe editorial footprint | mixed (specificityDeficit 46%) | 17.9 | 0 | p80.5 | `/guide/the-rhetoric-of-fonts/` | specificityDeficit 8.2, formulaicPhraseDensity 3.6, formulaicSyntax 3.6 · 35 em dashes, 8 distinct facts, 11 three-item lists, 3 formulaic phrases |
| 14.2 | FAIL | severe editorial footprint | mixed (specificityDeficit 49%) | 14.2 | 0 | p62.9 | `/guide/comments-that-stand-out/` | specificityDeficit 7.0, promotionalVagueness 4.3, punctuationFingerprint 1.2 · 42 em dashes, 10 distinct facts, 10 three-item lists |
| 14.1 | FAIL (exception active) | severe editorial footprint | facts (specificityDeficit 98%) | 14.1 | 0 | p62.5 | `/guide/instagram-fonts-shadowban-myth/` | specificityDeficit 13.8 · 0 em dashes, 5 distinct facts, 8 three-item lists |
| 12.6 | FAIL | severe editorial footprint | facts (specificityDeficit 85%) | 12.6 | 0 | p57.8 | `/guide/linkedin-fonts-recruiters-ats/` | specificityDeficit 10.7, formulaicSyntax 1.4 · 34 em dashes, 7 distinct facts, 9 three-item lists, 3 rhetorical questions |
| 12.1 | FAIL | severe editorial footprint | facts (specificityDeficit 87%) | 12.1 | 0 | p54.5 | `/guide/tiktok-font-changed/` | specificityDeficit 10.5, promotionalVagueness 0.8, punctuationFingerprint 0.6 · 28 em dashes, 7 distinct facts, 4 three-item lists |
| 11.6 | FAIL | severe editorial footprint | facts (specificityDeficit 85%) | 11.6 | 0 | p52 | `/guide/linkedin-bold-text-reach/` | specificityDeficit 9.8, formulaicSyntax 0.9, punctuationFingerprint 0.6 · 29 em dashes, 7 distinct facts, 2 three-item lists, 2 rhetorical questions |
| 11.5 | FAIL (exception active) | severe editorial footprint | facts (specificityDeficit 77%) | 11.5 | 0 | p51.7 | `/guide/linkedin-comments-guide/` | specificityDeficit 8.8, formulaicSyntax 1.0, promotionalVagueness 0.9 · 0 em dashes, 14 distinct facts, 16 three-item lists |
| 10.6 | FAIL | severe editorial footprint | mixed (specificityDeficit 63%) | 10.6 | 0 | p48.7 | `/guide/instagram-font-ideas/` | specificityDeficit 6.7, formulaicPhraseDensity 2.7, rhythmRepetition 0.9 · 28 em dashes, 8 distinct facts, 2 three-item lists, 2 formulaic phrases |
| 9.9 | FAIL | fail / editorial rewrite required | mixed (promotionalVagueness 40%) | 9.9 | 0 | p46.4 | `/guide/stop-the-scroll-with-font-variation/` | promotionalVagueness 4.0, formulaicSyntax 3.0, specificityDeficit 2.8 · 30 em dashes, 12 distinct facts, 13 three-item lists, 3 rhetorical questions |
| 9.5 | FAIL | fail / editorial rewrite required | facts (specificityDeficit 70%) | 9.5 | 0 | p44.2 | `/guide/discord-where-fonts-work/` | specificityDeficit 6.6, formulaicSyntax 1.2, punctuationFingerprint 0.7 · 30 em dashes, 8 distinct facts, 3 three-item lists, 2 rhetorical questions, shape shared with 1 sibling |
| 9.3 | FAIL | fail / editorial rewrite required | mixed (formulaicSyntax 42%) | 9.3 | 0 | p43.8 | `/guide/branding-with-fonts-for-social-media/` | formulaicSyntax 3.9, formulaicPhraseDensity 3.6, promotionalVagueness 1.6 · 20 em dashes, 10 distinct facts, 10 three-item lists, 2 formulaic phrases |
| 7.1 | REVIEW | review | mixed (specificityDeficit 64%) | 7.1 | 0 | p34.5 | `/guide/bio-formatting-without-spam/` | specificityDeficit 4.5, promotionalVagueness 1.4, structuralTemplate 0.6 · 13 em dashes, 6 distinct facts, 3 three-item lists, shape shared with 1 sibling |
| 6.8 | PASS | target | mixed (specificityDeficit 42%) | 6.8 | 0 | p33.6 | `/guide/discord-colored-text-guide/` | specificityDeficit 2.8, formulaicSyntax 2.4, promotionalVagueness 0.7 · 33 em dashes, 13 distinct facts, 4 three-item lists, 5 rhetorical questions, shape shared with 1 sibling |
| 6.7 | PASS | target | mixed (specificityDeficit 60%) | 6.7 | 0 | p33.1 | `/guide/dividers-separators-guide/` | specificityDeficit 4.0, punctuationFingerprint 1.6, structuralTemplate 0.6 · 37 em dashes, 12 distinct facts, 6 three-item lists, shape shared with 1 sibling |
| 6.3 | PASS | target | mixed (specificityDeficit 69%) | 6.3 | 0 | p31.1 | `/guide/font-personality-and-brand/` | specificityDeficit 4.4, punctuationFingerprint 1.1 · 24 em dashes, 7 distinct facts, 5 three-item lists |
| 4.7 | PASS | excellent | mixed (punctuationFingerprint 40%) | 4.7 | 0 | p23.3 | `/guide/whatsapp-text-formatting-explained/` | punctuationFingerprint 1.9, formulaicPhraseDensity 1.9, rhythmRepetition 1.0 · 27 em dashes, 9 distinct facts, 3 three-item lists, 1 formulaic phrase |
| 3.9 | PASS | very concise; check that useful teaching depth has not been removed | mixed (formulaicSyntax 68%) | 3.9 | 0 | p18.8 | `/guide/discord-safe-name-styling/` | formulaicSyntax 2.7, rhythmRepetition 0.6, structuralTemplate 0.6 · 15 em dashes, 9 distinct facts, 8 three-item lists, shape shared with 1 sibling |
| 3.7 | PASS | very concise; check that useful teaching depth has not been removed | mixed (punctuationFingerprint 52%) | 3.7 | 0 | p16.4 | `/guide/fancy-fonts-accessibility-guide/` | punctuationFingerprint 1.9, promotionalVagueness 1.3 · 24 em dashes, 12 distinct facts, 1 three-item list |
| 3.5 | PASS | very concise; check that useful teaching depth has not been removed | phrasing (promotionalVagueness 93%) | 3.5 | 0 | p12.4 | `/guide/personal-branding-through-typography/` | promotionalVagueness 3.2 · 30 em dashes, 14 distinct facts, 3 three-item lists |
| 12.5 | UNCLASSIFIED | hub index — no threshold | — | 12.5 | 0 | p57.3 | `/guide/` | formulaicSyntax 6.3, punctuationFingerprint 4.0, rhythmRepetition 1.4 · 57 em dashes, 22 distinct facts, 21 three-item lists |

### Locale guides — UNCALIBRATED

Scored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see `docs/editorial-footprint-risk.md`). Ranked by percentile **within each page's own locale**.

| locale | pct within locale | EFR | previous | Δ | route |
|---|---:|---:|---:|---:|---|
| ar | p80.9 | 25.1 | 25.1 | 0 | `/ar/guide/amaken-khutut-discord/` |
| ar | p70.8 | 17.6 | 17.6 | 0 | `/ar/guide/tanseeq-nusus-discord/` |
| ar | p66.3 | 16.1 | 16.1 | 0 | `/ar/guide/ism-discord-amin/` |
| bs | p36.4 | 8.8 | 8.8 | 0 | `/bs/guide/gdje-rade-fontovi-na-discordu/` |
| bs | p9.1 | 0.9 | 0.9 | 0 | `/bs/guide/siguran-nadimak-na-discordu/` |
| bs | p0 | 0.6 | 0.6 | 0 | `/bs/guide/oblikovanje-teksta-na-discordu/` |
| cs | p71.4 | 16 | 16 | 0 | `/cs/guide/kde-funguje-pismo-na-discordu/` |
| cs | p28.6 | 4.6 | 4.6 | 0 | `/cs/guide/formatovani-textu-na-discordu/` |
| cs | p21.4 | 4.2 | 4.2 | 0 | `/cs/guide/bezpecny-nick-na-discordu/` |
| da | p66.7 | 17.4 | 17.4 | 0 | `/da/guide/hvor-virker-skrifttyper-i-discord/` |
| da | p60 | 14.6 | 14.6 | 0 | `/da/guide/sikkert-discord-navn/` |
| da | p46.7 | 6 | 6 | 0 | `/da/guide/discord-tekstformatering-forklaret/` |
| de | p88.8 | 23.3 | 23.3 | 0 | `/de/guide/wo-funktionieren-schriftarten-in-discord/` |
| de | p76.9 | 20.3 | 20.3 | 0 | `/de/guide/discord-namen-sicher-gestalten/` |
| de | p68.3 | 15.9 | 15.9 | 0 | `/de/guide/discord-textformatierung-erklaert/` |
| es | p41.7 | 7.6 | 7.6 | 0 | `/es/guide/donde-funcionan-las-fuentes-en-discord/` |
| es | p38 | 6.3 | 6.3 | 0 | `/es/guide/formato-texto-discord-explicado/` |
| es | p13.1 | 2.5 | 2.5 | 0 | `/es/guide/nombre-discord-sin-riesgos/` |
| fi | p81.3 | 20.8 | 20.8 | 0 | `/fi/guide/missa-discord-fontit-toimivat/` |
| fi | p68.8 | 13.3 | 13.3 | 0 | `/fi/guide/turvallinen-discord-nimimerkki/` |
| fi | p62.5 | 9.5 | 9.5 | 0 | `/fi/guide/discord-tekstin-muotoilu-selitetty/` |
| fr | p85.5 | 25.1 | 25.1 | 0 | `/fr/guide/ou-fonctionnent-les-polices-discord/` |
| fr | p81.9 | 22.6 | 22.6 | 0 | `/fr/guide/pseudo-discord-sans-risque/` |
| fr | p79.2 | 19.8 | 19.8 | 0 | `/fr/guide/formatage-texte-discord-explique/` |
| hi | p77.8 | 15.3 | 15.3 | 0 | `/hi/guide/discord-font-kahan-kaam-karte-hain/` |
| hi | p44.4 | 5.3 | 5.3 | 0 | `/hi/guide/discord-text-formatting-samjhein/` |
| hi | p22.2 | 4.7 | 4.7 | 0 | `/hi/guide/discord-safe-naam-styling/` |
| hr | p46.2 | 11.9 | 11.9 | 0 | `/hr/guide/gdje-rade-fontovi-na-discordu/` |
| hr | p7.7 | 0.9 | 0.9 | 0 | `/hr/guide/siguran-nadimak-na-discordu/` |
| hr | p0 | 0.6 | 0.6 | 0 | `/hr/guide/oblikovanje-teksta-na-discordu/` |
| hu | p53.8 | 12.3 | 12.3 | 0 | `/hu/guide/hol-mukodnek-a-discord-fontok/` |
| hu | p7.7 | 1 | 1 | 0 | `/hu/guide/discord-szovegformazas/` |
| hu | p0 | 0.9 | 0.9 | 0 | `/hu/guide/biztonsagos-discord-becenev/` |
| id | p75.9 | 21.7 | 21.7 | 0 | `/id/guide/di-mana-font-discord-bekerja/` |
| id | p62 | 16.7 | 16.7 | 0 | `/id/guide/nama-discord-aman/` |
| id | p52.3 | 12.1 | 12.1 | 0 | `/id/guide/format-teks-discord-dijelaskan/` |
| it | p88.8 | 26.2 | 26.2 | 0 | `/it/guide/dove-funzionano-i-font-discord/` |
| it | p80.3 | 21.6 | 21.6 | 0 | `/it/guide/formattazione-testo-discord-spiegata/` |
| it | p78.9 | 20.5 | 20.5 | 0 | `/it/guide/nome-discord-senza-rischi/` |
| ja | p69.5 | 14.1 | 14.1 | 0 | `/ja/guide/discord-font-doko/` |
| ja | p61.6 | 12 | 12 | 0 | `/ja/guide/discord-moji-soshoku/` |
| ja | p59.6 | 10.8 | 10.8 | 0 | `/ja/guide/discord-anzen-namae/` |
| ko | p93.7 | 33.4 | 33.4 | 0 | `/ko/guide/discord-ponteu-jiwon/` |
| ko | p87.4 | 28 | 28 | 0 | `/ko/guide/discord-tekseuteu-seosik/` |
| ko | p84.5 | 25.3 | 25.3 | 0 | `/ko/guide/discord-nikneim-anjeon/` |
| ms | p91.3 | 22.5 | 22.5 | 0 | `/ms/guide/di-mana-font-discord-berfungsi/` |
| ms | p73.9 | 15.6 | 15.6 | 0 | `/ms/guide/nama-discord-selamat/` |
| ms | p65.2 | 13.4 | 13.4 | 0 | `/ms/guide/format-teks-discord-dijelaskan/` |
| nl | p64.8 | 22.8 | 22.8 | 0 | `/nl/guide/waar-lettertypes-werken-in-discord/` |
| nl | p41.2 | 17.3 | 17.3 | 0 | `/nl/guide/discord-naam-veilig-stylen/` |
| nl | p38.7 | 14.8 | 14.8 | 0 | `/nl/guide/discord-tekstopmaak-uitgelegd/` |
| no | p52.2 | 7.8 | 7.8 | 0 | `/no/guide/hvor-fungerer-skrifter-i-discord/` |
| no | p43.5 | 5.3 | 5.3 | 0 | `/no/guide/trygt-discord-navn/` |
| no | p0 | 0.6 | 0.6 | 0 | `/no/guide/discord-tekstformatering-forklart/` |
| pl | p75.4 | 23 | 23 | 0 | `/pl/guide/gdzie-dzialaja-czcionki-na-discordzie/` |
| pl | p41.4 | 12.5 | 12.5 | 0 | `/pl/guide/formatowanie-tekstu-na-discordzie/` |
| pl | p40.9 | 12.4 | 12.4 | 0 | `/pl/guide/bezpieczna-nazwa-na-discordzie/` |
| pt | p87.1 | 25 | 25 | 0 | `/pt/guide/onde-as-fontes-funcionam-no-discord/` |
| pt | p77.8 | 21.5 | 21.5 | 0 | `/pt/guide/formatacao-de-texto-no-discord/` |
| pt | p75.6 | 20.2 | 20.2 | 0 | `/pt/guide/nome-discord-sem-risco/` |
| ro | p76.9 | 15.8 | 15.8 | 0 | `/ro/guide/unde-functioneaza-fonturile-discord/` |
| ro | p38.5 | 9.2 | 9.2 | 0 | `/ro/guide/nume-discord-fara-riscuri/` |
| ro | p23.1 | 4.7 | 4.7 | 0 | `/ro/guide/formatare-text-discord-explicat/` |
| ru | p77.2 | 24.3 | 24.3 | 0 | `/ru/guide/gde-rabotayut-shrifty-discord/` |
| ru | p68.3 | 19.7 | 19.7 | 0 | `/ru/guide/bezopasnyy-nik-discord/` |
| ru | p62.8 | 18 | 18 | 0 | `/ru/guide/formatirovanie-teksta-discord/` |
| sk | p50 | 12.2 | 12.2 | 0 | `/sk/guide/kde-funguje-pismo-na-discorde/` |
| sk | p8.3 | 0.9 | 0.9 | 0 | `/sk/guide/bezpecny-nick-na-discorde/` |
| sk | p0 | 0.7 | 0.7 | 0 | `/sk/guide/formatovanie-textu-na-discorde/` |
| sr | p36.4 | 8.4 | 8.4 | 0 | `/sr/guide/gde-fontovi-rade-na-discordu/` |
| sr | p9.1 | 1.1 | 1.1 | 0 | `/sr/guide/bezbedan-nadimak-na-discordu/` |
| sr | p0 | 0.6 | 0.6 | 0 | `/sr/guide/formatiranje-teksta-na-discordu/` |
| sv | p86.4 | 21.2 | 21.2 | 0 | `/sv/guide/var-typsnitt-fungerar-i-discord/` |
| sv | p81.8 | 17.2 | 17.2 | 0 | `/sv/guide/discord-namn-utan-risk/` |
| sv | p63.6 | 11.5 | 11.5 | 0 | `/sv/guide/discord-textformatering-forklarad/` |
| th | p88.5 | 16.5 | 16.5 | 0 | `/th/guide/discord-font-thamngan-thinai/` |
| th | p55.4 | 9.2 | 9.2 | 0 | `/th/guide/discord-rupbaep-khokhwam/` |
| th | p51.6 | 8.8 | 8.8 | 0 | `/th/guide/discord-tang-chue-plodphai/` |
| tl | p66.7 | 17.8 | 17.8 | 0 | `/tl/guide/saan-gumagana-ang-font-sa-discord/` |
| tl | p50 | 8.2 | 8.2 | 0 | `/tl/guide/discord-name-na-safe/` |
| tl | p33.3 | 8 | 8 | 0 | `/tl/guide/discord-text-formatting-paliwanag/` |
| tr | p87.8 | 25.1 | 25.1 | 0 | `/tr/guide/discord-fontlari-nerede-calisir/` |
| tr | p82.2 | 22.1 | 22.1 | 0 | `/tr/guide/guvenli-discord-ismi/` |
| tr | p77.8 | 18.9 | 18.9 | 0 | `/tr/guide/discord-metin-bicimlendirme/` |
| vi | p73.5 | 23.8 | 23.8 | 0 | `/vi/guide/font-discord-dung-o-dau/` |
| vi | p45.9 | 18.6 | 18.6 | 0 | `/vi/guide/dat-ten-discord-an-toan/` |
| vi | p37.8 | 15.9 | 15.9 | 0 | `/vi/guide/dinh-dang-chu-discord/` |
| zh-tw | p78.5 | 21 | 21 | 0 | `/zh-tw/guide/discord-ziti-nali-nengyong/` |
| zh-tw | p48.4 | 16 | 16 | 0 | `/zh-tw/guide/discord-wenzi-geshi/` |
| zh-tw | p39.8 | 12.8 | 12.8 | 0 | `/zh-tw/guide/discord-anquan-nicheng/` |

## Exceptions

| state | route | EFR now | agreed at | owner | agreed | review by | reason |
|---|---|---:|---:|---|---|---|---|
| active | `/guide/instagram-fonts-shadowban-myth/` | 14.1 | 14.1 | Yasir | 2026-09-02 | 2026-12-01 | facts-led (specificityDeficit 13.8 of 14.1): a myth-busting argument whose evidence is a reproducible search test, a two-column myth/real-cost ledger and a three-step reach checklist, none of which the fact detector reads; the page names five recognised facts in 1,941 words. Agreed only after the copy was cleaned: 36 measured em dashes, the heading's em dash and both rhetorical questions were removed on 2026-09-02 (14.6 to 14.1). Still above the 7.0 target; the remaining footprint is the shape of the argument, not template prose. |
| active | `/guide/linkedin-comments-guide/` | 11.5 | 11.5 | Yasir | 2026-09-02 | 2026-12-01 | facts-led (specificityDeficit 8.8 of 11.5): a 3,000-word guide built on fourteen worked comment archetypes, each with a quoted example, a when-to-use rule and an impact rating. An archetype, a worked example and a named author (Adam Grant, Hidden Potential) are not in the fact detector's vocabulary, so the page's depth reads as absence. Agreed only after the copy was cleaned: 47 measured em dashes, the title's em dash, one rhetorical question and the flagged promotional wording were removed on 2026-09-02, which took the page from 18.1 to 11.5. Still above the 7.0 target; not an editorial defect. |


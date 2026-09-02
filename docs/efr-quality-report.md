# EFR Quality Gate — whole-site report

Generated 2026-09-02 by `npm run report:efr` (`scripts/audit-efr.js`). **Informational** — this report never fails a build; `npm run check:efr` is the per-PR gate.

EFR is the Editorial Footprint Risk score from `scripts/lib/editorial-footprint.js` (0–100, higher = reads more like a filled-in template). **It is a diagnostic and publishing quality-control metric, not an SEO ranking factor, and not an AI detector.** Thresholds, ratchet rules and the editor playbook: `docs/efr-quality-gate.md`.

Baseline for the "previous" column: `data/editorial_footprint_baseline.json` (committed 2026-09-01).

## Updates

English pages, calibrated. PASS ≤ 5 · REVIEW ≤ 7 · FAIL > 7.

| | |
|---|---:|
| Pages checked | 11 |
| Pass | 7 |
| Review | 3 |
| Fail | 1 |
| Mean EFR | 3.76 |
| Median EFR | 3.4 |
| P90 EFR | 5.8 |
| Locale pages (uncalibrated) | 56 |
| Hub index (unclassified) | 1 |

**Since baseline (2026-09-01):** 11 pages compared · regressions 0 · improvements 0 · new failures 0 · resolved failures 0. A regression or improvement is a move of 0.5 or more.

### Top 11 Updates by EFR — editorial backlog

| EFR | status | band | previous | Δ | pct (en) | route | major contributors |
|---:|---|---|---:|---:|---:|---|---|
| 9.4 | FAIL | fail / editorial rewrite required | 9.4 | 0 | p45 | `/updates/lienquan-mobile-name-penalty-update/` | specificityDeficit 7.1, structuralTemplate 1.7, rhythmRepetition 0.7 · 0 em dashes, 7 distinct facts, 1 three-item list, shape shared with 1 sibling |
| 5.8 | REVIEW | review | 5.8 | 0 | p29.2 | `/updates/unicode-18-most-anticipated-emoji/` | specificityDeficit 3.7, structuralTemplate 1.7 · 0 em dashes, 10 distinct facts, 1 three-item list, shape shared with 1 sibling |
| 5.6 | REVIEW | review | 5.6 | 0 | p27.9 | `/updates/telegram-premium-message-limit/` | specificityDeficit 5.0, rhythmRepetition 0.6 · 0 em dashes, 8 distinct facts, 0 three-item lists |
| 5.4 | REVIEW | review | 5.4 | 0 | p27.3 | `/updates/forza-horizon-6-gamertag-rules/` | specificityDeficit 4.3, rhythmRepetition 1.0 · 0 em dashes, 10 distinct facts, 1 three-item list |
| 4.2 | PASS | target | 4.4 | -0.2 | p20.9 | `/updates/middle-east-currency-symbols-scorecard/` | promotionalVagueness 3.9 · 0 em dashes, 22 distinct facts, 1 three-item list |
| 3.4 | PASS | target | 3.4 | 0 | p11.6 | `/updates/unicode-18-beta-review-opens/` | structuralTemplate 1.7, rhythmRepetition 1.1, punctuationFingerprint 0.7 · 1 em dash, 18 distinct facts, 3 three-item lists, shape shared with 1 sibling |
| 2.5 | PASS | exceptional | 2.5 | 0 | p7.3 | `/updates/unicode-18-release-date-confirmed/` | specificityDeficit 1.5, rhythmRepetition 0.5 · 1 em dash, 16 distinct facts, 0 three-item lists |
| 2.3 | PASS | exceptional | 2.3 | 0 | p6.6 | `/updates/whatsapp-usernames-rollout/` | structuralTemplate 1.7, rhythmRepetition 0.6 · 0 em dashes, 15 distinct facts, 1 three-item list, shape shared with 1 sibling |
| 1.5 | PASS | exceptional | 1.5 | 0 | p3.3 | `/updates/xbox-gamertag-15-character-limit/` | punctuationFingerprint 0.8, rhythmRepetition 0.6 · 1 em dash, 15 distinct facts, 2 three-item lists |
| 0.9 | PASS | exceptional | 0.9 | 0 | p1.4 | `/updates/unicode-17-new-emoji-rollout/` | rhythmRepetition 0.9 · 0 em dashes, 17 distinct facts, 1 three-item list |
| 0.4 | PASS | exceptional | 0.4 | 0 | p0 | `/updates/uae-dirham-symbol-unicode-18/` | no dimension at or above 0.5 · 0 em dashes, 13 distinct facts, 4 three-item lists |
| n/a | UNCLASSIFIED | hub index — no threshold; below the 120-word prose floor, not scored | n/a | — | — | `/updates/` | — |

### Locale updates — UNCALIBRATED

Scored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see `docs/editorial-footprint-risk.md`). Ranked by percentile **within each page's own locale**.

| locale | pct within locale | EFR | previous | Δ | route |
|---|---:|---:|---:|---:|---|
| ar | p89.3 | 29.9 | 29.9 | 0 | `/ar/updates/unicode-18-beta-review-opens/` |
| ar | p70.8 | 19.8 | 19.8 | 0 | `/ar/updates/unicode-18-most-anticipated-emoji/` |
| ar | p44.4 | 6.7 | 6.7 | 0 | `/ar/updates/unicode-18-release-date-confirmed/` |
| ar | p37.1 | 5.2 | 5.2 | 0 | `/ar/updates/uae-dirham-symbol-unicode-18/` |
| ar | p0.6 | 0.3 | 0.3 | 0 | `/ar/updates/middle-east-currency-symbols-scorecard/` |
| de | p85.1 | 19.6 | 19.6 | 0 | `/de/updates/unicode-18-beta-startet/` |
| de | p40.3 | 6.5 | 6.5 | 0 | `/de/updates/unicode-18-emoji-abstimmung/` |
| de | p18.7 | 3.2 | 3.2 | 0 | `/de/updates/unicode-18-erscheinungsdatum-bestaetigt/` |
| de | p0.4 | 0.5 | 0.5 | 0 | `/de/updates/naher-osten-waehrungssymbole-unicode-18/` |
| de | p0.4 | 0.5 | 0.5 | 0 | `/de/updates/vae-dirham-symbol-unicode-18/` |
| es | p42.1 | 8 | 8 | 0 | `/es/updates/unicode-18-nuevos-emojis-votacion/` |
| es | p38.8 | 6.6 | 6.6 | 0 | `/es/updates/unicode-18-beta-comienza-revision/` |
| es | p3.1 | 1.1 | 1.1 | 0 | `/es/updates/unicode-18-fecha-lanzamiento-confirmada/` |
| es | p1.2 | 0.6 | 0.6 | 0 | `/es/updates/simbolo-dirham-emiratos-unicode-18/` |
| es | p1 | 0.5 | 0.5 | 0 | `/es/updates/simbolos-moneda-oriente-medio-unicode-18/` |
| fr | p67 | 14.2 | 14.2 | 0 | `/fr/updates/unicode-18-nouveaux-emojis-vote/` |
| fr | p58.8 | 11.5 | 11.5 | 0 | `/fr/updates/unicode-18-date-de-sortie-confirmee/` |
| id | p1.5 | 1 | 1 | 0 | `/id/updates/unicode-18-emoji-baru-voting/` |
| id | p1.1 | 0.9 | 0.9 | 0 | `/id/updates/tanggal-rilis-unicode-18-dipastikan/` |
| it | p71.3 | 16.4 | 16.4 | 0 | `/it/updates/revisione-beta-unicode-18/` |
| it | p56.1 | 11.3 | 11.3 | 0 | `/it/updates/data-di-uscita-unicode-18-confermata/` |
| it | p19.3 | 5 | 5 | 0 | `/it/updates/simbolo-dirham-unicode-18/` |
| it | p0 | 0.5 | 0.5 | 0 | `/it/updates/simboli-valuta-medio-oriente-unicode-18/` |
| ja | p26.1 | 4 | 4 | 0 | `/ja/updates/unicode-18-most-anticipated-emoji/` |
| ja | p2 | 1 | 1 | 0 | `/ja/updates/unicode-18-release-date-confirmed/` |
| ko | p89.3 | 29.1 | 29.1 | 0 | `/ko/updates/unicode-18-beta-sijak/` |
| ko | p59.2 | 7.1 | 7.1 | 0 | `/ko/updates/unicode-18-imoji-tupyo/` |
| ko | p13.6 | 1.5 | 1.5 | 0 | `/ko/updates/dirham-giho-unicode-18/` |
| ko | p13.6 | 1.5 | 1.5 | 0 | `/ko/updates/unicode-18-chulsi-il-hwakjeong/` |
| ko | p0.5 | 0.5 | 0.4 | +0.1 | `/ko/updates/jungdong-hwapye-giho-unicode-18/` |
| nl | p52.8 | 20.3 | 20.3 | 0 | `/nl/updates/unicode-18-beta-van-start/` |
| nl | p33.2 | 10.3 | 10.3 | 0 | `/nl/updates/unicode-18-nieuwe-emoji-stemming/` |
| nl | p24.1 | 5.1 | 5.1 | 0 | `/nl/updates/unicode-18-releasedatum-bevestigd/` |
| nl | p1.5 | 0.6 | 0.6 | 0 | `/nl/updates/dirham-symbool-unicode-18/` |
| nl | p1 | 0.5 | 0.5 | 0 | `/nl/updates/valutasymbolen-midden-oosten-unicode-18/` |
| pl | p2.5 | 0.9 | 0.9 | 0 | `/pl/updates/unicode-18-nowe-emoji-glosowanie/` |
| pl | p1.5 | 0.8 | 0.8 | 0 | `/pl/updates/unicode-18-data-premiery-potwierdzona/` |
| pt | p53.3 | 10.4 | 10.4 | 0 | `/pt/updates/data-de-lancamento-unicode-18-confirmada/` |
| pt | p50.2 | 9.2 | 9.2 | 0 | `/pt/updates/unicode-18-novos-emojis-votacao/` |
| ru | p45.6 | 10.3 | 10.3 | 0 | `/ru/updates/unicode-18-most-anticipated-emoji/` |
| ru | p42.2 | 8.2 | 8.2 | 0 | `/ru/updates/unicode-18-release-date-confirmed/` |
| sv | p40.9 | 4.8 | 4.8 | 0 | `/sv/updates/unicode-18-betagranskning-oppnar/` |
| sv | p9.1 | 0.7 | 0.7 | 0 | `/sv/updates/dirham-symbol-unicode-18/` |
| sv | p4.5 | 0.6 | 0.6 | 0 | `/sv/updates/valutasymboler-mellanostern-unicode-18/` |
| th | p17.2 | 3.8 | 3.8 | 0 | `/th/updates/unicode-18-most-anticipated-emoji/` |
| th | p15.3 | 3.7 | 3.7 | 0 | `/th/updates/unicode-18-release-date-confirmed/` |
| tr | p82.6 | 24 | 24 | 0 | `/tr/updates/unicode-18-beta-inceleme-basliyor/` |
| tr | p72.2 | 16.1 | 16.1 | 0 | `/tr/updates/unicode-18-yeni-emoji-oylama/` |
| tr | p54.3 | 10 | 10 | 0 | `/tr/updates/unicode-18-cikis-tarihi-onaylandi/` |
| tr | p20.9 | 4.5 | 4.5 | 0 | `/tr/updates/dirhem-sembolu-unicode-18/` |
| tr | p0.4 | 0.5 | 0.5 | 0 | `/tr/updates/orta-dogu-para-birimi-sembolleri-unicode-18/` |
| vi | p41.6 | 15.2 | 15.2 | 0 | `/vi/updates/lien-quan-khoa-doi-ten/` |
| vi | p24.9 | 7 | 7 | 0 | `/vi/updates/emoji-moi-unicode-18/` |
| vi | p22.2 | 6.3 | 6.3 | 0 | `/vi/updates/unicode-18-xac-nhan-ngay-phat-hanh/` |
| zh-tw | p17.2 | 6.2 | 6.2 | 0 | `/zh-tw/updates/unicode-18-xin-biaoqing-fuhao/` |
| zh-tw | p0 | 0.9 | 0.9 | 0 | `/zh-tw/updates/unicode-18-fabu-riqi-queren/` |

## Guides

English pages, calibrated. PASS ≤ 7 · REVIEW ≤ 8 · FAIL > 8.

| | |
|---|---:|
| Pages checked | 32 |
| Pass | 20 |
| Review | 0 |
| Fail | 12 |
| Mean EFR | 6.72 |
| Median EFR | 4.5 |
| P90 EFR | 14.2 |
| Locale pages (uncalibrated) | 90 |
| Hub index (unclassified) | 1 |

**Since baseline (2026-09-01):** 32 pages compared · regressions 0 · improvements 0 · new failures 0 · resolved failures 0. A regression or improvement is a move of 0.5 or more.

### Top 20 Guides by EFR — editorial backlog

| EFR | status | band | previous | Δ | pct (en) | route | major contributors |
|---:|---|---|---:|---:|---:|---|---|
| 26.2 | FAIL | severe editorial footprint | 26.2 | 0 | p99 | `/guide/linkedin-comment-styling/` | specificityDeficit 14.0, formulaicSyntax 4.4, formulaicPhraseDensity 3.8 · 23 em dashes, 2 distinct facts, 10 three-item lists, 2 formulaic phrases |
| 17.5 | FAIL | severe editorial footprint | 17.5 | 0 | p78.7 | `/guide/linkedin-comments-guide/` | specificityDeficit 14.8, formulaicSyntax 1.0, promotionalVagueness 0.9 · 47 em dashes, 5 distinct facts, 16 three-item lists, 1 rhetorical question |
| 14.5 | FAIL | severe editorial footprint | 14.5 | 0 | p64.8 | `/guide/instagram-fonts-shadowban-myth/` | specificityDeficit 13.4, formulaicSyntax 0.7 · 36 em dashes, 4 distinct facts, 8 three-item lists, 2 rhetorical questions |
| 14.2 | FAIL | severe editorial footprint | 14.2 | 0 | p64.1 | `/guide/linkedin-bold-text-reach/` | specificityDeficit 12.4, formulaicSyntax 0.9, punctuationFingerprint 0.6 · 29 em dashes, 4 distinct facts, 2 three-item lists, 2 rhetorical questions |
| 13.6 | FAIL | severe editorial footprint | 13.6 | 0 | p61.3 | `/guide/comments-that-stand-out/` | specificityDeficit 6.3, promotionalVagueness 4.4, punctuationFingerprint 1.3 · 42 em dashes, 8 distinct facts, 10 three-item lists |
| 13.5 | FAIL | severe editorial footprint | 13.5 | 0 | p60.8 | `/guide/the-rhetoric-of-fonts/` | specificityDeficit 4.3, formulaicPhraseDensity 3.8, formulaicSyntax 3.8 · 35 em dashes, 8 distinct facts, 11 three-item lists, 3 formulaic phrases |
| 13.2 | FAIL | severe editorial footprint | 13.2 | 0 | p59.8 | `/guide/stop-the-scroll-with-font-variation/` | specificityDeficit 6.7, promotionalVagueness 3.2, formulaicSyntax 3.0 · 30 em dashes, 7 distinct facts, 13 three-item lists, 3 rhetorical questions |
| 9.6 | FAIL | fail / editorial rewrite required | 9.6 | 0 | p45.7 | `/guide/branding-with-fonts-for-social-media/` | formulaicSyntax 4.1, formulaicPhraseDensity 3.7, promotionalVagueness 1.6 · 20 em dashes, 10 distinct facts, 10 three-item lists, 2 formulaic phrases |
| 9.6 | FAIL | fail / editorial rewrite required | 9.6 | 0 | p45.7 | `/guide/linkedin-fonts-recruiters-ats/` | specificityDeficit 7.8, formulaicSyntax 1.4 · 33 em dashes, 7 distinct facts, 9 three-item lists, 3 rhetorical questions |
| 9.1 | FAIL | fail / editorial rewrite required | 9.1 | 0 | p43.8 | `/guide/discord-safe-name-styling/` | specificityDeficit 5.1, formulaicSyntax 2.8, rhythmRepetition 0.6 · 15 em dashes, 5 distinct facts, 8 three-item lists, shape shared with 1 sibling |
| 9.1 | FAIL | fail / editorial rewrite required | 9.1 | 0 | p43.8 | `/guide/tiktok-font-changed/` | specificityDeficit 7.5, promotionalVagueness 0.8, punctuationFingerprint 0.6 · 28 em dashes, 7 distinct facts, 4 three-item lists |
| 8.3 | FAIL | fail / editorial rewrite required | 8.3 | 0 | p40.2 | `/guide/unicode-symbol-approval-process/` | specificityDeficit 5.5, formulaicSyntax 2.5 · 36 em dashes, 9 distinct facts, 14 three-item lists, 1 rhetorical question |
| 6.1 | PASS | target | 6.1 | 0 | p31.4 | `/guide/instagram-font-ideas/` | formulaicPhraseDensity 2.9, specificityDeficit 2.2, rhythmRepetition 0.9 · 27 em dashes, 8 distinct facts, 2 three-item lists, 2 formulaic phrases |
| 6 | PASS | excellent | 6 | 0 | p30.7 | `/guide/personal-branding-through-typography/` | promotionalVagueness 3.3, specificityDeficit 2.5 · 30 em dashes, 9 distinct facts, 3 three-item lists |
| 5.2 | PASS | excellent | 5.2 | 0 | p26.2 | `/guide/discord-where-fonts-work/` | specificityDeficit 2.3, formulaicSyntax 1.2, punctuationFingerprint 0.7 · 29 em dashes, 8 distinct facts, 3 three-item lists, 2 rhetorical questions, shape shared with 1 sibling |
| 4.9 | PASS | excellent | 4.9 | 0 | p24.6 | `/guide/whatsapp-text-formatting-explained/` | punctuationFingerprint 2.0, formulaicPhraseDensity 1.9, rhythmRepetition 1.0 · 27 em dashes, 9 distinct facts, 3 three-item lists, 1 formulaic phrase |
| 4.1 | PASS | excellent | 4.1 | 0 | p19.9 | `/guide/style-linkedin-hooks-to-stand-out/` | formulaicSyntax 1.2, specificityDeficit 1.2, promotionalVagueness 0.8 · 35 em dashes, 10 distinct facts, 7 three-item lists, 3 rhetorical questions |
| 4 | PASS | very concise; check that useful teaching depth has not been removed | 4 | 0 | p19.4 | `/guide/discord-colored-text-guide/` | formulaicSyntax 2.4, promotionalVagueness 0.7, structuralTemplate 0.6 · 32 em dashes, 13 distinct facts, 4 three-item lists, 5 rhetorical questions, shape shared with 1 sibling |
| 3.8 | PASS | very concise; check that useful teaching depth has not been removed | 3.8 | 0 | p17.6 | `/guide/fancy-fonts-accessibility-guide/` | punctuationFingerprint 2.0, promotionalVagueness 1.3 · 24 em dashes, 10 distinct facts, 1 three-item list |
| 2.8 | PASS | very concise; check that useful teaching depth has not been removed | 2.8 | 0 | p9 | `/guide/vertical-text-guide/` | promotionalVagueness 1.8, specificityDeficit 0.7 · 22 em dashes, 9 distinct facts, 6 three-item lists |
| 12.3 | UNCLASSIFIED | hub index — no threshold | 12.3 | 0 | p56.3 | `/guide/` | formulaicSyntax 6.2, punctuationFingerprint 3.9, rhythmRepetition 1.4 · 57 em dashes, 18 distinct facts, 21 three-item lists |

### Locale guides — UNCALIBRATED

Scored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see `docs/editorial-footprint-risk.md`). Ranked by percentile **within each page's own locale**.

| locale | pct within locale | EFR | previous | Δ | route |
|---|---:|---:|---:|---:|---|
| ar | p86.5 | 28.6 | 28.6 | 0 | `/ar/guide/ism-discord-amin/` |
| ar | p78.1 | 24.7 | 24.7 | 0 | `/ar/guide/amaken-khutut-discord/` |
| ar | p67.4 | 17 | 17 | 0 | `/ar/guide/tanseeq-nusus-discord/` |
| bs | p45.5 | 14.1 | 14.1 | 0 | `/bs/guide/siguran-nadimak-na-discordu/` |
| bs | p27.3 | 8.1 | 8.1 | 0 | `/bs/guide/gdje-rade-fontovi-na-discordu/` |
| bs | p0 | 0.6 | 0.6 | 0 | `/bs/guide/oblikovanje-teksta-na-discordu/` |
| cs | p78.6 | 15.2 | 15.2 | 0 | `/cs/guide/kde-funguje-pismo-na-discordu/` |
| cs | p71.4 | 14.3 | 14.3 | 0 | `/cs/guide/bezpecny-nick-na-discordu/` |
| cs | p0 | 0.9 | 0.9 | 0 | `/cs/guide/formatovani-textu-na-discordu/` |
| da | p66.7 | 18.7 | 18.7 | 0 | `/da/guide/sikkert-discord-navn/` |
| da | p60 | 12.5 | 12.5 | 0 | `/da/guide/hvor-virker-skrifttyper-i-discord/` |
| da | p6.7 | 0.7 | 0.7 | 0 | `/da/guide/discord-tekstformatering-forklaret/` |
| de | p95.9 | 25.2 | 25.2 | 0 | `/de/guide/discord-namen-sicher-gestalten/` |
| de | p89.2 | 21.5 | 21.5 | 0 | `/de/guide/wo-funktionieren-schriftarten-in-discord/` |
| de | p65.3 | 13 | 13 | 0 | `/de/guide/discord-textformatierung-erklaert/` |
| es | p42.5 | 8.4 | 8.4 | 0 | `/es/guide/nombre-discord-sin-riesgos/` |
| es | p40.2 | 7 | 7 | 0 | `/es/guide/donde-funcionan-las-fuentes-en-discord/` |
| es | p40.2 | 7 | 7 | 0 | `/es/guide/formato-texto-discord-explicado/` |
| fi | p81.3 | 21.4 | 21.4 | 0 | `/fi/guide/turvallinen-discord-nimimerkki/` |
| fi | p75 | 18.2 | 18.2 | 0 | `/fi/guide/missa-discord-fontit-toimivat/` |
| fi | p56.3 | 6.1 | 6.1 | 0 | `/fi/guide/discord-tekstin-muotoilu-selitetty/` |
| fr | p87.8 | 26.3 | 26.3 | 0 | `/fr/guide/pseudo-discord-sans-risque/` |
| fr | p82.4 | 24.3 | 24.3 | 0 | `/fr/guide/ou-fonctionnent-les-polices-discord/` |
| fr | p75.6 | 18.4 | 18.4 | 0 | `/fr/guide/formatage-texte-discord-explique/` |
| hi | p77.8 | 10.6 | 10.6 | 0 | `/hi/guide/discord-font-kahan-kaam-karte-hain/` |
| hi | p44.4 | 7.6 | 7.6 | 0 | `/hi/guide/discord-safe-naam-styling/` |
| hi | p11.1 | 2 | 2 | 0 | `/hi/guide/discord-text-formatting-samjhein/` |
| hr | p69.2 | 14 | 14 | 0 | `/hr/guide/siguran-nadimak-na-discordu/` |
| hr | p38.5 | 11.2 | 11.2 | 0 | `/hr/guide/gdje-rade-fontovi-na-discordu/` |
| hr | p0 | 0.6 | 0.6 | 0 | `/hr/guide/oblikovanje-teksta-na-discordu/` |
| hu | p69.2 | 14.7 | 14.7 | 0 | `/hu/guide/biztonsagos-discord-becenev/` |
| hu | p46.2 | 12.2 | 12.2 | 0 | `/hu/guide/hol-mukodnek-a-discord-fontok/` |
| hu | p0 | 0.8 | 0.8 | 0 | `/hu/guide/discord-szovegformazas/` |
| id | p83.5 | 26.3 | 26.3 | 0 | `/id/guide/nama-discord-aman/` |
| id | p69.2 | 19.4 | 19.4 | 0 | `/id/guide/di-mana-font-discord-bekerja/` |
| id | p36.8 | 8.1 | 8.1 | 0 | `/id/guide/format-teks-discord-dijelaskan/` |
| it | p88.8 | 26.4 | 26.4 | 0 | `/it/guide/nome-discord-senza-rischi/` |
| it | p87.9 | 25.7 | 25.7 | 0 | `/it/guide/dove-funzionano-i-font-discord/` |
| it | p80.3 | 20.7 | 20.7 | 0 | `/it/guide/formattazione-testo-discord-spiegata/` |
| ja | p65 | 12.5 | 12.5 | 0 | `/ja/guide/discord-anzen-namae/` |
| ja | p65 | 12.5 | 12.5 | 0 | `/ja/guide/discord-font-doko/` |
| ja | p59.6 | 10.2 | 10.2 | 0 | `/ja/guide/discord-moji-soshoku/` |
| ko | p94.2 | 33.3 | 33.3 | 0 | `/ko/guide/discord-ponteu-jiwon/` |
| ko | p89.8 | 30.5 | 30.5 | 0 | `/ko/guide/discord-nikneim-anjeon/` |
| ko | p86.4 | 27.5 | 27.5 | 0 | `/ko/guide/discord-tekseuteu-seosik/` |
| ms | p91.3 | 22.2 | 22.2 | 0 | `/ms/guide/nama-discord-selamat/` |
| ms | p87 | 16.2 | 16.2 | 0 | `/ms/guide/di-mana-font-discord-berfungsi/` |
| ms | p17.4 | 3.6 | 3.6 | 0 | `/ms/guide/format-teks-discord-dijelaskan/` |
| nl | p71.9 | 25.5 | 25.5 | 0 | `/nl/guide/discord-naam-veilig-stylen/` |
| nl | p60.8 | 22 | 22 | 0 | `/nl/guide/waar-lettertypes-werken-in-discord/` |
| nl | p37.7 | 13.6 | 13.6 | 0 | `/nl/guide/discord-tekstopmaak-uitgelegd/` |
| no | p91.3 | 11.4 | 11.4 | 0 | `/no/guide/trygt-discord-navn/` |
| no | p47.8 | 5 | 5 | 0 | `/no/guide/hvor-fungerer-skrifter-i-discord/` |
| no | p0 | 0.6 | 0.6 | 0 | `/no/guide/discord-tekstformatering-forklart/` |
| pl | p77.8 | 24.2 | 24.2 | 0 | `/pl/guide/bezpieczna-nazwa-na-discordzie/` |
| pl | p73.9 | 22.4 | 22.4 | 0 | `/pl/guide/gdzie-dzialaja-czcionki-na-discordzie/` |
| pl | p40.4 | 11.4 | 11.4 | 0 | `/pl/guide/formatowanie-tekstu-na-discordzie/` |
| pt | p92.9 | 26.1 | 26.1 | 0 | `/pt/guide/nome-discord-sem-risco/` |
| pt | p86.2 | 24.1 | 24.1 | 0 | `/pt/guide/onde-as-fontes-funcionam-no-discord/` |
| pt | p75.6 | 20.3 | 20.3 | 0 | `/pt/guide/formatacao-de-texto-no-discord/` |
| ro | p84.6 | 20.2 | 20.2 | 0 | `/ro/guide/nume-discord-fara-riscuri/` |
| ro | p69.2 | 14.9 | 14.9 | 0 | `/ro/guide/unde-functioneaza-fonturile-discord/` |
| ro | p7.7 | 3.4 | 3.4 | 0 | `/ro/guide/formatare-text-discord-explicat/` |
| ru | p80 | 26.6 | 26.6 | 0 | `/ru/guide/bezopasnyy-nik-discord/` |
| ru | p73.3 | 23.3 | 23.3 | 0 | `/ru/guide/gde-rabotayut-shrifty-discord/` |
| ru | p60 | 16.1 | 16.1 | 0 | `/ru/guide/formatirovanie-teksta-discord/` |
| sk | p58.3 | 15 | 15 | 0 | `/sk/guide/kde-funguje-pismo-na-discorde/` |
| sk | p33.3 | 9.5 | 9.5 | 0 | `/sk/guide/bezpecny-nick-na-discorde/` |
| sk | p0 | 0.6 | 0.6 | 0 | `/sk/guide/formatovanie-textu-na-discorde/` |
| sr | p45.5 | 14.2 | 14.2 | 0 | `/sr/guide/bezbedan-nadimak-na-discordu/` |
| sr | p27.3 | 8.1 | 8.1 | 0 | `/sr/guide/gde-fontovi-rade-na-discordu/` |
| sr | p0 | 0.6 | 0.6 | 0 | `/sr/guide/formatiranje-teksta-na-discordu/` |
| sv | p95.5 | 20.9 | 20.9 | 0 | `/sv/guide/discord-namn-utan-risk/` |
| sv | p81.8 | 15.8 | 15.8 | 0 | `/sv/guide/var-typsnitt-fungerar-i-discord/` |
| sv | p45.5 | 5.7 | 5.7 | 0 | `/sv/guide/discord-textformatering-forklarad/` |
| th | p86.6 | 14.9 | 14.9 | 0 | `/th/guide/discord-font-thamngan-thinai/` |
| th | p69.4 | 10.9 | 10.9 | 0 | `/th/guide/discord-tang-chue-plodphai/` |
| th | p45.2 | 7.8 | 7.8 | 0 | `/th/guide/discord-rupbaep-khokhwam/` |
| tl | p66.7 | 14.4 | 14.4 | 0 | `/tl/guide/discord-name-na-safe/` |
| tl | p50 | 12.5 | 12.5 | 0 | `/tl/guide/saan-gumagana-ang-font-sa-discord/` |
| tl | p0 | 2.4 | 2.4 | 0 | `/tl/guide/discord-text-formatting-paliwanag/` |
| tr | p87.4 | 26.2 | 26.2 | 0 | `/tr/guide/guvenli-discord-ismi/` |
| tr | p83.9 | 24.5 | 24.5 | 0 | `/tr/guide/discord-fontlari-nerede-calisir/` |
| tr | p76.1 | 18 | 18 | 0 | `/tr/guide/discord-metin-bicimlendirme/` |
| vi | p76.8 | 25 | 25 | 0 | `/vi/guide/dat-ten-discord-an-toan/` |
| vi | p69.2 | 22.5 | 22.5 | 0 | `/vi/guide/font-discord-dung-o-dau/` |
| vi | p38.9 | 13.6 | 13.6 | 0 | `/vi/guide/dinh-dang-chu-discord/` |
| zh-tw | p74.2 | 20.3 | 20.3 | 0 | `/zh-tw/guide/discord-ziti-nali-nengyong/` |
| zh-tw | p72 | 19.8 | 19.8 | 0 | `/zh-tw/guide/discord-anquan-nicheng/` |
| zh-tw | p46.2 | 15.2 | 15.2 | 0 | `/zh-tw/guide/discord-wenzi-geshi/` |

## Exceptions

None recorded in `data/efr_exceptions.json`.


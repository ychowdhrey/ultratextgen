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
| Review | 0 |
| Fail | 4 |
| Mean EFR | 4.55 |
| Median EFR | 4.3 |
| P90 EFR | 8.5 |
| Locale pages (uncalibrated) | 56 |
| Hub index (unclassified) | 1 |

**Since baseline (2026-09-01):** 11 pages compared · regressions 0 · improvements 2 · new failures 0 · resolved failures 0. A regression or improvement is a move of 0.5 or more.

### Top 11 Updates by EFR — editorial backlog

| EFR | status | band | previous | Δ | pct (en) | route | major contributors |
|---:|---|---|---:|---:|---:|---|---|
| 9.3 | FAIL | fail / editorial rewrite required | 10.9 | -1.6 | p44.7 | `/updates/lienquan-mobile-name-penalty-update/` | specificityDeficit 8.6, rhythmRepetition 0.7 · 0 em dashes, 7 distinct facts, 1 three-item list |
| 8.5 | FAIL | fail / editorial rewrite required | 8.5 | 0 | p41.7 | `/updates/unicode-18-most-anticipated-emoji/` | specificityDeficit 6.3, structuralTemplate 1.7, rhythmRepetition 0.5 · 0 em dashes, 10 distinct facts, 1 three-item list, shape shared with 1 sibling |
| 7.1 | FAIL | fail / editorial rewrite required | 7.1 | 0 | p35.4 | `/updates/forza-horizon-6-gamertag-rules/` | specificityDeficit 6.0, rhythmRepetition 1.0 · 0 em dashes, 10 distinct facts, 1 three-item list |
| 7.1 | FAIL | fail / editorial rewrite required | 7.2 | -0.1 | p35.4 | `/updates/telegram-premium-message-limit/` | specificityDeficit 6.5, rhythmRepetition 0.6 · 0 em dashes, 8 distinct facts, 0 three-item lists |
| 4.5 | PASS | target | 4.5 | 0 | p22.9 | `/updates/middle-east-currency-symbols-scorecard/` | promotionalVagueness 3.7 · 1 em dash, 22 distinct facts, 1 three-item list |
| 4.3 | PASS | target | 4.3 | 0 | p21.6 | `/updates/unicode-18-release-date-confirmed/` | specificityDeficit 3.3, rhythmRepetition 0.5 · 1 em dash, 16 distinct facts, 0 three-item lists |
| 3.4 | PASS | target | 3.4 | 0 | p11.3 | `/updates/unicode-18-beta-review-opens/` | structuralTemplate 1.7, rhythmRepetition 1.1, punctuationFingerprint 0.7 · 1 em dash, 18 distinct facts, 3 three-item lists, shape shared with 1 sibling |
| 2.9 | PASS | exceptional | 2.9 | 0 | p9.4 | `/updates/uae-dirham-symbol-unicode-18/` | specificityDeficit 2.5 · 0 em dashes, 13 distinct facts, 4 three-item lists |
| 1.4 | PASS | exceptional | 1.4 | 0 | p3 | `/updates/xbox-gamertag-15-character-limit/` | punctuationFingerprint 0.8, rhythmRepetition 0.6 · 1 em dash, 15 distinct facts, 2 three-item lists |
| 0.9 | PASS | exceptional | 0.9 | 0 | p1.4 | `/updates/unicode-17-new-emoji-rollout/` | rhythmRepetition 0.9 · 0 em dashes, 17 distinct facts, 1 three-item list |
| 0.6 | PASS | exceptional | 2.3 | -1.7 | p0.4 | `/updates/whatsapp-usernames-rollout/` | rhythmRepetition 0.6 · 0 em dashes, 16 distinct facts, 1 three-item list |
| 8.4 | UNCLASSIFIED | hub index — no threshold | 8.4 | 0 | p40.8 | `/updates/` | punctuationFingerprint 8.0 · 18 em dashes, 14 distinct facts, 1 three-item list |

### Locale updates — UNCALIBRATED

Scored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see `docs/editorial-footprint-risk.md`). Ranked by percentile **within each page's own locale**.

| locale | pct within locale | EFR | previous | Δ | route |
|---|---:|---:|---:|---:|---|
| ar | p90.4 | 30.2 | 30.2 | 0 | `/ar/updates/unicode-18-beta-review-opens/` |
| ar | p72.5 | 21.2 | 21.2 | 0 | `/ar/updates/unicode-18-most-anticipated-emoji/` |
| ar | p46.6 | 7.7 | 7.7 | 0 | `/ar/updates/unicode-18-release-date-confirmed/` |
| ar | p44.4 | 7.1 | 7.1 | 0 | `/ar/updates/uae-dirham-symbol-unicode-18/` |
| ar | p0.6 | 0.3 | 0.3 | 0 | `/ar/updates/middle-east-currency-symbols-scorecard/` |
| de | p88.4 | 20.5 | 20.5 | 0 | `/de/updates/unicode-18-beta-startet/` |
| de | p53 | 8.8 | 8.8 | 0 | `/de/updates/unicode-18-emoji-abstimmung/` |
| de | p23.5 | 4.2 | 4.2 | 0 | `/de/updates/unicode-18-erscheinungsdatum-bestaetigt/` |
| de | p0.4 | 0.5 | 0.5 | 0 | `/de/updates/naher-osten-waehrungssymbole-unicode-18/` |
| de | p0.4 | 0.5 | 0.5 | 0 | `/de/updates/vae-dirham-symbol-unicode-18/` |
| es | p50.8 | 9.6 | 9.6 | 0 | `/es/updates/unicode-18-nuevos-emojis-votacion/` |
| es | p39.4 | 6.6 | 6.6 | 0 | `/es/updates/unicode-18-beta-comienza-revision/` |
| es | p3.1 | 1.1 | 1.1 | 0 | `/es/updates/unicode-18-fecha-lanzamiento-confirmada/` |
| es | p1.2 | 0.6 | 0.6 | 0 | `/es/updates/simbolo-dirham-emiratos-unicode-18/` |
| es | p1 | 0.5 | 0.5 | 0 | `/es/updates/simbolos-moneda-oriente-medio-unicode-18/` |
| fr | p72.4 | 17 | 17 | 0 | `/fr/updates/unicode-18-nouveaux-emojis-vote/` |
| fr | p62.4 | 12.6 | 12.6 | 0 | `/fr/updates/unicode-18-date-de-sortie-confirmee/` |
| id | p1.5 | 1 | 1 | 0 | `/id/updates/unicode-18-emoji-baru-voting/` |
| id | p1.1 | 0.9 | 0.9 | 0 | `/id/updates/tanggal-rilis-unicode-18-dipastikan/` |
| it | p73.5 | 17.4 | 17.4 | 0 | `/it/updates/revisione-beta-unicode-18/` |
| it | p60.5 | 12.3 | 12.3 | 0 | `/it/updates/data-di-uscita-unicode-18-confermata/` |
| it | p34.5 | 7.1 | 7.1 | 0 | `/it/updates/simbolo-dirham-unicode-18/` |
| it | p0 | 0.5 | 0.5 | 0 | `/it/updates/simboli-valuta-medio-oriente-unicode-18/` |
| ja | p35 | 5.2 | 5.2 | 0 | `/ja/updates/unicode-18-most-anticipated-emoji/` |
| ja | p2 | 1 | 1 | 0 | `/ja/updates/unicode-18-release-date-confirmed/` |
| ko | p89.3 | 29.3 | 29.3 | 0 | `/ko/updates/unicode-18-beta-sijak/` |
| ko | p62.1 | 9.7 | 9.7 | 0 | `/ko/updates/unicode-18-imoji-tupyo/` |
| ko | p30.1 | 3.2 | 3.2 | 0 | `/ko/updates/dirham-giho-unicode-18/` |
| ko | p20.4 | 2.1 | 2.1 | 0 | `/ko/updates/unicode-18-chulsi-il-hwakjeong/` |
| ko | p0.5 | 0.5 | 0.5 | 0 | `/ko/updates/jungdong-hwapye-giho-unicode-18/` |
| nl | p56.3 | 21.2 | 21.2 | 0 | `/nl/updates/unicode-18-beta-van-start/` |
| nl | p35.7 | 12.4 | 12.4 | 0 | `/nl/updates/unicode-18-nieuwe-emoji-stemming/` |
| nl | p25.1 | 6.1 | 6.1 | 0 | `/nl/updates/unicode-18-releasedatum-bevestigd/` |
| nl | p1.5 | 0.6 | 0.6 | 0 | `/nl/updates/dirham-symbool-unicode-18/` |
| nl | p1 | 0.5 | 0.5 | 0 | `/nl/updates/valutasymbolen-midden-oosten-unicode-18/` |
| pl | p2.5 | 0.9 | 0.9 | 0 | `/pl/updates/unicode-18-nowe-emoji-glosowanie/` |
| pl | p1.5 | 0.8 | 0.8 | 0 | `/pl/updates/unicode-18-data-premiery-potwierdzona/` |
| pt | p58.7 | 11.9 | 11.9 | 0 | `/pt/updates/unicode-18-novos-emojis-votacao/` |
| pt | p56.4 | 11.4 | 11.4 | 0 | `/pt/updates/data-de-lancamento-unicode-18-confirmada/` |
| ru | p53.9 | 13.8 | 13.8 | 0 | `/ru/updates/unicode-18-most-anticipated-emoji/` |
| ru | p43.9 | 9.5 | 9.5 | 0 | `/ru/updates/unicode-18-release-date-confirmed/` |
| sv | p50 | 6.2 | 6.2 | 0 | `/sv/updates/unicode-18-betagranskning-oppnar/` |
| sv | p9.1 | 0.7 | 0.7 | 0 | `/sv/updates/dirham-symbol-unicode-18/` |
| sv | p4.5 | 0.6 | 0.6 | 0 | `/sv/updates/valutasymboler-mellanostern-unicode-18/` |
| th | p31.8 | 5.9 | 5.9 | 0 | `/th/updates/unicode-18-most-anticipated-emoji/` |
| th | p19.7 | 4.2 | 4.2 | 0 | `/th/updates/unicode-18-release-date-confirmed/` |
| tr | p83.9 | 24.7 | 24.7 | 0 | `/tr/updates/unicode-18-beta-inceleme-basliyor/` |
| tr | p77 | 18.9 | 18.9 | 0 | `/tr/updates/unicode-18-yeni-emoji-oylama/` |
| tr | p57 | 10.9 | 10.9 | 0 | `/tr/updates/unicode-18-cikis-tarihi-onaylandi/` |
| tr | p31.7 | 6.7 | 6.7 | 0 | `/tr/updates/dirhem-sembolu-unicode-18/` |
| tr | p0.4 | 0.5 | 0.5 | 0 | `/tr/updates/orta-dogu-para-birimi-sembolleri-unicode-18/` |
| vi | p41.6 | 15.2 | 15.2 | 0 | `/vi/updates/lien-quan-khoa-doi-ten/` |
| vi | p29.2 | 9.4 | 9.4 | 0 | `/vi/updates/emoji-moi-unicode-18/` |
| vi | p25.4 | 7.5 | 7.5 | 0 | `/vi/updates/unicode-18-xac-nhan-ngay-phat-hanh/` |
| zh-tw | p16.1 | 6.2 | 6.2 | 0 | `/zh-tw/updates/unicode-18-xin-biaoqing-fuhao/` |
| zh-tw | p0 | 0.9 | 0.9 | 0 | `/zh-tw/updates/unicode-18-fabu-riqi-queren/` |

## Guides

English pages, calibrated. PASS ≤ 7 · REVIEW ≤ 8 · FAIL > 8.

| | |
|---|---:|
| Pages checked | 32 |
| Pass | 21 |
| Review | 0 |
| Fail | 11 |
| Mean EFR | 6.75 |
| Median EFR | 4.25 |
| P90 EFR | 14.4 |
| Locale pages (uncalibrated) | 90 |
| Hub index (unclassified) | 1 |

**Since baseline (2026-09-01):** 32 pages compared · regressions 0 · improvements 0 · new failures 0 · resolved failures 0. A regression or improvement is a move of 0.5 or more.

### Top 20 Guides by EFR — editorial backlog

| EFR | status | band | previous | Δ | pct (en) | route | major contributors |
|---:|---|---|---:|---:|---:|---|---|
| 27 | FAIL | severe editorial footprint | 27 | 0 | p99.1 | `/guide/linkedin-comment-styling/` | specificityDeficit 14.2, formulaicSyntax 4.2, formulaicPhraseDensity 3.7 · 23 em dashes, 2 distinct facts, 10 three-item lists, 2 formulaic phrases |
| 18 | FAIL | severe editorial footprint | 18 | 0 | p80.9 | `/guide/linkedin-comments-guide/` | specificityDeficit 14.8, promotionalVagueness 1.3, formulaicSyntax 1.0 · 47 em dashes, 5 distinct facts, 16 three-item lists, 1 rhetorical question |
| 14.6 | FAIL | severe editorial footprint | 14.6 | 0 | p64.9 | `/guide/instagram-fonts-shadowban-myth/` | specificityDeficit 13.6, formulaicSyntax 0.7 · 36 em dashes, 4 distinct facts, 8 three-item lists, 2 rhetorical questions |
| 14.4 | FAIL | severe editorial footprint | 14.4 | 0 | p64.5 | `/guide/the-rhetoric-of-fonts/` | specificityDeficit 4.8, formulaicPhraseDensity 3.6, formulaicSyntax 3.6 · 35 em dashes, 8 distinct facts, 11 three-item lists, 3 formulaic phrases |
| 14.3 | FAIL | severe editorial footprint | 14.3 | 0 | p64.1 | `/guide/linkedin-bold-text-reach/` | specificityDeficit 12.5, formulaicSyntax 0.9, punctuationFingerprint 0.6 · 29 em dashes, 4 distinct facts, 2 three-item lists, 2 rhetorical questions |
| 14.1 | FAIL | severe editorial footprint | 14.1 | 0 | p63.6 | `/guide/stop-the-scroll-with-font-variation/` | specificityDeficit 7.0, promotionalVagueness 4.0, formulaicSyntax 3.0 · 30 em dashes, 7 distinct facts, 13 three-item lists, 3 rhetorical questions |
| 13.7 | FAIL | severe editorial footprint | 13.7 | 0 | p61.7 | `/guide/comments-that-stand-out/` | specificityDeficit 6.5, promotionalVagueness 4.3, punctuationFingerprint 1.2 · 42 em dashes, 8 distinct facts, 10 three-item lists |
| 9.9 | FAIL | fail / editorial rewrite required | 9.9 | 0 | p47.6 | `/guide/linkedin-fonts-recruiters-ats/` | specificityDeficit 8.0, formulaicSyntax 1.4 · 34 em dashes, 7 distinct facts, 9 three-item lists, 3 rhetorical questions |
| 9.3 | FAIL | fail / editorial rewrite required | 9.3 | 0 | p44.7 | `/guide/branding-with-fonts-for-social-media/` | formulaicSyntax 3.9, formulaicPhraseDensity 3.6, promotionalVagueness 1.6 · 20 em dashes, 10 distinct facts, 10 three-item lists, 2 formulaic phrases |
| 9.3 | FAIL | fail / editorial rewrite required | 9.3 | 0 | p44.7 | `/guide/tiktok-font-changed/` | specificityDeficit 7.7, promotionalVagueness 0.8, punctuationFingerprint 0.6 · 28 em dashes, 7 distinct facts, 4 three-item lists |
| 8.5 | FAIL | fail / editorial rewrite required | 8.5 | 0 | p41.7 | `/guide/unicode-symbol-approval-process/` | specificityDeficit 5.8, formulaicSyntax 2.4 · 36 em dashes, 9 distinct facts, 14 three-item lists, 1 rhetorical question |
| 6.7 | PASS | target | 6.7 | 0 | p34.1 | `/guide/instagram-font-ideas/` | specificityDeficit 2.9, formulaicPhraseDensity 2.7, rhythmRepetition 0.9 · 28 em dashes, 8 distinct facts, 2 three-item lists, 2 formulaic phrases |
| 6.4 | PASS | target | 6.4 | 0 | p32.2 | `/guide/personal-branding-through-typography/` | promotionalVagueness 3.2, specificityDeficit 2.9 · 30 em dashes, 9 distinct facts, 3 three-item lists |
| 5.6 | PASS | excellent | 5.6 | 0 | p27.8 | `/guide/discord-where-fonts-work/` | specificityDeficit 2.7, formulaicSyntax 1.2, punctuationFingerprint 0.7 · 30 em dashes, 8 distinct facts, 3 three-item lists, 2 rhetorical questions, shape shared with 1 sibling |
| 4.7 | PASS | excellent | 4.7 | 0 | p24 | `/guide/whatsapp-text-formatting-explained/` | punctuationFingerprint 1.9, formulaicPhraseDensity 1.9, rhythmRepetition 1.0 · 27 em dashes, 9 distinct facts, 3 three-item lists, 1 formulaic phrase |
| 4.4 | PASS | excellent | 4.4 | 0 | p22.3 | `/guide/style-linkedin-hooks-to-stand-out/` | specificityDeficit 1.6, formulaicSyntax 1.2, promotionalVagueness 0.8 · 35 em dashes, 10 distinct facts, 7 three-item lists, 3 rhetorical questions |
| 4.1 | PASS | excellent | 4.1 | 0 | p19.8 | `/guide/vertical-text-guide/` | promotionalVagueness 2.7, specificityDeficit 1.1 · 22 em dashes, 9 distinct facts, 6 three-item lists |
| 4 | PASS | very concise; check that useful teaching depth has not been removed | 4 | 0 | p19.3 | `/guide/discord-colored-text-guide/` | formulaicSyntax 2.4, promotionalVagueness 0.7, structuralTemplate 0.6 · 33 em dashes, 13 distinct facts, 4 three-item lists, 5 rhetorical questions, shape shared with 1 sibling |
| 3.9 | PASS | very concise; check that useful teaching depth has not been removed | 3.9 | 0 | p18.4 | `/guide/discord-safe-name-styling/` | formulaicSyntax 2.7, rhythmRepetition 0.6, structuralTemplate 0.6 · 15 em dashes, 8 distinct facts, 8 three-item lists, shape shared with 1 sibling |
| 3.7 | PASS | very concise; check that useful teaching depth has not been removed | 3.7 | 0 | p15.8 | `/guide/fancy-fonts-accessibility-guide/` | punctuationFingerprint 1.9, promotionalVagueness 1.3 · 24 em dashes, 11 distinct facts, 1 three-item list |
| 12.5 | UNCLASSIFIED | hub index — no threshold | 12.5 | 0 | p57.1 | `/guide/` | formulaicSyntax 6.3, punctuationFingerprint 4.0, rhythmRepetition 1.4 · 57 em dashes, 18 distinct facts, 21 three-item lists |

### Locale guides — UNCALIBRATED

Scored and ratcheted against their own previous versions, but no absolute threshold applies: raw EFR is not comparable across locales (see `docs/editorial-footprint-risk.md`). Ranked by percentile **within each page's own locale**.

| locale | pct within locale | EFR | previous | Δ | route |
|---|---:|---:|---:|---:|---|
| ar | p80.3 | 24.9 | 24.9 | 0 | `/ar/guide/amaken-khutut-discord/` |
| ar | p70.8 | 20 | 20 | 0 | `/ar/guide/ism-discord-amin/` |
| ar | p67.4 | 17.1 | 17.1 | 0 | `/ar/guide/tanseeq-nusus-discord/` |
| bs | p36.4 | 8.4 | 8.4 | 0 | `/bs/guide/gdje-rade-fontovi-na-discordu/` |
| bs | p27.3 | 5.1 | 5.1 | 0 | `/bs/guide/siguran-nadimak-na-discordu/` |
| bs | p0 | 0.6 | 0.6 | 0 | `/bs/guide/oblikovanje-teksta-na-discordu/` |
| cs | p57.1 | 11.7 | 11.7 | 0 | `/cs/guide/kde-funguje-pismo-na-discordu/` |
| cs | p35.7 | 4.7 | 4.7 | 0 | `/cs/guide/bezpecny-nick-na-discordu/` |
| cs | p0 | 0.9 | 0.9 | 0 | `/cs/guide/formatovani-textu-na-discordu/` |
| da | p66.7 | 12.1 | 12.1 | 0 | `/da/guide/hvor-virker-skrifttyper-i-discord/` |
| da | p53.3 | 9.3 | 9.3 | 0 | `/da/guide/sikkert-discord-navn/` |
| da | p6.7 | 0.7 | 0.7 | 0 | `/da/guide/discord-tekstformatering-forklaret/` |
| de | p90.3 | 21.7 | 21.7 | 0 | `/de/guide/wo-funktionieren-schriftarten-in-discord/` |
| de | p82.1 | 18.7 | 18.7 | 0 | `/de/guide/discord-namen-sicher-gestalten/` |
| de | p65.3 | 13.2 | 13.2 | 0 | `/de/guide/discord-textformatierung-erklaert/` |
| es | p39 | 6.5 | 6.5 | 0 | `/es/guide/donde-funcionan-las-fuentes-en-discord/` |
| es | p38.2 | 6.3 | 6.3 | 0 | `/es/guide/formato-texto-discord-explicado/` |
| es | p6 | 1.5 | 1.5 | 0 | `/es/guide/nombre-discord-sin-riesgos/` |
| fi | p81.3 | 18.5 | 18.5 | 0 | `/fi/guide/missa-discord-fontit-toimivat/` |
| fi | p68.8 | 10.6 | 10.6 | 0 | `/fi/guide/turvallinen-discord-nimimerkki/` |
| fi | p62.5 | 6.5 | 6.5 | 0 | `/fi/guide/discord-tekstin-muotoilu-selitetty/` |
| fr | p82.8 | 24.3 | 24.3 | 0 | `/fr/guide/ou-fonctionnent-les-polices-discord/` |
| fr | p81.4 | 21.8 | 21.8 | 0 | `/fr/guide/pseudo-discord-sans-risque/` |
| fr | p75.6 | 18.5 | 18.5 | 0 | `/fr/guide/formatage-texte-discord-explique/` |
| hi | p77.8 | 10.8 | 10.8 | 0 | `/hi/guide/discord-font-kahan-kaam-karte-hain/` |
| hi | p22.2 | 2.8 | 2.8 | 0 | `/hi/guide/discord-safe-naam-styling/` |
| hi | p11.1 | 2.4 | 2.4 | 0 | `/hi/guide/discord-text-formatting-samjhein/` |
| hr | p46.2 | 11.4 | 11.4 | 0 | `/hr/guide/gdje-rade-fontovi-na-discordu/` |
| hr | p23.1 | 5 | 5 | 0 | `/hr/guide/siguran-nadimak-na-discordu/` |
| hr | p0 | 0.6 | 0.6 | 0 | `/hr/guide/oblikovanje-teksta-na-discordu/` |
| hu | p46.2 | 11.9 | 11.9 | 0 | `/hu/guide/hol-mukodnek-a-discord-fontok/` |
| hu | p38.5 | 5.1 | 5.1 | 0 | `/hu/guide/biztonsagos-discord-becenev/` |
| hu | p0 | 0.6 | 0.6 | 0 | `/hu/guide/discord-szovegformazas/` |
| id | p70.3 | 19.7 | 19.7 | 0 | `/id/guide/di-mana-font-discord-bekerja/` |
| id | p65.4 | 18 | 18 | 0 | `/id/guide/nama-discord-aman/` |
| id | p41 | 8.7 | 8.7 | 0 | `/id/guide/format-teks-discord-dijelaskan/` |
| it | p88.3 | 25.8 | 25.8 | 0 | `/it/guide/dove-funzionano-i-font-discord/` |
| it | p82.1 | 22.1 | 22.1 | 0 | `/it/guide/nome-discord-senza-rischi/` |
| it | p80.7 | 20.9 | 20.9 | 0 | `/it/guide/formattazione-testo-discord-spiegata/` |
| ja | p65.5 | 12.3 | 12.3 | 0 | `/ja/guide/discord-font-doko/` |
| ja | p61.1 | 10.7 | 10.7 | 0 | `/ja/guide/discord-anzen-namae/` |
| ja | p59.1 | 10.2 | 10.2 | 0 | `/ja/guide/discord-moji-soshoku/` |
| ko | p94.2 | 33.4 | 33.4 | 0 | `/ko/guide/discord-ponteu-jiwon/` |
| ko | p89.8 | 30.2 | 30.2 | 0 | `/ko/guide/discord-nikneim-anjeon/` |
| ko | p86.4 | 27.7 | 27.7 | 0 | `/ko/guide/discord-tekseuteu-seosik/` |
| ms | p91.3 | 16.4 | 16.4 | 0 | `/ms/guide/di-mana-font-discord-berfungsi/` |
| ms | p69.6 | 12.4 | 12.4 | 0 | `/ms/guide/nama-discord-selamat/` |
| ms | p21.7 | 4.1 | 4.1 | 0 | `/ms/guide/format-teks-discord-dijelaskan/` |
| nl | p61.3 | 22.2 | 22.2 | 0 | `/nl/guide/waar-lettertypes-werken-in-discord/` |
| nl | p51.8 | 19.5 | 19.5 | 0 | `/nl/guide/discord-naam-veilig-stylen/` |
| nl | p37.7 | 13.8 | 13.8 | 0 | `/nl/guide/discord-tekstopmaak-uitgelegd/` |
| no | p52.2 | 5.3 | 5.3 | 0 | `/no/guide/hvor-fungerer-skrifter-i-discord/` |
| no | p26.1 | 2.8 | 2.8 | 0 | `/no/guide/trygt-discord-navn/` |
| no | p0 | 0.6 | 0.6 | 0 | `/no/guide/discord-tekstformatering-forklart/` |
| pl | p74.9 | 22.6 | 22.6 | 0 | `/pl/guide/gdzie-dzialaja-czcionki-na-discordzie/` |
| pl | p50.2 | 15.8 | 15.8 | 0 | `/pl/guide/bezpieczna-nazwa-na-discordzie/` |
| pl | p40.4 | 11.6 | 11.6 | 0 | `/pl/guide/formatowanie-tekstu-na-discordzie/` |
| pt | p86.7 | 24 | 24 | 0 | `/pt/guide/onde-as-fontes-funcionam-no-discord/` |
| pt | p78.7 | 21.3 | 21.3 | 0 | `/pt/guide/nome-discord-sem-risco/` |
| pt | p75.6 | 20.2 | 20.2 | 0 | `/pt/guide/formatacao-de-texto-no-discord/` |
| ro | p76.9 | 15.2 | 15.2 | 0 | `/ro/guide/unde-functioneaza-fonturile-discord/` |
| ro | p69.2 | 12.5 | 12.5 | 0 | `/ro/guide/nume-discord-fara-riscuri/` |
| ro | p15.4 | 4.1 | 4.1 | 0 | `/ro/guide/formatare-text-discord-explicat/` |
| ru | p75 | 23.6 | 23.6 | 0 | `/ru/guide/gde-rabotayut-shrifty-discord/` |
| ru | p71.1 | 21.3 | 21.3 | 0 | `/ru/guide/bezopasnyy-nik-discord/` |
| ru | p61.7 | 16.7 | 16.7 | 0 | `/ru/guide/formatirovanie-teksta-discord/` |
| sk | p50 | 12.2 | 12.2 | 0 | `/sk/guide/kde-funguje-pismo-na-discorde/` |
| sk | p8.3 | 0.9 | 0.9 | 0 | `/sk/guide/bezpecny-nick-na-discorde/` |
| sk | p0 | 0.7 | 0.7 | 0 | `/sk/guide/formatovanie-textu-na-discorde/` |
| sr | p36.4 | 8.4 | 8.4 | 0 | `/sr/guide/gde-fontovi-rade-na-discordu/` |
| sr | p27.3 | 5.5 | 5.5 | 0 | `/sr/guide/bezbedan-nadimak-na-discordu/` |
| sr | p0 | 0.6 | 0.6 | 0 | `/sr/guide/formatiranje-teksta-na-discordu/` |
| sv | p86.4 | 16.2 | 16.2 | 0 | `/sv/guide/var-typsnitt-fungerar-i-discord/` |
| sv | p81.8 | 12.2 | 12.2 | 0 | `/sv/guide/discord-namn-utan-risk/` |
| sv | p45.5 | 6.1 | 6.1 | 0 | `/sv/guide/discord-textformatering-forklarad/` |
| th | p87.9 | 15.1 | 15.1 | 0 | `/th/guide/discord-font-thamngan-thinai/` |
| th | p52.2 | 8.6 | 8.6 | 0 | `/th/guide/discord-tang-chue-plodphai/` |
| th | p46.5 | 7.9 | 7.9 | 0 | `/th/guide/discord-rupbaep-khokhwam/` |
| tl | p66.7 | 12.4 | 12.4 | 0 | `/tl/guide/saan-gumagana-ang-font-sa-discord/` |
| tl | p50 | 6.6 | 6.6 | 0 | `/tl/guide/discord-name-na-safe/` |
| tl | p0 | 2.6 | 2.6 | 0 | `/tl/guide/discord-text-formatting-paliwanag/` |
| tr | p83.9 | 24.7 | 24.7 | 0 | `/tr/guide/discord-fontlari-nerede-calisir/` |
| tr | p79.6 | 21.7 | 21.7 | 0 | `/tr/guide/guvenli-discord-ismi/` |
| tr | p75.7 | 18.1 | 18.1 | 0 | `/tr/guide/discord-metin-bicimlendirme/` |
| vi | p70.3 | 22.7 | 22.7 | 0 | `/vi/guide/font-discord-dung-o-dau/` |
| vi | p57.8 | 19.5 | 19.5 | 0 | `/vi/guide/dat-ten-discord-an-toan/` |
| vi | p40 | 13.8 | 13.8 | 0 | `/vi/guide/dinh-dang-chu-discord/` |
| zh-tw | p75.3 | 20.6 | 20.6 | 0 | `/zh-tw/guide/discord-ziti-nali-nengyong/` |
| zh-tw | p48.4 | 15.6 | 15.6 | 0 | `/zh-tw/guide/discord-wenzi-geshi/` |
| zh-tw | p45.2 | 15 | 15 | 0 | `/zh-tw/guide/discord-anquan-nicheng/` |

## Exceptions

None recorded in `data/efr_exceptions.json`.


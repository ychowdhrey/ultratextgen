# Pinterest -> R2 Migration Validation Report

Bucket: `ultratextgen-media`  ·  Public base: `https://media.ultratextgen.com`
Local files discovered: **15376**  ·  Overall: ❌ FAILURES FOUND

### 1. Every migrated file exists in R2 — ✅ PASS
- 15376/15376 local files have a matching R2 object

### 2. File counts match, per category — ✅ PASS
- base: 2411/2411 present in R2
- variants: 12429/12429 present in R2
- boards: 372/372 present in R2
- collection: 164/164 present in R2

### 3. File sizes / MD5 checksums match (local vs. R2 ETag) — ✅ PASS
- 15376/15376 existing objects are byte-identical to their local source (MD5 match)

### 4. Public URLs work (sampled) — ❌ FAIL
- 300/300 sampled public URLs failed
- https://media.ultratextgen.com/pinterest/variants/printables-block-letters-letter-v--v4.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/pl-male-litery--v3.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/de-unsichtbares-zeichen--v5.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/ar-library-number-symbols--v5.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/ja-symbol-square-root--v6.png: HTTP 403
- https://media.ultratextgen.com/pinterest/boards/vi/facebook.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/symbol-sunglasses-symbol--v5.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/library-medical-symbols--v6.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/nl-cursieve-letters--v3.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/usecase-emoji-to-text--v9.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/fr-symbol-symbole-fleche-haut--v5.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/it-symbol-simbolo-rischio-biologico--v2.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/tr-library-yildiz-sembolleri--v5.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/fr-symbol-symbole-ohm--v2.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/library--v3.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/ko-library-hwapye-giho--v6.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/pl-library-kaomoji--v6.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/sk-tucne-pismo--v4.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/fr-symbol-symbole-pied-de-mouche--v6.png: HTTP 403
- https://media.ultratextgen.com/pinterest/variants/fr-symbol-symbole-sagittaire--v4.png: HTTP 403

### 5. Pinterest CSV inventories point at R2 URLs — ❌ FAIL
- 0/15367 inventory rows still hold a non-R2 path
- 136/672 upload-CSV Media URLs are not under https://media.ultratextgen.com
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/pseudo-fortnite.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/fortnite-caracteres-speciaux.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/pseudo-tryhard.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/pseudo-free-fire.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/symboles-free-fire.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/nom-guilde-free-fire.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/symboles-roblox.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/pseudo-roblox.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/nom-vide-invisible.png'
- upload fr_expansion_pinterest_pins_upload.csv: 'https://ultratextgen.com/assets/pinterest/fr_gaming/police-discord.png'

### 6. Existing base pins (scripts/generate-pinterest.py) still work — ✅ PASS
- 2411/2411 base pins present and byte-identical on R2

### 7. PR #648's 12,429 new variant pins still work — ✅ PASS
- 12,429/12,429 variant pins present and byte-identical on R2

### 8. Images remain 1000x1500 where required — ✅ PASS
- 15376/15376 images verified exactly 1000x1500

### 9. No duplicate R2 object keys introduced — ✅ PASS
- 15376 distinct R2 object keys, 0 collisions across 15376 local files

### 10. Re-running the migration is idempotent — ✅ PASS
- checksum proof: ✓ every local file's MD5 already matches its R2 ETag, so a fresh run has nothing left to upload
- live `--dry-run` re-invocation: exit 0
- ```
  ...14000/15376  (163s, 86.0/s)
  ...14500/15376  (168s, 86.1/s)
  ...15000/15376  (174s, 86.2/s)
  ...15376/15376  (178s, 86.2/s)

done in 178s
  skipped-identical    15376
migration report -> docs/pinterest-r2-migration-report.csv
```

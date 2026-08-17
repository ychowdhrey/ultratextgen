# Pinterest -> R2 Migration Validation Report

Bucket: `ultratextgen-media`  ·  Public base: `https://media.ultratextgen.com`
Local files discovered: **15376**  ·  Overall: ✅ ALL CHECKS PASSED

### 1. Every migrated file exists in R2 — ✅ PASS
- 15376/15376 local files have a matching R2 object

### 2. File counts match, per category — ✅ PASS
- base: 2411/2411 present in R2
- variants: 12429/12429 present in R2
- boards: 372/372 present in R2
- collection: 164/164 present in R2

### 3. File sizes / MD5 checksums match (local vs. R2 ETag) — ✅ PASS
- 15376/15376 existing objects are byte-identical to their local source (MD5 match)

### 4. Public URLs work (sampled) — ✅ PASS
- 300/300 sampled public URLs returned HTTP 200 with the correct Content-Length

### 5. Pinterest CSV inventories point at R2 URLs — ✅ PASS
- 15367/15367 inventory rows hold an R2 object key
- 15367/15367 upload-CSV Media URLs point at https://media.ultratextgen.com

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
  ...14000/15376  (165s, 84.7/s)
  ...14500/15376  (171s, 84.9/s)
  ...15000/15376  (176s, 85.0/s)
  ...15376/15376  (181s, 85.1/s)

done in 181s
  skipped-identical    15376
migration report -> docs/pinterest-r2-migration-report.csv
```

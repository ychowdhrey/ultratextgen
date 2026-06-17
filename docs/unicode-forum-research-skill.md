# Unicode Forum Research Skill

A repeatable method for discovering **Unicode symbol library page
opportunities** from real user conversations on forums, then turning those
conversations into structured rows in `data/library_opportunities.csv`.

The goal is not "find more symbols." Unicode has plenty. The goal is to find
**demand expressed in user language**: the exact phrasing people use when they
go looking for symbols to copy, decorate a profile, or dress up a username.
That language tells us what to build, how to title it, and whether it deserves
a standalone page at all.

---

## 1. Why forums

Keyword tools tell you *volume*. Forums tell you *intent and language*. A
thread where someone says

> "does anyone have those little star symbols i can put in my insta bio? not
> the emoji ones, the tiny outline ones"

is worth more than a raw search-volume number, because it reveals:

- the **symbol category** (small outline stars),
- the **negative constraint** (not emoji),
- the **use case** (Instagram bio),
- and the **exact words** to mirror in the `<title>`, `<h1>`, and intro copy.

Each qualifying thread becomes **forum evidence** attached to an opportunity
row.

---

## 2. Platforms and how to search them

### Reddit

Reddit is the highest-signal source. Use Google site search rather than
Reddit's own search.

Core Google operators (these are also seeded in
`data/forum_research_queries.csv`):

```
site:reddit.com unicode symbols
site:reddit.com copy paste symbols
site:reddit.com aesthetic symbols
site:reddit.com username symbols
site:reddit.com discord symbols
site:reddit.com instagram bio symbols
site:reddit.com heart symbols copy paste
site:reddit.com arrow symbols copy paste
site:reddit.com text dividers copy paste
```

Patterns that broaden or narrow the sweep:

```
site:reddit.com "where do you find" symbols
site:reddit.com "how do i type" <symbol-name>
site:reddit.com <platform> aesthetic username           (discord, roblox, tiktok…)
site:reddit.com/r/<subreddit> symbols                   (target a community)
site:reddit.com <category> "copy paste" -emoji          (exclude emoji intent)
```

High-yield subreddits to target with `/r/<name>`:
`r/Instagram`, `r/discordapp`, `r/roblox`, `r/Tumblr`, `r/coquette`,
`r/femcelgrindset`, `r/copypasta`, `r/Unicode`, `r/typography`,
`r/socialmedia`.

### Quora

Quora surfaces "how do I…" and "what is…" phrasing, useful for deciding
whether a topic is a **guide** or a **library**.

```
site:quora.com how to type <symbol> on phone
site:quora.com what are aesthetic symbols
site:quora.com how do people get fancy text in their bio
site:quora.com <symbol-name> meaning copy paste
```

### StackExchange / niche forums

Use for technical or input-method questions. These usually map to a **guide**,
not a library page, but they validate that a symbol family has real demand.

```
site:superuser.com type unicode character
site:apple.stackexchange.com special characters keyboard
site:android.stackexchange.com insert symbol
site:graphicdesign.stackexchange.com decorative unicode
site:webapps.stackexchange.com special characters username
```

Niche/community forums worth a manual look when a category points at them:
game-specific forums (Roblox DevForum), fandom wikis' talk pages, and
platform help communities (Discord support, Instagram community).

---

## 3. Extracting user language

For every qualifying thread, capture the **raw phrasing**, not a paraphrase.
Record into the opportunity row:

- `forum_queries` — the search query/queries that surfaced the thread (use
  ` | ` to separate multiple).
- `forum_source_urls` — the thread URLs (use ` | ` to separate multiple).
- `notes` — direct quotes of how users describe what they want, e.g.
  `"tiny outline stars not emoji"`, `"line thingy to separate my bio"`.

What to pull out of each thread:

1. **Head noun** — what they call the symbol ("stars", "dividers", "sparkles",
   "arrows"). This seeds `primary_keyword`.
2. **Modifier** — qualifier that narrows it ("tiny", "outline", "aesthetic",
   "copy paste", platform name). This seeds `modifier`.
3. **Constraints** — explicit negatives ("not emoji", "works on iphone"). These
   shape section structure and copy.
4. **Use case** — where it'll be pasted (bio, username, comment, message). This
   seeds `intent`.

Mirror the head noun + modifier in the page `title`, `hero_h1`, and intro so
the page reads in the user's own words.

---

## 4. Classifying intent

Tag each opportunity's `intent` field with one of these intent classes:

| Intent class        | User is trying to…                                  | Typical signal phrases                          |
|---------------------|-----------------------------------------------------|-------------------------------------------------|
| `find-and-copy`     | grab a specific symbol / set to paste somewhere     | "copy paste", "where do i get", "need the …"    |
| `decorate-profile`  | style a bio / profile aesthetically                 | "insta bio", "aesthetic", "cute symbols for"    |
| `decorate-username` | style a gamer/social username                       | "username symbols", "fancy name", "discord name"|
| `platform-specific` | do the above on a named platform                    | "discord", "roblox", "tiktok", "whatsapp"       |
| `how-to`            | learn to *type/insert* a character                  | "how to type", "keyboard shortcut", "alt code"  |
| `meaning`           | understand what a symbol *means*                    | "what does … mean", "meaning of"                |

Intent drives two downstream decisions: the **copy pattern** (`find-and-copy`
and decoration intents → `.symbol-tile` single copy; set-oriented requests →
`buildGrids` collection) and the **page-vs-section** decision below.

---

## 5. Does this page deserve to exist?

Before deciding *how* to build a topic, decide *whether* it should be a page at
all. A `/library/<slug>/` page earns its place only when it clears all four
gates:

1. **Distinct head noun** — users search for it on its own ("arrow symbols"),
   not merely as a modifier of an existing page ("blue arrow symbols").
2. **Real demand** — `forum_evidence` is `medium`/`strong`, **or**
   `search_volume` clears the batch threshold. A topic with `none` evidence and
   thin volume does not deserve a page yet.
3. **Uncovered symbols** — it maps to Unicode block(s) not already fully
   represented by an existing page (run
   `scripts/audit_library_opportunities.py`; watch the `blocks_covered` flag).
4. **Enough depth** — it can support **≥ 3 H2 sections** and the validator's
   minimum symbol count. If you can only find five symbols, it's a section, not
   a page.

A topic that fails gate 1 or 4 is structurally too thin. A topic that fails
gate 2 is unproven. A topic that fails gate 3 is a duplicate.

## 5a. Create vs. improve existing vs. skip

Every opportunity resolves to exactly one of three actions. Record it in
`dedupe_status` and explain in `notes`.

**CREATE** a new standalone page when **all four gates above pass** and no
existing page targets the same head noun / blocks.
→ `dedupe_status = unique`, `copy_patterns` = `single` or `collection`.

**IMPROVE EXISTING** — fold the demand into a page that already exists — when:

- An existing page targets the **same head noun** (audit flags `dup_slug` or
  `flag_strong_duplicate_risk`), **or**
- The topic is a **modifier/variant** of an existing topic ("broken heart
  symbols" → a section on `heart-symbols`), **or**
- Its Unicode block is **already covered** (`blocks_covered`), but the existing
  page is missing the section/symbols users are asking for.

  Improving wins over creating whenever the demand can be satisfied by adding a
  section, a symbol group, or refreshed copy to a page that already ranks —
  this consolidates authority instead of splitting it.
  → `dedupe_status = improve-existing:<slug>` or `fold-into:<slug>`, and
  describe the target section in `notes`.

**SKIP** when:

- It fully duplicates an existing page with nothing to add (audit verdict
  `reject-duplicate`), **or**
- `forum_evidence` is `none`/`weak` **and** `demand_confidence` is `low` —
  unproven, revisit if demand grows, **or**
- Intent is `how-to` or `meaning` with little copy demand — that belongs in a
  `/guide/` article, not `/library/`.
  → `dedupe_status = skip` (or `review-overlap` if it needs a second look) and
  `approval_status = rejected` with the reason in `notes`.

When in doubt between create and improve, **prefer improve** — a thin new page
cannibalizes an existing one.

---

## 6. Scoring forum evidence

Two independent scores are recorded on every opportunity row. They are
**not** the same thing: evidence measures *how much forum proof we have*;
confidence measures *our overall belief in the demand* after combining forum
proof with search volume and category knowledge.

### `forum_evidence` (and its numeric score)

`forum_evidence` is a label; the auditor converts it to a numeric
`forum_evidence_score` that feeds `priority_score` (see the workflow doc).

| Label    | Score | Meaning                                                                 |
|----------|-------|-------------------------------------------------------------------------|
| `none`   | `0`   | No forum thread found; opportunity came from keyword data alone.        |
| `weak`   | `10`  | 1 tangential mention, or old/low-engagement thread.                     |
| `medium` | `15`  | 2–3 relevant threads, or one solid thread with real engagement/upvotes. |
| `strong` | `25`  | Multiple recent, high-engagement threads using consistent language.     |

How to grade evidence consistently:

- **Recency** — threads from the last ~2 years count more than stale ones.
- **Engagement** — upvotes, replies, "thank you" / "exactly what I needed".
- **Language consistency** — multiple users using the *same* phrasing is a
  strong signal the head noun is real.
- **Specificity** — a request for the exact symbol family (not a vague "cool
  symbols" thread) is worth more.

Capture the threads in `forum_source_urls` and the queries in `forum_queries`
so the score is auditable.

### `demand_confidence`

| Value    | When to assign                                                             |
|----------|----------------------------------------------------------------------------|
| `low`    | Weak/none evidence and/or low search volume; speculative.                  |
| `medium` | One strong signal (either solid forum evidence **or** decent volume).      |
| `high`   | Forum evidence is `medium`/`strong` **and** search volume is meaningful.   |

Rule of thumb: a page should not be **approved** for a batch unless it reaches
at least `forum_evidence = medium` **or** `demand_confidence = high`. The
auditor flags `missing_forum_evidence`, `missing_search_volume`, and
`low_demand_confidence` so these never slip through. Record the rationale in
`notes`.

---

## 7. From thread to CSV row

For each kept opportunity, fill a row in `data/library_opportunities.csv`:

| Field               | Source                                                        |
|---------------------|---------------------------------------------------------------|
| `id`                | `OPP-NNNN`, unique                                            |
| `page_type`         | content lane: `library` (default) / `category` / `answers` / `usecase` / `guide` |
| `primary_keyword`   | head noun (Section 3)                                         |
| `modifier`          | qualifier (Section 3)                                         |
| `intent`            | intent class (Section 4)                                      |
| `forum_queries`     | the queries that surfaced evidence                           |
| `forum_evidence`    | none / weak / medium / strong (Section 6)                    |
| `forum_source_urls` | thread URLs, ` | ` separated                                  |
| `search_volume`     | from keyword tooling (see workflow doc)                       |
| `demand_confidence` | low / medium / high (Section 6)                              |
| `symbol_category`   | short category tag (stars, arrows, hearts…)                  |
| `unicode_blocks`    | block name + range(s), e.g. `Arrows (U+2190..U+21FF)`        |
| `copy_patterns`     | `single` or `collection`                                     |
| `slug`              | proposed `/<page_type>/<slug>/` (e.g. `/library/<slug>/`)    |
| `title`             | proposed `<title>` in user language                          |
| `priority_score`    | your ranking (volume × confidence × strategic fit)          |
| `dedupe_status`     | `unique` / `review-overlap` / `fold-into:<slug>`            |
| `approval_status`   | `pending` / `approved` / `rejected`                         |
| `batch`             | batch label, e.g. `batch-01`                                |
| `notes`             | quotes, rationale, constraints                               |

Then run the auditor before approving anything:

```bash
python3 scripts/audit_library_opportunities.py
```

Review `data/library_opportunities_audit.csv` and resolve every
`reject-duplicate` / `review-overlap` verdict before changing
`approval_status` to `approved`.

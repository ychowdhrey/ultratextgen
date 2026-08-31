# Example pull-request output

What `npm run check:editorial-footprint` prints on a realistic bad edit. This is
**captured from a real run**, not written by hand: two pages were deliberately
damaged on a branch, the gate was run against `origin/main`, and the output below
is verbatim. The probe was reverted; nothing here is live.

The edit under test does four things a well-meaning cleanup pass might do:

1. adds an audience-enumerating opener ("Whether you are a gamer or a designer"),
2. adds assistant scaffolding ("Here is a comprehensive overview"),
3. renames an H1 to something more descriptive,
4. replaces "copy and paste" with "use" — the exact synonym swap Google's spam
   policy names as an abuse pattern.

Two of those block. Two only warn. Nothing on the 42 pre-existing findings on the
same two pages counts against the branch.

```
Editorial Footprint Risk check
  base:               origin/main (merge-base bc66d2b5)
  changed HTML files: 2
  pages checked:      2
  findings introduced: 5
  pre-existing (not this branch's): 42
  SEO preservation findings: 3

⚠ warning  formulaic-phrase - 2 introduced
    · guide/discord-text-formatting-explained/index.html (2) [prose]
        ...you are a gamer or a designer, this guide is great for you. Here is a comprehensive overview — you ...

⚠ warning  em-dash - 1 introduced
    · guide/discord-text-formatting-explained/index.html (1) [prose]
        ...at for you. Here is a comprehensive overview — you don't have a "fonts" problem — you have ...

✗ BLOCKING  model-leakage - 1 introduced
    · guide/discord-text-formatting-explained/index.html (1) [prose]
        ... or a designer, this guide is great for you. Here is a comprehensive overview — you don't have a "fonts" problem ...

⚠ warning  density-limited - 1 introduced
    · guide/discord-text-formatting-explained/index.html (1) [prose]
        ...gner, this guide is great for you. Here is a comprehensive overview — you don't have a "fonts" problem ...

✗ BLOCKING  seo-preservation - 3 error(s), 0 warning(s)
    ✗ symbol/lambda-symbol/index.html: title-changed - title: "Lambda Symbol: Copy & Paste λ Λ — The Gay-Liberation Sign & Church's Lambda Calculus" -> "Lambda Symbol: Use λ Λ — The Gay-Liberation Sign & Church's Lambda Calculus"
    ✗ symbol/lambda-symbol/index.html: h1-changed - h1: "Lambda Symbol" -> "The Lambda Character Explained"
    ✗ symbol/lambda-symbol/index.html: protected-term-lost - search-protected language removed: copy & paste, copy and paste
    Posture with no performance overlay: no reliable performance data - act conservatively; this is not a claim the page is worthless

Reported, not failed - 42 finding(s) on pages this branch touched already
existed at the merge base, and this branch did not add to them:
    · guide/discord-text-formatting-explained/index.html (26)
    · symbol/lambda-symbol/index.html (16)
  Whole-site picture: npm run audit:editorial-footprint

How to act on this:
```

## Reading it

* **`✗ BLOCKING`** — deterministic and reviewed. `model-leakage` and
  `seo-preservation` errors are the only two rules eligible to fail a PR.
* **`⚠ warning`** — editorial judgment. Never fails a build. The `em-dash`
  warning is one of these *for now*; see the rollout stages.
* **`Reported, not failed`** — 42 findings already existed at the merge base on
  the two pages this branch touched. A gate that billed the branch for those is
  a gate people learn to ignore.
* **`upstream: <file>`** — when a finding's text is traceable to a spec or a
  generator, the gate names that file instead of the HTML. Editing the generated
  HTML is undone by the next generator run.

Note that "Here is a comprehensive overview" trips two rules at once:
`model-leakage` for the scaffolding, and `density-limited` for *comprehensive*,
which is on the measured excess-vocabulary list. That is the intended behaviour —
one phrase can carry two different defects.

## In GitHub

With `--annotations` the same findings are emitted as workflow commands, so they
appear on the diff rather than only in the job log:

```
::error file=guide/discord-text-formatting-explained/index.html,title=EFR model-leakage::1 introduced. ... Here is a comprehensive overview ...
::error file=symbol/lambda-symbol/index.html,title=SEO preservation (protected-term-lost)::search-protected language removed: copy & paste, copy and paste
```

Findings are grouped per rule and capped at eight pages each, with a
`… and N more page(s)` line. A PR that touches 400 locale pages produces a
readable summary, not 400 annotations.

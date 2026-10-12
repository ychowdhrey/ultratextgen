# Reading experiment protocol (designed, not executed)

Part of the AI Writing Footprint Study (https://ultratextgen.com/research/ai-writing-footprint-study/). Written after the observational study and before any reading data were collected, so the observational findings cannot be quietly reshaped into the experiment's hypotheses. "Question 3" and "question 4" below mean the study's third and fourth questions: which cues produce the strongest perception of AI authorship, and whether combinations matter more than single cues.

**No participant data exists for this protocol. Nothing in the study reports a result from it.** It is written down before any reading data exist so that the observational findings cannot be quietly reshaped into the experiment's hypotheses. It answers question 3 (which cues produce the strongest perception of AI authorship) and question 4 (do combinations matter more), which no observational design can answer.

An LLM rating text as "AI-sounding" is not this experiment. Models are not the readers this question is about, and a model asked "does this sound like AI" has its own training prior about the answer.

## Hypotheses (fixed now)

* H1. A passage containing em dashes is rated more likely AI-involved than the same passage with the dashes replaced by commas or full stops. The observational study cannot say whether this effect exists: it found an association in short Hacker News comments from 2025 and none in articles.
* H2. The effect of removing a contrast frame ("it's not X, it's Y") is similar in size to H1 (exploratory; no directional commitment).
* H3. Removing several cues at once reduces the rating by less than the sum of the single removals, or by more (interaction; two-sided).
* H4. Any effect shrinks when readers are told, before reading, that the set contains both human and AI-written passages and that a random half carry no cue (priming condition).
* H5 (negative control). Replacing a comma with a semicolon does not change the rating (the observational data found no association for semicolons).

## Stimuli

* 24 base passages, 90 to 130 words, six genres of four each: personal essay, workplace email, product description, news-style paragraph, forum comment, academic abstract. Sources: human texts published before 2021 with a licence permitting reuse and modification, or passages written for this study by a person who is not shown the hypotheses. No passage is model-generated (provenance of every passage is "human, pre-2021 or commissioned", recorded).
* Each passage has a **natural cue** version chosen so that the cue is already idiomatic there, and edited versions that change one thing:
  1. A: original with the cue (for example two em dashes).
  2. B: same text, dashes replaced by commas or full stops (punctuation only).
  3. C: meaning-preserving rewrite that removes the construction (structure change).
  4. D (H5 only): comma replaced by semicolon.
  5. E (H3 only): two cues removed together.
* Each reader sees each base passage once, in one randomly assigned version (Latin-square design), 12 passages per reader, order randomised.
* Edits are made by a person, checked for meaning equivalence by a second person, and the edited text is not run through any model.

## Participants and consent

* Adults who read English, recruited from a panel with documented consent; target 180 completed readers (see power).
* Consent screen states: the task is to rate short passages; passages may or may not involve AI; no personal data beyond a reader id, age band, English-first-language yes/no, and self-rated familiarity with AI writing tools; free withdrawal; data stored without names. Ethical review is required before running (not obtained; this is why the experiment is unexecuted).
* Non-native English readers are recorded as a subgroup and analysed separately, not pooled out.

## Outcomes (reported separately, never summed)

For each passage a reader gives, on 7-point scales: (1) how likely AI was involved in writing it; (2) confidence in that judgement; (3) how natural it sounds; (4) writing quality; (5) clarity; and one yes/no: (6) "Would you comment publicly that this looks AI-written?" Also an optional free-text reason (coded afterwards for the cue named, the same scheme as the observational study).

## Pre-specified analysis

* Ordinal mixed model (cumulative link) of rating on version, with random intercepts for reader and passage and a random slope of version by passage; the logistic mixed model for the public-accusation yes/no.
* Primary contrasts: A versus B (H1), A versus C (H2), A versus E and the single removals (H3), D versus A (H5). Holm correction over the five primary contrasts. Effects reported as differences in latent score and as the shift in the proportion rating 5 to 7, each with 95% intervals.
* Priming (H4): a between-reader factor (half of readers see the priming screen); interaction with version.
* Minimal effect of interest: 0.3 scale points. An effect whose interval lies inside plus or minus 0.2 is reported as "no effect of practical size".
* Exclusions fixed in advance: completion time under one third of the median, failed attention checks (two items that say "choose 3"), identical answers across all items.
* Free-text reasons coded by two coders blind to version; disagreements discussed, with kappa reported.

## Power

With a within-reader difference SD of about 1.2 scale points (an assumption to be replaced by a pilot), a mixed model on 12 passages per reader needs roughly 125 readers for 80% power at 0.3 points before accounting for passage variability, and 180 with a design effect of 1.4. The pilot (30 readers) decides whether 180 is enough.

## Stop rules

* If the pilot shows a floor or ceiling on rating 1 (more than 60% of ratings at one end), rewrite the stimuli, do not proceed.
* If the version manipulation is detectable by readers as an edit (a manipulation check at the end asks whether any passage looked altered), the affected passages are dropped and the count reported.
* If H1 shows no effect inside the minimal-effect bound, the em dash result in the observational study is reported as an association with the writers and threads that attract accusation, not with the mark itself.

## What this protocol will not do

It will not estimate how often readers wrongly accuse a real writer, will not generate a detector, and will not be used to claim a text is or is not AI-written.

## Hand-off

The experiment needs (1) an ethical review route, (2) a panel with consent handling, (3) a licensed or commissioned stimulus set including text by non-native writers. None of these exists yet, so the experiment has no results.

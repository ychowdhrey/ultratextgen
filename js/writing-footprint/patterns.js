/* ==========================================================
   js/writing-footprint/patterns.js
   The pattern library behind /ai-writing-footprint-checker/.

   DATA ONLY. Detection logic lives in engine.js, so a rule can be
   added, re-tiered or removed here without touching the arithmetic.

   Every pattern carries the twelve things the product promises:
   id, name, category, method, explanation, references, ruleConfidence,
   evidence (what kind of association is actually on record), falsePositives,
   exemptions, suggestion, prominence and a replacement safety class.

   WHAT THE EVIDENCE TIERS MEAN (they are three different claims):
     population  A measured frequency shift in published text after
                 2022 (excess-vocabulary studies). Says nothing about
                 one document.
     reader      Readers and editors name it as a tell. A claim about
                 perception, not about authorship.
     house       A style judgement (specificity, rhythm). Plain
                 editorial advice with no authorship claim at all.
   No tier is "predicts authorship". Nothing here is validated as a
   predictor of who or what wrote a text, and the UI never says so.

   English only. Each locale will need its own file, written from that
   language's own evidence. Never translate this list.
   ========================================================== */
(function () {
  "use strict";

  const EM = "—";

  const CATEGORIES = [
    { id: "punctuation", name: "Punctuation", blurb: "Dashes, semicolons, colons, ellipses and parentheses." },
    { id: "phrases", name: "Stock phrases", blurb: "Lead-ins and closers that carry no information." },
    { id: "rhythm", name: "Sentence rhythm", blurb: "Sentence length variation and repeated openings." },
    { id: "structure", name: "Paragraph structure", blurb: "Paragraph length, summary endings and list formatting." },
    { id: "rhetoric", name: "Rhetorical patterns", blurb: "Set constructions such as 'not just X but Y'." },
    { id: "transitions", name: "Transitions", blurb: "How often sentences open with a linking word." },
    { id: "vocabulary", name: "Vocabulary", blurb: "Density of stock words and repeated phrases." },
    { id: "specificity", name: "Specificity", blurb: "Concrete details a reader can check." }
  ];

  /* Short citations. The longer evidence record, including what each
     source does NOT show, lives in the page's method section. */
  const REFERENCES = {
    kobak2025: "Kobak et al., 'Delving into LLM-assisted writing in biomedical publications through excess vocabulary', Science Advances (2025). A corpus-level study that states it cannot identify individual documents.",
    liang2023: "Liang et al., 'GPT detectors are biased against non-native English writers', Patterns (2023). Detectors misclassified 61.3% of non-native TOEFL essays as AI-written.",
    acl2025: "'Testing English News Articles for Lexical Homogenization Due to Widespread Use of LLMs', ACL 2025 Student Research Workshop. Per-text lexical diversity showed no clear shift.",
    housestyle: "Editorial judgement. No study is claimed."
  };

  /* Replacement helpers. A replacement only ever rewrites the matched
     span, so numbers, names, URLs and quotes outside it cannot change. */
  const REMOVE = { label: "Remove it", text: "", capitalizeNext: true };

  /* ---- Phrase patterns ------------------------------------------------
     Exact scaffold phrases. A single occurrence is an observation, not a
     verdict: the engine reports it as "low" and escalates on repetition. */
  const PHRASES = [
    {
      id: "PHR-NOTE-THAT", name: "'It's important to note' lead-in", category: "phrases", method: "phrase",
      regex: /\b(?:it(?:'s|’s| is) (?:important|worth|crucial|essential) (?:to )?(?:note|noting|mention(?:ing)?|remember(?:ing)?|highlight(?:ing)?|emphasi[sz]e)(?: that)?,?)\s+/gi,
      explanation: "Announces that a fact matters instead of stating it.",
      why: "Readers skim past the announcement, and a page full of them reads as padding.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Legitimate in instructions where a warning really is being flagged, for example safety notes.",
      exemptions: ["quoted"],
      suggestion: "State the fact directly. The sentence usually works without the lead-in.",
      prominence: "medium", safety: "safe_to_propose", options: [REMOVE]
    },
    {
      id: "PHR-TODAYS-LANDSCAPE", name: "'In today's rapidly evolving landscape' opener", category: "phrases", method: "phrase",
      regex: /\bin (?:today(?:'s|’s)|an? (?:ever[- ]?(?:changing|evolving)|rapidly (?:changing|evolving))|the (?:ever[- ]?(?:changing|evolving)|rapidly (?:changing|evolving))|this (?:ever[- ]?(?:changing|evolving)|fast[- ]paced)) (?:[a-z-]+ ){0,3}(?:world|landscape|era|age|environment|market|space)\b[^.!?\n]{0,40}/gi,
      explanation: "A stock scene-setting opener that fits any topic.",
      why: "An opener that could start any article tells the reader nothing about this one.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "A genuine change in the field, named and dated, is not this pattern.",
      exemptions: ["quoted"],
      suggestion: "Open with the specific thing that changed, with a date or a number if you have one.",
      prominence: "high", safety: "explanation_only", options: []
    },
    {
      id: "PHR-COMPLEXITIES", name: "'Navigate the complexities'", category: "phrases", method: "phrase",
      regex: /\bnavigat(?:e|es|ed|ing) (?:the |these |this |an? )?(?:[a-z-]+ )?(?:complexit(?:y|ies)|intricacies|landscape|challenges of)\b/gi,
      explanation: "A metaphor standing in for the actual difficulty.",
      why: "It names no specific difficulty, so the reader learns nothing from it.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Fine in a literal sense (navigating a map, a legal process) when the thing navigated is named.",
      exemptions: ["quoted"],
      suggestion: "Name the difficulty: which step, rule or decision is hard, and for whom.",
      prominence: "medium", safety: "explanation_only", options: []
    },
    {
      id: "PHR-UNLOCK", name: "'Unlock the potential'", category: "phrases", method: "phrase",
      regex: /\bunlock(?:s|ed|ing)? (?:the |your |their |its |our )?(?:full |true |hidden |untapped )?(?:potential|power|possibilities|value)\b/gi,
      explanation: "A promotional abstraction with no observable outcome.",
      why: "It promises a benefit without saying what changes.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Marketing copy uses it on purpose; the pattern is about vagueness, not about marketing.",
      exemptions: ["quoted"],
      suggestion: "Say what the reader can do afterwards that they could not do before.",
      prominence: "medium", safety: "explanation_only", options: []
    },
    {
      id: "PHR-TESTAMENT", name: "'A testament to'", category: "phrases", method: "phrase",
      regex: /\b(?:is|are|was|were|stands? as|serves? as) (?:a|an) (?:true |real |clear |powerful )?testament to\b/gi,
      explanation: "Praise phrased as a monument instead of a fact.",
      why: "It asserts importance rather than showing the evidence for it.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Occurs in genuine tributes and in older prose.",
      exemptions: ["quoted"],
      suggestion: "Give the evidence the phrase is gesturing at: the result, the number, the date.",
      prominence: "medium", safety: "explanation_only", options: []
    },
    {
      id: "PHR-DELVE", name: "'Delve into'", category: "phrases", method: "phrase",
      regex: /\bdelv(?:e|es|ed|ing)(?: deeper)? into\b/gi,
      noOptionsIf: /deeper/i,
      explanation: "One of the verbs whose frequency rose sharply in published text after 2022.",
      why: "The word is rare in everyday writing, so repeated use stands out.",
      references: ["kobak2025"], ruleConfidence: "high", evidence: "population",
      falsePositives: "A population-level shift, not proof about this text. Plenty of people have always written 'delve'.",
      exemptions: ["quoted"],
      suggestion: "Plain verbs read as natural: look at, examine, explore, dig into.",
      prominence: "medium", safety: "requires_context",
      options: [{ label: "look at", text: "look at", forms: { delves: "looks at", delved: "looked at", delving: "looking at" } },
                { label: "explore", text: "explore", forms: { delves: "explores", delved: "explored", delving: "exploring" } }],
      verbForms: true
    },
    {
      id: "PHR-CONCLUSION", name: "'In conclusion' / 'In summary' closer", category: "phrases", method: "phrase",
      regex: /(?:^|[.!?]["')\]]*\s+|\n\s*)((?:in (?:conclusion|summary|closing)|to (?:sum up|conclude)|all in all|in a nutshell),\s+)/gi,
      group: 1,
      explanation: "A closing signpost that restates instead of adding.",
      why: "Short pieces do not need to announce their own ending.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Expected and useful in long reports and academic papers.",
      exemptions: ["quoted", "formal"],
      suggestion: "If the last paragraph only repeats, cut it. If it adds a decision or next step, lead with that.",
      prominence: "low", safety: "safe_to_propose", options: [REMOVE]
    },
    {
      id: "PHR-TAPESTRY", name: "'Rich tapestry' and kin", category: "phrases", method: "phrase",
      regex: /\b(?:rich|vibrant|intricate|complex) (?:tapestry|mosaic)\b|\btapestry of\b/gi,
      explanation: "A decorative metaphor that recurs in generic descriptive writing.",
      why: "It is applied to cultures, cities and industries alike, so it signals no particular knowledge of any.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Literal use about textiles and some art writing.",
      exemptions: ["quoted"],
      suggestion: "Replace the metaphor with two or three of the actual elements it stands for.",
      prominence: "medium", safety: "explanation_only", options: []
    },
    {
      id: "PHR-PLAYS-ROLE", name: "'Plays a crucial role'", category: "phrases", method: "phrase",
      regex: /\bplay(?:s|ed|ing)? an? (?:crucial|pivotal|vital|key|significant|important|integral) role\b/gi,
      explanation: "States that something matters without saying how.",
      why: "The sentence has the shape of a claim but no content to check.",
      references: ["housestyle"], ruleConfidence: "high", evidence: "reader",
      falsePositives: "Common and unremarkable in formal and scientific writing.",
      exemptions: ["quoted", "formal"],
      suggestion: "Say what it does: what depends on it, what breaks without it.",
      prominence: "low", safety: "explanation_only", options: []
    }
  ];

  /* ---- Rhetorical constructions -------------------------------------- */
  const RHETORIC = [
    {
      id: "RHE-NOT-JUST", name: "'Not just X but Y'", category: "rhetoric", method: "regex",
      regex: /\bnot (?:just|only|merely|simply) [^.!?\n]{2,100}?,? but (?:also )?/gi,
      explanation: "Negative parallelism: denies a reading nobody proposed, then offers the 'real' one.",
      why: "One use is ordinary. Repeated use makes every point sound like a rebuttal.",
      references: ["housestyle"], ruleConfidence: "medium", evidence: "population",
      falsePositives: "Natural in speeches and persuasive writing. Frequency matters more than any single use.",
      exemptions: ["quoted"],
      suggestion: "State the positive claim directly: 'It does Y.'",
      prominence: "medium", safety: "explanation_only", options: []
    },
    {
      id: "RHE-ITS-NOT-ABOUT", name: "'It's not about X, it's about Y'", category: "rhetoric", method: "regex",
      regex: /\b(?:it|this|that)(?:'s|’s| is) not (?:just |only |merely |simply )?(?:about |a |an )?[^.!?\n]{2,80}?(?:[,;]|\s—)\s*(?:it|this|that)(?:'s|’s| is) |\b(?:isn't|isn’t|is not|aren't|aren’t) (?:just|only|merely|simply) [^.!?\n]{2,80}?(?:[,;]|\s—) ?(?:it(?:'s|’s)|it is|they(?:'re|’re)|they are)\b/gi,
      explanation: "A contrast frame: 'not this, but that'.",
      why: "Readers who have seen it many times start to hear it as a template.",
      references: ["housestyle"], ruleConfidence: "medium", evidence: "reader",
      falsePositives: "Common in genuine arguments, where the contrast is the point.",
      exemptions: ["quoted"],
      suggestion: "Cut the denial and keep the positive half.",
      prominence: "medium", safety: "explanation_only", options: []
    },
    {
      id: "RHE-MORE-THAN-JUST", name: "'More than just'", category: "rhetoric", method: "regex",
      regex: /\bmore than (?:just|merely|simply) (?:a |an |the )?/gi,
      explanation: "Elevates a subject by comparing it to a smaller version of itself.",
      why: "It claims significance by contrast rather than by evidence.",
      references: ["housestyle"], ruleConfidence: "medium", evidence: "reader",
      falsePositives: "Ordinary in conversational writing.",
      exemptions: ["quoted"],
      suggestion: "Say what else it is.",
      prominence: "low", safety: "explanation_only", options: []
    },
    {
      id: "RHE-WHETHER-YOURE", name: "'Whether you're X or Y'", category: "rhetoric", method: "regex",
      regex: /\bwhether you(?:'re|’re| are) (?:an? |the )?[^.!?\n,]{2,60}? or (?:an? |the )?[^.!?\n,]{2,60}?,/gi,
      explanation: "A stock inclusive opener that addresses every possible reader at once.",
      why: "Speaking to everyone can read as speaking to no one in particular.",
      references: ["housestyle"], ruleConfidence: "medium", evidence: "reader",
      falsePositives: "Useful in product copy that really does serve both groups.",
      exemptions: ["quoted"],
      suggestion: "Pick the reader you have in mind and write to them.",
      prominence: "low", safety: "explanation_only", options: []
    },
    {
      id: "RHE-KEY-LIES", name: "'The key lies in'", category: "rhetoric", method: "regex",
      regex: /\bthe (?:key|secret|answer) (?:lies in|to [^.!?\n]{2,40}? (?:lies in|is))\b/gi,
      explanation: "A drum-roll that delays the point it announces.",
      why: "The reader is promised an insight and handed the point a sentence later.",
      references: ["housestyle"], ruleConfidence: "medium", evidence: "reader",
      falsePositives: "Fine occasionally.",
      exemptions: ["quoted"],
      suggestion: "Lead with the point itself.",
      prominence: "low", safety: "explanation_only", options: []
    },
    {
      id: "RHE-BY-DOING", name: "'By doing X, you can Y'", category: "rhetoric", method: "regex",
      regex: /\bby [a-z]+ing\b[^,.!?\n]{2,60}, you (?:can|will|may|'ll|’ll|could) /gi,
      explanation: "A how-to formula that frames every step as a means to a benefit.",
      why: "In long runs it makes each paragraph read as the same instruction.",
      references: ["housestyle"], ruleConfidence: "low", evidence: "house",
      falsePositives: "Normal in instructions and tutorials. Weak on its own.",
      exemptions: ["quoted", "technical"],
      suggestion: "Use it where the benefit is the point; elsewhere, just give the step.",
      prominence: "low", safety: "explanation_only", options: []
    }
  ];

  /* ---- Transitions: sentence-initial linking words ---------------------- */
  const TRANSITIONS = [
    "furthermore", "moreover", "additionally", "consequently", "ultimately",
    "in addition", "overall", "notably", "importantly", "subsequently",
    "that being said", "with that said", "as a result", "in essence"
  ];
  /* Removal is proposed only for these: they add no logic the sentence
     does not already carry. 'Therefore', 'however' and 'but' do real work,
     so they are never counted as filler. */
  const TRANSITION_ALSO = ["furthermore", "moreover", "additionally", "in addition"];

  /* ---- Vocabulary lists --------------------------------------------------
     Density-limited. A single hit is never reported as a finding. Words
     marked technical are exempt when the writer selects "technical". */
  const STOCK_WORDS = [
    { re: "delv(?:e|es|ed|ing)", w: "delve" },
    { re: "underscor(?:e|es|ed|ing)", w: "underscore" },
    { re: "showcas(?:e|es|ed|ing)", w: "showcase" },
    { re: "elevat(?:e|es|ed|ing)", w: "elevate" },
    { re: "pivotal", w: "pivotal" },
    { re: "intricate(?:ly)?", w: "intricate" },
    { re: "meticulous(?:ly)?", w: "meticulous" },
    { re: "tapestry", w: "tapestry" },
    { re: "multifaceted", w: "multifaceted" },
    { re: "holistic(?:ally)?", w: "holistic" },
    { re: "foster(?:s|ed|ing)?", w: "foster" },
    { re: "harness(?:es|ed|ing)?", w: "harness" },
    { re: "streamlin(?:e|es|ed|ing)", w: "streamline" },
    { re: "seamless(?:ly)?", w: "seamless" },
    { re: "realm", w: "realm" },
    { re: "testament", w: "testament" },
    { re: "vibrant", w: "vibrant" },
    { re: "elucidat(?:e|es|ed|ing)", w: "elucidate" },
    { re: "illuminat(?:e|es|ed|ing)", w: "illuminate" },
    { re: "unveil(?:s|ed|ing)?", w: "unveil" },
    { re: "commendabl[ey]", w: "commendable" },
    { re: "robust", w: "robust", technical: true },
    { re: "comprehensive(?:ly)?", w: "comprehensive", technical: true },
    { re: "leverag(?:es|ed|ing)", w: "leverage", technical: true },
    { re: "facilitat(?:e|es|ed|ing)", w: "facilitate", technical: true },
    { re: "foundational", w: "foundational", technical: true }
  ];
  const INTENSIFIERS = ["very", "really", "extremely", "incredibly", "truly", "highly", "absolutely", "remarkably", "exceptionally", "significantly", "profoundly", "deeply"];
  const GENERIC_POSITIVE = ["great", "amazing", "powerful", "innovative", "cutting-edge", "game-changing", "game-changer", "transformative", "exceptional", "unparalleled", "incredible", "fantastic", "revolutionary", "world-class", "state-of-the-art"];
  const CORPORATE = ["synergy", "synergies", "stakeholders", "ecosystem", "ecosystems", "paradigm", "scalable", "best practices", "value proposition", "actionable", "empower", "empowers", "empowering", "empowered", "optimize", "optimise", "optimizing", "optimising", "mission-critical", "end-to-end", "thought leadership"];
  const VAGUE_NOUNS = ["aspects", "factors", "elements", "landscape", "realm", "journey", "solutions", "strategies", "initiatives", "insights", "opportunities", "dynamics"];

  /* ---- Rule thresholds ------------------------------------------------------
     PROVISIONAL. Calibrated against the bundled test corpus only, not
     against a large human baseline. They exist to say "frequent enough
     that a reader may notice", never "this text is AI". Each number is
     per 1,000 words unless it says otherwise. The genre selector scales
     densities: formal and technical writing legitimately uses more of
     everything on these lists. */
  const GENRE_SCALE = { general: 1, formal: 1.5, technical: 1.5 };

  const THRESHOLDS = {
    minWordsForDensity: 150,
    minWordsForRhythm: 150,
    minSentencesForRhythm: 8,
    minParagraphsForStructure: 4,
    emDash: { minCount: 4, noticeable: 6, high: 12, highMinCount: 8 },
    emDashPairs: { noticeable: 3 },
    semicolon: { minCount: 4, noticeable: 6, high: 12 },
    colon: { minCount: 5, noticeable: 8, high: 16 },
    ellipsis: { minCount: 4, noticeable: 4, high: 10 },
    parenthetical: { minCount: 5, noticeable: 8, high: 16 },
    phrases: { noticeableCount: 2, noticeableDensity: 3, highCount: 4, highDensity: 6 },
    rhetoric: { noticeableCount: 2, noticeableDensity: 3, highCount: 4, highDensity: 6 },
    transitions: { minCount: 3, noticeableShare: 0.15, highShare: 0.25, repeatSame: 3 },
    vocabulary: { minCount: 3, minDistinct: 2, noticeable: 6, high: 12 },
    intensifiers: { minCount: 4, noticeable: 12, high: 24 },
    genericPositive: { minCount: 3, noticeable: 8, high: 16 },
    corporate: { minCount: 3, noticeable: 6, high: 12 },
    vagueNouns: { minCount: 5, noticeable: 15, high: 30 },
    rhythm: { cvNoticeable: 0.38, cvHigh: 0.28, formalRelax: 0.05, runLength: 4, lengthRun: 4, lengthRunTolerance: 2 },
    structure: { paraCvNoticeable: 0.15, summaryEndings: 3, listItems: 4 },
    repeatedPhrase: { n: 4, minOccurrences: 3 },
    specificity: { minWords: 200, concretePer1000: 1.5 }
  };

  /* Signals the product deliberately does not measure, and why. Shown to
     the reader, so the page says what a regex cannot see. */
  const NOT_MEASURED = [
    { name: "Whether the claims are accurate", why: "Needs knowledge of the subject, not of the wording." },
    { name: "Whether the text has a real point of view", why: "Opinion and stance are semantic. Counting words cannot see them." },
    { name: "Over-balanced hedging ('on one hand, on the other')", why: "Needs a reading of what is being weighed." },
    { name: "Logical flow between paragraphs", why: "Needs understanding of the argument." },
    { name: "Perplexity and burstiness", why: "Detector-style signals that need a language model, and they misjudge non-native writers." },
    { name: "Whether this was written by AI", why: "Nothing here can tell. People write all of these patterns, and models can avoid them." }
  ];

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  const WF = (UTG.writingFootprint = UTG.writingFootprint || {});
  WF.patterns = {
    EM: EM,
    CATEGORIES: CATEGORIES,
    REFERENCES: REFERENCES,
    PHRASES: PHRASES,
    RHETORIC: RHETORIC,
    TRANSITIONS: TRANSITIONS,
    TRANSITION_ALSO: TRANSITION_ALSO,
    STOCK_WORDS: STOCK_WORDS,
    INTENSIFIERS: INTENSIFIERS,
    GENERIC_POSITIVE: GENERIC_POSITIVE,
    CORPORATE: CORPORATE,
    VAGUE_NOUNS: VAGUE_NOUNS,
    GENRE_SCALE: GENRE_SCALE,
    THRESHOLDS: THRESHOLDS,
    NOT_MEASURED: NOT_MEASURED
  };
})();

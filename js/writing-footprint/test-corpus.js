/* ==========================================================
   js/writing-footprint/test-corpus.js
   The regression corpus for the writing footprint engine.

   HONEST LABELLING. Every sample here was written for this file. The
   "ai-styled" samples imitate the stock phrasing people attribute to
   chatbots; they are NOT captured model output. The "human" samples
   were written by a person or taken from public-domain text, but were
   written knowing the rules, so they prove that the engine does not
   misfire on ordinary prose of each kind, not that it is accurate on
   the wild. That is a regression corpus, not an accuracy study.
   A wider false-positive reading on public-domain books is recorded
   in the research notes, not here.

   Used only by engine.test.js (node). Never shipped to the browser.
   ========================================================== */
const EM = "—";

module.exports = [
  {
    id: "human-casual", kind: "human casual writing", origin: "authored",
    expect: { maxElevated: 0, minFindings: 0 },
    text: "I burned the toast again this morning. Third time this week, and the smoke alarm in our flat in Leeds is so sensitive it goes off if I even look at the grill. My flatmate Dan says I should just buy a toaster, which is fair, but the grill was already here and I'm stubborn.\n\nAnyway, I got to work at 9:40, late again, and the bus driver (a lovely woman called Pat) waited while I sprinted. Twelve minutes of apologising later, I had a coffee. It wasn't good coffee. Nobody has ever described the machine on floor two as good.\n\nWhat I actually wanted to say is that the quarterly report is done. Finally. It's 34 pages, and Priya has promised to read it tonight, which means she'll skim page 3 and ask me about page 30 tomorrow."
  },
  {
    id: "human-academic", kind: "human academic prose", origin: "authored",
    expect: { maxElevated: 0 },
    text: "The study followed 212 secondary school students in two English cities over three school years. Attendance records were matched to national test results; students with fewer than 85 percent attendance in year nine scored, on average, 0.4 standard deviations lower in year eleven. Differences between the two cities were small.\n\nSeveral limitations apply. Attendance was recorded by teachers, not by an independent observer, and the sample excludes students who left their school before year eleven. Both points would bias the estimate towards zero if absent students were also the lower attainers; the data cannot rule that out.\n\nWe therefore treat the association as descriptive. A follow-up using administrative data from all English state schools is under way, and the preregistered analysis plan is available from the authors. Until it reports, the figures above should be read as a floor on the effect, not an estimate of it."
  },
  {
    id: "human-email", kind: "human professional email", origin: "authored",
    expect: { maxElevated: 0 },
    text: "Hi Marcus,\n\nThanks for sending the revised quote. I checked it against the March figures and the freight line is still £1,240 higher than we agreed. Could you confirm whether that includes the pallet surcharge?\n\nIf it does, I'll need to take it to Hannah before Friday, since it pushes the total over the approval limit. If it doesn't, we can sign today.\n\nBest,\nAmina"
  },
  {
    id: "human-technical", kind: "human technical documentation", origin: "authored",
    expect: { maxElevated: 0, genre: "technical" },
    text: "The import job reads one CSV file per run. Each row must have an id column; rows without one are skipped and written to rejects.csv. The job is idempotent: running it twice on the same file produces the same table.\n\nTo keep memory flat, rows are processed in batches of 5,000. Change the batch size with --batch-size. Values above 50,000 can exhaust memory on the default 2 GB worker.\n\nThe parser is robust against stray quotes, but it does not guess encodings. Pass --encoding explicitly for anything that is not UTF-8. A comprehensive list of supported encodings is in the appendix. Failures exit with code 2 and print the first bad row number."
  },
  {
    id: "human-marketing", kind: "human marketing copy", origin: "authored",
    expect: { maxElevated: 1 },
    text: "Our bread is baked at 4 a.m. in a brick oven that Joe's grandfather built in 1962. The sourdough takes 36 hours. We don't rush it, and you can taste the difference.\n\nCome by the Mill Road shop before nine and the loaves are still warm. Saturday we run out by eleven. Order ahead for weddings, birthdays and anything over twelve loaves."
  },
  {
    id: "ai-styled-generic", kind: "AI-styled generic essay (synthetic)", origin: "authored",
    expect: { minElevated: 4, minFindings: 15 },
    text: `In today's rapidly evolving digital landscape, businesses must navigate the complexities of modern marketing. It's important to note that this approach offers significant benefits. Furthermore, it is not just a tool ${EM} it is a comprehensive solution that empowers teams to unlock their full potential.\n\nMoreover, leveraging innovative strategies allows organizations to seamlessly integrate robust workflows ${EM} and the results speak for themselves. Additionally, the intricate interplay of factors plays a crucial role in success. Overall, this pivotal shift showcases a testament to the power of collaboration.\n\nFurthermore, teams can harness these insights to foster growth. Additionally, stakeholders benefit from a holistic, multifaceted approach ${EM} one that elevates every aspect of the journey. Ultimately, the key lies in embracing change. In conclusion, businesses that delve into these strategies will thrive in the ever-changing world.\n\nMoreover, it's worth noting that whether you're a startup or an enterprise, this matters. Additionally, the process is not only efficient but also transformative. Overall, success depends on many factors. Ultimately, it all comes together.`
  },
  {
    id: "ai-edited", kind: "AI-styled text edited by a person (synthetic)", origin: "authored",
    expect: { maxElevated: 2 },
    text: "It's important to note that the clinic moved in May. The new building has a ramp, and Ahmed at reception says the lift is still being fixed, so ask for the ground-floor rooms.\n\nFurthermore, appointments now start at 8:30 rather than 9. If you have a 9:00 slot booked from before the move, it still stands.\n\nParking is the real problem. There are 14 spaces for about 60 staff, and the council has refused a permit scheme twice. Cycle if you can; the racks by the side door are under cover."
  },
  {
    id: "short-observation", kind: "very short paragraph", origin: "authored",
    expect: { tier: "observations", noAggregate: true },
    text: "It's important to note that the meeting moved to Tuesday."
  },
  {
    id: "short-single-dash", kind: "short text with one em dash", origin: "authored",
    expect: { tier: "observations", noAggregate: true, noEmDashFinding: true },
    text: `The train was late ${EM} again. I walked.`
  },
  {
    id: "single-dash-long", kind: "long text with a single em dash", origin: "authored",
    expect: { noEmDashFinding: true, maxElevated: 0 },
    text: "Rain had been forecast all week, and on Saturday it finally arrived, steady and cold, just as the first stall holders were setting up. By ten the car park was a lake. Nobody left. A man in a yellow coat sold out of hot chocolate by half past, and the knife sharpener under the awning had a queue of eleven.\n\nAt noon the sun came out " + EM + " briefly, and only over the east side. The cheese stall packed away early. The band played anyway, a little flat, to about thirty people with umbrellas, and nobody minded.\n\nBy three it was over. The council van came for the bins at four, and the field looked as if nothing had happened. Next month's market is on the second Saturday, if the field is dry enough, and the committee will post on the noticeboard by the gate. Anyone who wants a stall should email the secretary before the first of the month, because the plots are marked out in advance and the council inspects the layout."
  },
  {
    id: "list-bullets", kind: "list", origin: "authored",
    expect: { maxElevated: 1 },
    text: "Packing list for the weekend:\n\n- Waterproof jacket\n- Two pairs of socks\n- Torch and spare batteries\n- Paper map (the signal is poor past the ridge)\n- Flask\n- 3 litres of water each\n- First aid kit, including blister plasters\n\nLeave the tent poles in the car; the hut has bunks."
  },
  {
    id: "poetry", kind: "poetry", origin: "public-domain (Shakespeare, Sonnet 18, 1609)",
    expect: { maxElevated: 0 },
    text: "Shall I compare thee to a summer's day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer's lease hath all too short a date;\nSometime too hot the eye of heaven shines,\nAnd often is his gold complexion dimm'd;\nAnd every fair from fair sometime declines,\nBy chance or nature's changing course untrimm'd;\nBut thy eternal summer shall not fade,\nNor lose possession of that fair thou ow'st;\nNor shall death brag thou wander'st in his shade,\nWhen in eternal lines to time thou grow'st:\nSo long as men can breathe or eyes can see,\nSo long lives this, and this gives life to thee."
  },
  {
    id: "dialogue", kind: "dialogue", origin: "authored",
    expect: { maxElevated: 0 },
    text: "\"Did you lock it?\" Maya asked.\n\n\"I think so.\"\n\n\"You think so.\"\n\n\"I locked it. I'm nearly sure I locked it.\" He patted his pockets. \"The keys are here, so I must have.\"\n\n\"That's not how keys work, Tom.\"\n\nThey walked back down the lane together, not speaking, and found the gate shut and the padlock hanging open."
  },
  {
    id: "quoted-passage", kind: "quoted passage and citation", origin: "authored",
    expect: { noFindingInsideQuotes: true },
    text: "The report describes the plan as \"a testament to the power of collaboration, delving into the intricate landscape of modern governance\" (Alvarez, 2021). We did not find that persuasive.\n\n> It's important to note that furthermore the moreover is not a sentence.\n\nSee also https://example.com/it-is-important-to-note-that for the original."
  },
  {
    id: "non-english-es", kind: "non-English (Spanish)", origin: "authored",
    expect: { status: "unsupported_language" },
    text: "Ayer fuimos al mercado de la plaza mayor y compramos tomates, pan y un poco de queso. Después nos sentamos en un banco a mirar a la gente pasar mientras el sol bajaba. Mi hermana dijo que deberíamos volver el sábado, porque entonces hay música y los puestos de flores están abiertos hasta tarde."
  },
  {
    id: "non-english-ja", kind: "non-English (Japanese)", origin: "authored",
    expect: { status: "unsupported_language" },
    text: "昨日は友達と一緒に近くの公園まで散歩に行きました。天気がとても良かったので、お弁当を持って川のそばに座り、午後までのんびり過ごしました。帰りにはパン屋さんに寄って、明日の朝ごはんを買いました。"
  },
  {
    id: "mixed-language", kind: "mixed language", origin: "authored",
    expect: { status: "ok", maxElevated: 0 },
    text: "We had dinner at a small place near the station. The owner said \"bienvenidos\" as we came in, and the menu was half in Spanish, half in English. I ordered the fish and my brother, who has never in his life ordered the fish, had the same. The tortilla was better than anything I have had in London, and it cost £6.50. We stayed until they put the chairs on the tables."
  },
  {
    id: "unicode-emoji", kind: "Unicode and emoji heavy", origin: "authored",
    expect: { maxElevated: 0 },
    text: "Birthday plans 🎂🎉: cake at 4, games at 5, and Nan arrives at 6 because her bus is always late 😌. Please bring a chair. Zoë is doing the playlist, and she has promised no more than two songs by the same band. Café résumé naïve façade — all fine, none of it flagged. 👍"
  }
];

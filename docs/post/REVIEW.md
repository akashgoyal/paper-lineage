# Post review log

Rubric (from the challenge): Path Two judges "quality and honesty of the build process writeup" (the heart), app functionality, schema thoughtfulness, creativity. Added: accuracy (every claim checkable), concision, diagrams, template order.

## Iteration 1 → judged

| Criterion | Score | Findings |
|---|---|---|
| Accuracy | 2.5 | Hook chain "BLIP → Flamingo → BLIP-2" is a model output; BLIP→Flamingo has no direct link. Real curated chain (Set Transformer → Perceiver → Flamingo → BLIP-2) is verified and stronger. "Checked by hand" is false. Agent Actions "Write explanation" never ran live. Example 2 presents a hypothetical answer as fact. |
| Build-process honesty | 3 | Few failed prompts; hides the human's course-corrections (PDF fallback, "only 48 concepts", chat-first home, Sanity-vs-code diagram). "~3 days" is wrong (2 days, Oct 2–3). |
| Schema | 3 | Rule stated, document shape not shown. |
| Concision | 3.5 | "How it works" and "How I Used Sanity" overlap; table repeats diagram. |
| Diagrams | 3.5 | Architecture doesn't mark Sanity vs our code. |
| Template | 3 | Code should follow Demo. |

**Refine for v2:** verified hook chain; human course-corrections as their own list; prompts that failed; schema snippet; merge overlapping sections; colour/label Sanity vs ours; untested items listed; template order; repo must be public at submission (flag to author).

## Iteration 2 → judged

| Criterion | Score | Findings |
|---|---|---|
| Accuracy | 4 | Schema example used wrong values (real doc: evidenceKey c2 "Method", relation extends, confidence 0.95). "Fails the build" → fails the test suite. "Chosen evidence sentence" implied curator choice (harvest chose). "What did CLIP build on?" untested. |
| Honesty | 4.5 | Must state 0 links verified yet (judges will see no relation labels); 19 bad links still in production. |
| Schema | 4.5 | Good once values fixed. |
| Sanity justification | 3.5 | Missing "why structured content" (Path One's keyword-search test). |
| Concision | 3.5 | 1,509 words; Sanity section repeats the diagram. |

**Refine for v3:** real document values; status line with verified count; why-structured paragraph; collapse minor features into one row; drop untested example question.

## Iteration 3 → judged

| Criterion | Score | Findings |
|---|---|---|
| Accuracy | 4.5 | Hook claimed the chat "answers with" the Set Transformer chain; in testing the chat drew BLIP → Flamingo → BLIP-2. The chain is the Q-Former **concept page**, live: six steps from Bahdanau (2014). Fixed wording. |
| Honesty | 5 | Course-corrections, failures, cuts and untested items all explicit. |
| Concision | 4 | ~1,500 words; duplicates removed (KB finding once, shorter bullets). Build process kept long on purpose: it's what judges weigh most. |
| Diagrams | 4.5 | Architecture colour-coded 🟥 Sanity / 🟦 ours / ⬜ third party; three examples cover Ask, curation, intake. |
| Template | 5 | Path Two order: What I Built · Demo · Code · (How it works · How I Used Sanity) · My Build Process · Sanity Project Details · Agent Session. |

**Open items for the author (not fixable in text):** verified-link count (_N_), video link, agent-session link, make the GitHub repo public (judges can't open a private repo), render mermaid to images (DEV doesn't render mermaid).

---

# Path One post (POST_PATH1.md)

Rubric (Path One): meaningful use of Sanity Context and structured content · technical implementation and code quality · use of Knowledge Bases · usability. Plus accuracy and concision.

## Iteration 1 → judged

| Criterion | Score | Findings |
|---|---|---|
| Accuracy | 3.5 | Run stats wrong (traced run: 3 turns, 23 s, 0.6¢). "Paraphrased quote rejected" overstated (one failure was markdown). "What did CLIP build on?" untested. "~300 lines" wrong (371 + 71). |
| Context use | 4.5 | Two endpoints, routing table, real trace with the model's own GROQ. |
| KB use | 4 | Sources, 20 entries, search vs read, honest summary finding. |
| Usability | 3 | Stated, not shown; latency only in limits. |

**Refine:** fix stats/wording; test CLIP (works: 27 links, careful "none are reviewed" answer); add it as the usability example.

## Iteration 2 → judged

| Criterion | Score | Findings |
|---|---|---|
| Accuracy | 4.5 | Trace mixed two runs (showQuote came from a later 5-turn run). Now one run, unedited. |
| Usability | 4.5 | Real CLIP answer shows the fact/interpretation rule from the visitor's side. |
| Concision | 4.5 | ~1,200 words; "How I Used Sanity" is the largest section, as the template asks. |

**Open items for the author:** video, session link, Path Two link, repo public before submitting.

---

# Demo script (DEMO_SCRIPT.md)

Rubric: covers both paths' judging criteria in ≤3:00 · every claim true on camera · survives slow or variable Ask answers · recordable by one person.

## Draft 1 → judged
| Criterion | Score | Findings |
|---|---|---|
| Coverage | 4 | Knowledge Base never shown explicitly (Path One judges score it). |
| True on camera | 2.5 | Scene 5 depends on live updates never tested on the deployed site (and impossible until the CORS fix an hour earlier). Scene 6 would show 16, not 15: the count only refreshes after Re-check, which needs the runner. |
| Robustness | 2.5 | No plan for a 40 s or thin Ask answer; narration referenced specifics the model may not produce. |

**Refine:** verified the live-events stream on the deployed site (200, no errors); rehearsal with Undo; Re-check step; KB moment via the progress line; narration made run-independent; captions; fallbacks; cut list.

## Draft 2 → judged
| Criterion | Score | Findings |
|---|---|---|
| True on camera | 4.5 | Claims checked against code (paper page Verified section, Desk Re-check and count). Missing: how to find BLIP-2 in the Desk queue. Fixed. |
| Robustness | 4.5 | Every risky step has a fallback; total 2:45 with a 16 s cut list. |

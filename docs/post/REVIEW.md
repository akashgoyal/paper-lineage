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

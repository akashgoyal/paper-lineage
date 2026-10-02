# Build Log

The honest record of building Paper Lineage with an AI coding agent (Claude Code).
Updated **during** the build. Each entry: goal · prompt · what the AI produced · what was wrong · fix · time.

---

## 2026-10-02 · Session 1: from idea to spec

**Goal:** pick an idea, design the architecture, write a spec before writing any code.

**Prompts (exact text):**
1. "There's a competition - <challenge link> Explain"
2. "For vibe-coded app - what do you think will make a winning entry"
3. "what will be the structured data for Paper Lineage app"
4. "How can the app make most use of sanity"
5. "create a new repo - start with system architecture - make most use of sanity features which are available in free version with good UX - refine the apps features/flow/design. Consider bonus points also in app design. Then create a spec before actual implementation."

**What the AI produced:** a challenge summary, a strategy, a first content model (paper / influence-as-edge / concept / dataset / benchmark / storyline), a feature list, then `ARCHITECTURE.md` + `SPEC.md`.

**Where the AI was wrong, and how we caught it:**
- In prompt 4 the agent suggested **Comments, Tasks and Content Releases**. When it checked sanity.io/pricing for prompt 5, it found all three are **paid-only**. They were replaced with the workflow `send-back` note and a single-transaction `publish-bundle` effect.
- Earlier, the agent described "Workflows" as a `status` field on documents. After reading the docs, it turned out **Sanity Workflows is a real early-access engine** (`@sanity/workflow-engine`, with stages, activities, actions, effects and a Studio plugin), which is what the bonus refers to. The design was rebuilt around a real `paper-intake` workflow definition. A plain `reviewDecision` field was kept as an engine-independent fallback.
- The agent's first idea copied the "AI content pipeline" cookbook, where clean checks skip the human. We changed it to *always* require human curation, because lineage edges are historical claims. The checks set review priority instead.

**Time:** about 1 h

---

## 2026-10-02 · Session 1b: project setup (M0, part 1)

- Created the Sanity project `jd22zcim` in the web UI.
- **Hiccup:** the human ran `mkdir paper-lineage && cd paper-lineage && npm create sanity …`. The agent had already created that folder, so `mkdir` failed and the `&&` chain silently skipped the scaffold. The agent noticed because there was no `studio/` folder and no `~/.config/sanity` login. Fix: the human ran `npx sanity login`, then the agent ran the scaffold non-interactively (`--package-manager npm --yes`).
- Studio: Sanity v6.17 (Workflows plugin needs ≥ 6.15 ✓). Next.js 16.3 scaffolded in `web/`.
- Created the public `workflows` dataset and added CORS `http://localhost:3000` (with credentials, needed for Presentation / Visual Editing).
- Layout changed from `apps/*` to `studio/`, `web/`, `desk/` at the repo root, to match what was already scaffolded.

## 2026-10-02 · Session 2: harvesting a real lineage dataset from BLIP-2

**Prompt:** "Prepare data for many papers (don't limit to only 9). Take any one as start point - like BLIP2. Then backtrack the references or prior papers & create dataset around that." Later: "If paper apis are not working … download the pdf & analyse it on your own."

**What we built:** `scripts/harvest.mjs` reads each paper's full text (ar5iv / arXiv HTML, falling back to the PDF through `pdftotext`). It parses the bibliography and records **every in-text citation with its sentence and section**. A reference counts as influence if it is cited 2+ times or inside a Method-like section. That turned out to be a better lineage signal than raw citation counts. `scripts/curate.mjs` then proposes relations from cue phrases, tags 48 hand-written concepts, and applies hand decisions from `data/curated/overrides.json`.

**Result:** walked 3 levels back from BLIP-2. 229 papers harvested; **205 kept** (171 methods, 14 datasets, 11 benchmarks, 9 analyses) with **1,369 lineage edges**, each with an evidence quote. Shortest paths look right: *Transformer → ALBEF → BLIP-2*, *ResNet → CLIP → BLIP-2*, *Bahdanau attention → LXMERT → ALBEF → BLIP-2*.

**What went wrong (honestly):**
- **Semantic Scholar** (the first plan) returned HTTP 429 on every call: the keyless pool was exhausted. We switched to reading full text ourselves.
- **OpenAlex** stores no references for arXiv preprints. We only used it for title → arXiv ID lookups, until its keyless **daily budget ran out** mid-run.
- **DBLP** answered with a bot-check page. We did *not* try to get around it.
- **arXiv title search silently returned 0 hits** whenever the query contained stopwords ("with", "before"). That is why ALBEF ("Align *before* fuse") was missing at first. 51 false "not found" results had been cached and had to be purged.
- A **catastrophic-backtracking regex** in the PDF parser (`^([A-Z][a-z]*\.?\s?,?\s*)+(and|&)`) pinned the CPU at 100% for 50 minutes on one paper. It was replaced with a token-ratio heuristic and a stall detector was added to the monitor.
- The **evidence quotes were wrong** when the parser couldn't place a citation label and fell back to the paragraph's first sentence (Flamingo's "quote" was BLIP-2's opening line). Fix: a quote must name the cited first author.
- The first cue-phrase pass labelled **929 edges "extends" by default**. Fix: no cue means no label (702 unlabelled, left for curators). Cue order changed so reuse ("we use … from") beats "state-of-the-art".
- Known remaining errors (left on purpose for the curation demo): *ViT "challenges" BERT* (triggered by the word "however"), and *BLIP-2 "reuses" Flamingo* (it actually argues against Flamingo's loss).

**Design change this caused:** facts vs interpretations (see `UX_REVIEW.md`). Citation facts are public; relation labels need human acceptance.

**Time:** about 3 h, mostly waiting on rate limits.

## 2026-10-02 · Session 2b: the concept list was too thin (human caught it)

**Prompt:** "In 205 papers, there are only 48 concepts."

**What was wrong:** the agent wrote the 48-concept vocabulary *before* the data existed, so it only covered ideas the agent expected (Q-Former, CLIP, BERT…). Most papers' own contributions (MAE's masking, DeiT's distillation token, Swin's shifted windows, GPipe, RoPE…) had no concept at all. The agent also had two attributions wrong: the **single-stream VL Transformer** came from VisualBERT, not UNITER, and **image–text contrastive learning** came from ConVIRT (2020), *before* CLIP.

**Fix:** the agent read all 197 abstracts and rebuilt the vocabulary as a **two-level taxonomy**: 25 themes → 180 concepts, each concept with a `broader` theme and an `introducedBy` paper. `curate.mjs` now fails if any `broader` or `introducedBy` doesn't resolve. "Uses" now also comes from the paper's own citation sentences (whatever it inherits along an incoming edge), because abstracts under-report methods. While reading, it found 8 more off-topic papers (NeRF, dialogue platforms…) and excluded them with reasons.

**Result:** 163/197 papers introduce at least one concept, there are 5.4 concepts per paper on average, and every concept is used. Inherited concepts on edges went from 382 to 701. Nice side-effect for the story: the taxonomy shows *Set Transformer → Perceiver → Flamingo's resampler → BLIP-2's Q-Former* as one idea evolving.

## 2026-10-02 · Session 3: chat-first design, Sanity Context, schema + seed live

**Prompts (summarised):** make the first page a chat box that opens papers; "the current data storage use seems very simple use of sanity"; who can edit in Studio; how to use Knowledge Bases; split KB vs GROQ data; "setup the Sanity KB with relevant pdfs & correct schema"; mark Sanity vs our code in the diagram.

**Corrections the agent made after reading docs:**
- It had said Sanity Context couldn't power the chat because of a 150-document cap. Wrong: the cap applies to **Knowledge Bases** (beta). **GROQ mode** queries the live dataset with no such cap. The design now uses **two MCP endpoints**, because one endpoint with both source types silently ignores the Knowledge Base.
- Free plan roles are only Administrator and Viewer, so Studio and Desk are **curator tools**, not end-user tools. That became an explicit access model.
- Knowledge Bases and MCP endpoints are created in the Dashboard Context app (no documented API), so the agent prepared everything for one upload and wrote a paste-ready setup sheet (`docs/CONTEXT_SETUP.md`) instead of guessing an API.

**Built:** 9 schema types with Fact / Interpretation / Review groups and async validation; custom Studio structure; seed of 1,950 documents imported; schema deployed; **verified** that private-id documents (`paperText.*`) are invisible to public queries (count 0); 40 core PDFs (219 MB) → `paper-lineage-kb.zip` with a manifest (so entries cite "BLIP-2 (2023)") and a concept glossary.

**Bugs hit:** 2 duplicate link IDs because some bibliographies list the same work twice (fixed by merging citations per pair: `scripts/lib/edges.mjs`); LaTeX alt-text leaking into quotes ("BERTbase{}_{\text{base}}"), now stripped in the seed; one transient `fetch failed` on import (a retry worked).

## 2026-10-02 · Session 4: design spec v1 → v1.1 (implementation-readiness review)

**Prompts:** "Prepare the projects design spec"; "go with your recommended answers" (D1–D4); "Review the design spec. Is it complete… Can it be used for moving ahead with implementation"; "go ahead with v1.1".

**What the review caught (honestly):** the v1 spec read well but would have blocked implementation:
- **Ask had no way to pick cards.** Context MCP tools are generic (`groq_query`, `knowledge_base_read`), so "map tool results to cards" couldn't work. Fix: **server-validated display tools** (`showChain`, `showQuote`, `showComparison`, `showPapers`, `suggestFollowUps`, `reportOutcome`, `draftStoryline`). The server resolves every card from Sanity, only shows relations for accepted links, and **re-reads the Knowledge Base entry so a quote must match verbatim**. The model can't put a made-up quote on screen.
- **The Explorer mockup showed 17 papers; the real default view has 88** (BLIP-2, 2 generations, datasets hidden). Fix: a 30-paper budget ranked by `3 × methodMentions + mentions`, per-year "+n more" stacks, and a table view as the escape hatch.
- **A contradiction:** shareable `/ask/[id]` vs "the server keeps only anonymised questions". Fix: no sharing at launch.
- **Rate limiting had no store** (serverless has no shared memory). Fix: Upstash Redis free tier, plus a global daily cap.
- **Data checks:** all 197 papers have an empty `summary` (abstract fallback added); 0 links verified (meter zero state); 0 storylines ("Stories" hidden until one exists).
- Contrast checks found that the mockups' unreviewed grey failed 3:1 (fixed to `#7E848E`), and that one ratio I'd written down was wrong (warning 4.9, not 5.9).

**Also added:** Desk Inbox / Composer / Pipeline specs, Suggest-a-paper creates a **gap** (not a paper), the concept evolution rule with a new curated `concept.buildsOn` field, SEO / errors / loading / performance budgets / caching / privacy, and decisions D5–D10. The canvas was updated to match (grey, nav, stacks, Desk tabs, a mock-state note, Upstash on the architecture board).

## 2026-10-02 · Session 5: M1, Studio customisations + idea chains

**Prompt:** "start implementation with M1".

**Built:** `concept.buildsOn` (reference filter, async validation that earlier ideas really are older); 52 curated idea-chain pairs on 38 concepts, all checked against introduction dates before applying (`data/curated/concept-buildson.json`, applied with `sanity exec … --with-user-token` so no token was handled). Custom inputs: **arXiv ID** (paste any arXiv URL and it stores the bare ID), **Evidence picker** (every citation sentence as a radio card, cited author highlighted), **Relation picker** (the public site's palette, meanings, suggestion tagged with origin and confidence). Views: Paper → **Lineage** / **Source**, Link → **In context** (each sentence inside its full paragraph), Concept → **Evolution** (the buildsOn chain with link status between the introducing papers). **Accept / Reject** document actions (record reviewer and time, then publish), **origin / review badges**. Hosted at https://paper-lineage.sanity.studio.

**What went wrong:**
- `@sanity/ui` v4 deprecates `space` (typed `never`) in favour of `gap`, which gave 14 confusing "number is not assignable to undefined" errors.
- `@sanity/icons` v5 types **every root export as `never`**; icons must come from subpaths (`@sanity/icons/Checkmark`). The schema icons written in Session 3 type-checked only because `icon` accepts anything, so they would have rendered blank. All imports were switched to subpaths.
- Verified live: the public API returns Q-Former ← Perceiver resampler (Flamingo) ← latent-array cross-attention (Perceiver) ← inducing-point attention (Set Transformer), and Q-Former ← BLIP's encoder–decoder ← Align before fuse (ALBEF) ← contrastive image–text (ConVIRT).
- **Not verified visually:** the Studio needs a Sanity login, which only the human can do in the browser pane.

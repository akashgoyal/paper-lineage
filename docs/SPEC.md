# Paper Lineage — Product & Technical Spec

Status: **v3** · 2026-10-02 · v3: chat-first **Ask** home on Sanity Context (GROQ endpoint + Knowledge Base), schema deployed and seeded (197 papers, 1,349 links, 205 concepts), Studio/Desk for curators only. Submission deadline **2026-10-04 23:59 PDT**
Architecture: see [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. Goals

| Goal | How it maps to judging |
|---|---|
| A clear, honest record of an AI-assisted build | Criterion 1: *build process quality and honesty*. See `BUILD_LOG.md`, kept as we go |
| A working, deployed app with real data | Criterion 2: *functionality* |
| A data model where the relationships are the product | Criterion 3: *schema thoughtfulness* |
| An idea no other entrant is likely to have: a curated, evidence-backed family tree of AI ideas | Criterion 4: *creativity* |
| Use Sanity beyond a read-only frontend | Bonus: **Workflows** + **App SDK** |

### Non-goals
- Full citation graphs (Semantic Scholar already provides those). We model only *meaningful* influence, curated by people.
- User accounts on the public site.
- Anything that needs a paid Sanity plan.

---

## 2. Personas

| Persona | Surface | Wants |
|---|---|---|
| **Visitor** (ML learner, engineer) | Public site | "Where did this idea come from, and what did it lead to?" |
| **Curator** (us) | Studio + Lineage Desk | Add papers fast, let AI do the reading, approve only correct claims |
| **Judge** | Public site, `/pipeline`, demo video, DEV post | See Sanity features working without logging in |

---

## 3. Core user flows

### F0. Ask (visitor): **the front door**
1. `/` is a chat box with example questions (from `siteSettings.examplePrompts`) and "start from a paper" shortcuts.
2. The question goes to `/api/ask`. The agent (Claude) uses **Context MCP A (graph, GROQ mode)** for who/when/which/how-many/verified and **Context MCP B (papers, Knowledge Base)** for how/why/results. See the data contract in [ARCHITECTURE §5](ARCHITECTURE.md#5-data-contract-for-ask-groq-vs-knowledge-base).
3. The answer streams as short prose plus **cards drawn from cited `_id`s** (paper cards, chains, comparison tables, status chips) and **quote blocks from the Knowledge Base** ("From the paper · §Method").
4. Clicking a paper opens it in the side panel (tabs). Follow-up chips continue the conversation. "Make this a storyline" creates a storyline draft for curators.
5. The question is saved as `questions.<uuid>` (private id path). A partial or unanswered outcome becomes a `gap` (Function `question-to-gap`).

Acceptance: the four known-answer checks in [CONTEXT_SETUP.md](CONTEXT_SETUP.md#known-answer-checks) pass; no answer states a relation for an unreviewed link.


### F1. Explore the lineage (visitor)
1. On `/`, the full lineage graph is laid out by year from left to right. Edge colour shows the relation type.
2. Hovering an edge shows a tooltip: *"ViT **applied** self-attention **to a new domain** (text → image patches)"* plus the evidence quote.
3. Clicking a concept chip ("self-attention") highlights every path that carried that concept.
4. Clicking a node opens `/paper/[slug]`.

### F2. Read a paper (visitor)
`/paper/[slug]` shows: title, year, authors and orgs, a one-line summary, the key figure, **Built on** (incoming edges with explanation and evidence), **Led to** (outgoing edges), concepts introduced and used, a results table, 4 insight cards, and a 2-hop mini graph. Each edge carries a provenance badge: `🤖 AI-proposed · ✅ human-verified` or `✍️ curator-written`.

### F3. Follow a storyline (visitor)
`/story/[slug]` is scrollytelling. The narrative (Portable Text) is on the left and a sticky graph is on the right. As each step scrolls into view, its edge animates and the rest of the graph fades.

### F4. Find a connection (visitor)
`/connect?from=gan&to=clip`: pick two papers and see the shortest lineage path between them, with each hop's explanation. The tagline is *"Six degrees of Attention"*.

### F5. Add a paper (curator) / suggest a paper (visitor)
> v1.1: a visitor suggestion creates or bumps a `missing-paper` **gap** (DESIGN_SPEC §6.7). Only curators create papers, from the Desk Inbox.

- **Curator**: in Studio or the Desk, create a paper and paste any arXiv URL or ID. The input normalises it (`https://arxiv.org/abs/2103.00020v2` → `2103.00020`).
- **Visitor**: the **Suggest a paper** form on the site (arXiv ID only, capped at 10/day, `cs.*` categories only).
- Either way, a Function starts the `paper-intake` workflow.

### F6. Review AI proposals (curator): **the main flow**
1. The Lineage Desk queue lists papers in the `curation` stage. Flagged items are sorted first.
2. Opening one shows proposed edges as cards. Each card has the relation, inherited concepts, explanation, the evidence quote **highlighted in the source text**, check results and AI confidence.
3. The curator presses `A` to accept, `R` to reject or `E` to edit inline, using `J`/`K` to move between cards. The graph preview updates live, with proposed edges dashed.
4. Then **Approve & publish** fires the workflow `approve` action, or **Send back** (with a required note) re-runs enrichment using that note.
5. The public site and `/pipeline` update live.

### F7. Watch the pipeline (judge)
`/pipeline` is a live, read-only kanban of workflow instances by stage. Clicking a card shows that instance's event history (who or what moved it, and when). AI actors and human actors are labelled differently.

---

## 4. Content model (deployed)

Source of truth: `studio/schemaTypes/*.ts` (deployed with `sanity schema deploy`); summary and id/privacy rules in [ARCHITECTURE §6](ARCHITECTURE.md#6-content-model-deployed).

| Type | Highlights |
|---|---|
| `paper` | title, shortName, slug, kind, arxivId (format + uniqueness validation), publishedAt, authors[], summary, abstract, keyFigure (hotspot, alt required), `uses[]` → concept (filtered to level concept), read-only `harvest` record |
| `paperText` | private `paperText.<arxiv>`; sections[{heading, text}] |
| `influence` | groups **Fact** (from, to, read-only `citation{mentions, methodMentions, relatedMentions, sections[], contexts[_key]}`), **Interpretation** (`evidenceKey` → context _key, relation incl. `uses-dataset`, inherited[], explanation), **Review** (`provenance{origin, suggestedRelation, confidence, reviewDecision, reviewedBy, reviewedAt}`). Async validation: time order, no self-link, no duplicate pair; accepted ⇒ relation |
| `concept` | level theme/concept, broader → theme, category, summary, aliases, introducedBy → paper, origin |
| `storyline` | title, slug, dek, intro (Portable Text with paperMention / conceptMention / linkMention), steps[{influence (accepted only), narrative}], featured |
| `question` | private `questions.<uuid>`; text, askedAt, outcome, endpoints used, weak refs to cited papers and links, gap |
| `gap` | kind (missing-link, missing-paper, unanswered, weak-evidence), title, detail, papers, suggestedArxivIds, questionCount, status, resolution |
| `datasetStats`, `siteSettings` | singletons (no create/delete actions) |

Dropped from v2: separate `dataset`, `benchmark`, `author`, `organization` types (paper `kind` covers datasets and benchmarks; authors are strings for now), and `insights` (the Knowledge Base answers "what does the paper say").

## 5. Key GROQ queries (`web/sanity/queries.ts`)

```groq
// GRAPH_QUERY: the whole published graph (one request)
{
  "papers": *[_type == "paper"]{ _id, title, "slug": slug.current, publishedAt,
             "introduces": introduces[]->slug.current },
  "edges":  *[_type == "influence"]{ _id, relation, explanation,
             "from": from._ref, "to": to._ref,
             "inherited": inherited[]->{name, "slug": slug.current, category},
             "origin": provenance.origin }
}

// PAPER_QUERY
*[_type == "paper" && slug.current == $slug][0]{
  ..., authors[]->{name, affiliation->{name, logo}},
  introduces[]->, uses[]->, trainedOn[]->,
  results[]{ ..., benchmark->{name, metric, unit, higherIsBetter} },
  "builtOn": *[_type == "influence" && to._ref == ^._id]{ ..., from->{title, "slug": slug.current, publishedAt}, inherited[]-> } | order(from->publishedAt asc),
  "ledTo":   *[_type == "influence" && from._ref == ^._id]{ ..., to->{title, "slug": slug.current, publishedAt}, inherited[]-> } | order(to->publishedAt asc)
}

// CONCEPT_TRAIL_QUERY: who originated a concept, and who carried it forward
*[_type == "concept" && slug.current == $slug][0]{
  ...,
  "originators": *[_type == "paper" && references(^._id) && ^._id in introduces[]._ref]{title, "slug": slug.current, publishedAt},
  "carriers":    *[_type == "influence" && ^._id in inherited[]._ref]{ from->{title, publishedAt}, to->{title, "slug": slug.current, publishedAt}, relation } | order(to.publishedAt asc)
}

// LEADERBOARD: the most influential papers
*[_type == "paper"]{ title, "slug": slug.current,
  "descendants": count(*[_type == "influence" && from._ref == ^._id]) } | order(descendants desc)[0...10]
```

---

## 6. Surfaces

### 6.1 Sanity Studio (`studio`)

| Feature | Spec | Acceptance |
|---|---|---|
| **Structure** | Sidebar: `📥 Intake` (papers grouped by workflow stage) · `📄 Papers` (by year) · `🔗 Influences` (sub-lists by relation, plus **⚠️ Proposed**) · `🧩 Concepts` (by category) · `📚 Storylines` · `🩺 Data health` (orphan papers, edges without evidence, unused concepts, AI-proposed concept names) · `⚙️ Settings` (singleton) | Every list is backed by a GROQ filter. Singleton can't be duplicated or deleted |
| **arXiv input** | Custom input on `paper.arxivId`. Pasting a URL normalises it; shows ✓ or ✗ for format; links to arxiv.org | Pasting `https://arxiv.org/pdf/2103.00020v1` stores `2103.00020` |
| **Lineage view** | Custom document view tab on `paper` and `influence` (`S.view.component`): a mini React Flow graph, 2 hops out | Shows draft edges dashed |
| **Reference filter** | `influence.inherited` filtered to `from`'s concepts | Only valid concepts show in the picker |
| **Async validation** | Time order, no self-loops, edge uniqueness, arXiv ID uniqueness | Invalid docs can't be published |
| **Initial value templates** | "Influence from this paper" (pre-fills `from`), "Influence to this paper" | Shown in the reference "create new" menu |
| **Document actions** | `Accept edge` and `Reject edge` on `influence` drafts, which set `provenance.reviewDecision` (the fallback path, see risks) | Work without the workflow engine |
| **Promote concept** | Action on `paper`: turns a `proposedConcepts` entry into a `concept` doc and adds it to `introduces` | One click |
| **Workflows plugin** | `workflowStudioPlugin({tag})` + `workflowDefaultDocumentNode()` | The paper editor shows the workflow strip and Workflows view |
| **Presentation tool** | `presentationTool` with a `locations` resolver: paper → `/paper/[slug]`, storyline → `/story/[slug]`, concept → `/concept/[slug]` | Click-to-edit works on the deployed site |
| **Hosted** | `sanity deploy` → `paper-lineage.sanity.studio` | |

### 6.2 Lineage Desk: App SDK app (`desk`)

Layout is three panes and fully usable from the keyboard.

```
┌────────────┬───────────────────────────────────┬──────────────────────┐
│ QUEUE      │ PAPER: CLIP (2021)  stage: curation│ GRAPH PREVIEW        │
│ ⚠ CLIP  3  │ ────────────────────────────────── │   Transformer        │
│   DDPM  4  │ ▸ Transformer → CLIP  combines     │        ╲ ┄┄┄         │
│   BERT  2  │   "We use a Transformer text enc…" │   ViT ┄┄┄▶ CLIP      │
│            │   quote found ✓ · supports ✓ · 0.92│                      │
│            │   [A]ccept [E]dit [R]eject         │  ┄ proposed  ─ live  │
│            │ ▸ ViT → CLIP  combines   ⚠ weak    │                      │
│            │ …                                  │                      │
│            │ [Send back…]   [Approve & publish] │                      │
└────────────┴───────────────────────────────────┴──────────────────────┘
```

| Feature | Spec | Acceptance |
|---|---|---|
| Queue | `useWorkflowInstances` filtered to stage `curation`. Flagged first, then oldest | Updates live when the pipeline moves a paper into curation |
| Edge cards | `useDocuments` for draft `influence` where `to == subject`. `useEditDocument` for inline edits and for `reviewDecision` | Accept/Reject is reflected immediately (optimistic) |
| Evidence highlight | Quote highlighted inside `sourceText`, scrolled into view. If not found, shows "quote not found" in red | |
| Workflow actions | `useWorkflowSession` → fire `approve` / `send-back` (note param). Buttons disabled, with the engine's insight text as tooltip, while the engine says no | "Approve" is disabled while any edge is still `proposed` (enforced in the UI and in the `publish-bundle` handler) |
| Live collaboration | Two curators see each other's accept/reject in real time | Demo with two windows |
| Shortcuts | `J/K` move · `A` accept · `R` reject · `E` edit · `⌘↵` approve · `?` help | |
| Deploy | `sanity deploy` from `desk` → appears in the Sanity Dashboard | |

### 6.3 Public site (`web`)

| Route | Content | Sanity features |
|---|---|---|
| `/` | Hero ("Every idea has ancestors"), full lineage graph, concept filter chips, featured storyline card, leaderboard | Live Content API, GROQ projections |
| `/paper/[slug]` | See F2 | Image pipeline (hotspot, LQIP), Visual Editing |
| `/concept/[slug]` | Concept trail: originators → carriers, as a timeline | `references()` |
| `/story/[slug]` | Scrollytelling (F3) | Portable Text with custom annotations, Visual Editing |
| `/connect` | Path finder (F4) | client BFS over GRAPH_QUERY |
| `/pipeline` | Live workflow board (F7) | Reads the public `workflows` dataset |
| `/suggest` | Suggest a paper (arXiv ID) | Server action with a write token, rate-limited |
| `/about` | How it's built, Sanity features used, link to the DEV post | |

**Visual design**
- Feels like an academic reading room in a modern UI: warm paper-white background (`#FBF8F3`) with ink text. Dark mode is "chalkboard" (`#14161A`).
- Type: **Newsreader** (serif) for headings and story text, **Inter** for UI, **JetBrains Mono** for arXiv IDs and metrics.
- Relation colours (as tokens, checked for contrast in both themes): extends = indigo, applies-to-new-domain = teal, combines = amber, simplifies = green, replaces = red, challenges = magenta, benchmarks-against = slate (dashed).
- Graph: React Flow with ELK `layered`, x-axis = year (with a visible year ruler), nodes are compact "paper cards" (title, year, org logo). Edges animate in when they arrive through Live.
- Motion: edges draw in on story steps and new live edges pulse once. Honours `prefers-reduced-motion`.
- Mobile: the graph becomes a vertical timeline list with expandable "Built on / Led to". 16 px gutters, no horizontal scroll.
- Accessibility: every graph has a text/list equivalent, edges are keyboard-focusable, and colour is never the only way relations are shown (each also has an icon and label).

---

## 7. Workflow `paper-intake` (`workflows/paper-intake.ts`)

Fields: `subject` (paper, input, required), `revisionNote` (string), `curatedBy` (actor), `decision` (string), `flagged` (boolean), `enrichProgress` (progress).

| Stage | Activity → actions | Effects (handlers) | Transition |
|---|---|---|---|
| `fetching` | `fetch` → `run` (auto, `when: 'true'`), `fetched` (when effect done), `fetch-failed` | `fetch-arxiv` | → `enriching` when all done |
| `enriching` | `enrich` → `run` (auto), `enriched`, `enrich-failed` | `ai-enrich`, `ai-edges` (bindings: subject, revisionNote) | → `checks` |
| `checks` | `check` → `run` (auto), `checked` | `verify-evidence` (output `flagged: boolean`) | → `curation` (always). Sets `flagged` |
| `curation` | `review` → **`approve`** (human, sets `decision`, `curatedBy` = actor) · **`send-back`** (human, param `note` required → `revisionNote`) | — | `approve` → `publishing`; `send-back` → `enriching` |
| `publishing` | `publish` → `run` (auto), `published`, `publish-failed` | `publish-bundle` | → `published` |
| `published` | terminal | — | — |

Failures: a `*-failed` action stops the instance in its current stage. `/pipeline` and the Desk show it in red with a **Retry** action that re-queues the effect.

### Effect handler contracts (`workflows/effect-handlers/`)

| Handler | Input | Behaviour | Idempotency |
|---|---|---|---|
| `fetch-arxiv` | subject id | arXiv API (`export.arxiv.org/api/query?id_list=`) → title, authors, abstract, date. `arxiv.org/html/{id}` → intro and related-work text (≤ 20k chars), falling back to the abstract. Upserts `author` docs by slug. Patches the paper draft | Patch is deterministic |
| `ai-enrich` | subject, revisionNote | Agent Action `generate`, `target: {include: ['summary','insights','introduces','uses','proposedConcepts']}`. `instructionParams`: `sourceText` (field), `concepts` (groq: all concepts), `note` | Re-running overwrites the same fields |
| `ai-edges` | subject, revisionNote | Agent Action `generate` creating `influence` **drafts** (`provenance.origin='ai'`, `reviewDecision='proposed'`). `instructionParams.papers` = groq list of existing papers (id, title, year, abstract snippet). Instruction requires the quote to be **verbatim** from `sourceText`. At most 6 edges | Deterministic `_id`s `influence.{from}.{to}.{relation}`. Re-runs replace |
| `verify-evidence` | subject | For each proposed edge: `quoteFound` = normalised substring check; `supportVerdict` = Agent Action `prompt` (JSON output). `flagged` = any edge not found or not `supports` | Overwrites `provenance.checks` |
| `publish-bundle` | subject | Refuses if any edge is still `proposed`. One transaction: publish the paper draft and accepted edges, delete drafts of rejected edges | Transaction-safe |

**AI credit budget:** ≤ 4 Agent Action calls per run (enrich, edges, plus prompt checks batched into 1–2 calls).

---

## 8. Seed data (`scripts/seed.mjs`), done

The 9-paper hand list was replaced by the harvested BLIP-2 lineage (see BUILD_LOG Session 2). `node scripts/seed.mjs` writes `data/seed/production.ndjson` (1,950 documents), imported with `sanity dataset import --replace`. All links are seeded **published** with `reviewDecision: "proposed"` (facts public, interpretation hidden until accepted). The Knowledge Base package comes from `scripts/kb-fetch.sh` + `scripts/kb-build.mjs`. Setup steps: [CONTEXT_SETUP.md](CONTEXT_SETUP.md).

---

## 9. Milestones and cut lines

| # | Milestone | Status / done when | Est. |
|---|---|---|---|
| M0 | Scaffold | ✅ Studio + Next.js scaffolded, 2 datasets, CORS | done |
| M1 | Content model + seed | ✅ schemas + `concept.buildsOn` deployed; 1,950 docs seeded; 38 concepts with curated idea chains (52 pairs, date-checked); custom inputs (arXiv ID, evidence picker, relation picker); views (Lineage, Source, In context, Evolution); Accept/Reject actions; origin + review badges; hosted Studio at paper-lineage.sanity.studio | done |
| M1b | Context | ⏳ curator creates KB + 2 MCP endpoints ([CONTEXT_SETUP](CONTEXT_SETUP.md)); smoke test passes | 0.5 h |
| M2 | Ask + site core | `/` Ask with /api/ask (Context A + B) and the **display tools** (DESIGN_SPEC §5.6), Upstash rate limits, side panel; `/paper`, `/concept`, Explorer with the 30-paper budget; `/suggest`; system pages; Live Content API | 7 h |
| M3 | Lineage Desk | Review (batched accept/publish, triage) + Inbox (gap actions) + Composer (basic, live cursors are a stretch); deployed to Dashboard | 5 h |
| M4 | Pipeline | Functions (question-to-gap, refresh-stats, start-intake) + paper-intake workflow on 1 new paper | 4 h |
| M5 | Story + Visual Editing | Storyline page, Presentation tool, Composer (stretch) | 2 h |
| M6 | Polish + submission | Mobile, a11y, demo video, DEV post(s) from BUILD_LOG | 3 h |

**Cut order** if behind (Map view, dark mode and key figures are already out per DESIGN_SPEC D1–D3): Composer live cursors → `/connect` → Studio Data-health tool → full intake workflow (keep `question-to-gap`).
**Never cut:** Ask on Context with the data contract, facts vs interpretation, the Desk Review + Question Inbox, the deployed site, BUILD_LOG.

---

## 10. Build log and write-up plan

`docs/BUILD_LOG.md` is updated **during** the build, not reconstructed afterwards. Each entry records: the goal, the prompt (exact text), what the AI produced, what was wrong, how it was fixed, and time spent. The Claude Code session is exported and uploaded at dev.to/agent_sessions/new.

The DEV post follows the challenge template: *What I Built · Demo · Code · My Build Process* (AI tool, good prompts, failed prompts, where the model got stuck, course corrections, App SDK and Workflows details) *· Sanity Project Details* (project ID + public dataset URL) *· Agent Session*.

---

## 11. Open questions (decide during M0)

1. Next.js vs Astro: **Next.js** (best `next-sanity` Live and Visual Editing support).
2. One shared dataset or a separate `workflows` dataset: **separate** (cleaner content queries, and the `/pipeline` page reads it directly).
3. Exact Workflows package version to pin: the latest at scaffold time (≥ 0.33.0); Studio ≥ 6.15.
4. Agent Actions `generate` create-document semantics for `ai-edges`: confirm the API shape in the docs during M3. Fallback: `prompt` returns JSON, and the handler creates drafts with `@sanity/client`.
5. Domain: default `*.vercel.app` unless a custom domain is available.

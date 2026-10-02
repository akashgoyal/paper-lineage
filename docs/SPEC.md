# Paper Lineage — Product & Technical Spec

Status: **Draft v1** · 2026-10-02 · Submission deadline **2026-10-04 23:59 PDT**
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

### F5. Add a paper (curator or visitor)
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

## 4. Content model

All types live in `apps/studio/schemaTypes/`. ⭐ marks the design decisions to highlight in the write-up.

### 4.1 `paper` (document)

| Field | Type | Rules / notes |
|---|---|---|
| `title` | string | required |
| `slug` | slug | from title, required |
| `arxivId` | string | ⭐ custom input normalises URLs and versions. Regex `^\d{4}\.\d{4,5}$`. **Unique** (async validation) |
| `publishedAt` | date | required |
| `authors` | array → `author` | ordered |
| `venue` | string | e.g. "NeurIPS 2017" |
| `summary` | string | max 200, one plain-English line |
| `abstract` | text | from arXiv |
| `sourceText` | text | hidden in the form, read-only. Intro and related-work text used as AI evidence |
| `keyFigure` | image | hotspot on, `alt` required, `caption` |
| `introduces` | array → `concept` | ⭐ concepts this paper *originated* |
| `uses` | array → `concept` | validation: no overlap with `introduces` |
| `trainedOn` | array → `dataset` | |
| `results` | array of `result` | see 4.8 |
| `insights` | array of `insight` | max 1 per category (continues the paperflakes insight categories) |
| `proposedConcepts` | array of string | read-only. Concept names the AI found that don't exist yet. Curator promotes them with a single click |
| `enrichment` | object `{model, enrichedAt, revisionNote}` | read-only provenance |

Preview: `title · year`, with the key figure as media.

### 4.2 `influence` (document) ⭐ the edge

| Field | Type | Rules / notes |
|---|---|---|
| `from` | reference → `paper` | required |
| `to` | reference → `paper` | required. ⭐ async validation: `to.publishedAt >= from.publishedAt`, `to != from` |
| `relation` | string enum | `extends` · `applies-to-new-domain` · `combines` · `simplifies` · `replaces` · `challenges` · `benchmarks-against`, shown as a radio list with descriptions |
| `inherited` | array → `concept` | ⭐ reference **filter**: only concepts that `from` introduces or uses |
| `explanation` | text | required, max 280 |
| `evidence` | object `{quote: text, location: 'abstract' \| 'introduction' \| 'related-work' \| 'method'}` | |
| `provenance` | object | `origin: 'ai' \| 'curator'`, `confidence: number 0–1`, `checks: {quoteFound: boolean, supportVerdict: 'supports' \| 'weak' \| 'contradicts', note}`, `reviewDecision: 'proposed' \| 'accepted' \| 'rejected'` (⭐ independent of the workflow engine), `reviewedBy: string` |

⭐ Uniqueness: no second edge with the same `(from, to, relation)` (async validation).
Preview: `Transformer → ViT`, subtitle `applies-to-new-domain · self-attention`.

### 4.3 `concept`
`name` (required), `slug`, `aliases[]` (string), `category` enum (`architecture` · `objective` · `optimization` · `training-technique` · `data` · `evaluation`), `summary` (string, max 200), `color` (derived from category in code, not stored).
Introduced-by and used-by are **derived** with `references()` queries and never stored twice.

### 4.4 `dataset`
`name`, `slug`, `modality` enum (`text` · `image` · `image-text` · `audio` · `multimodal`), `size` (string, e.g. "1.2M images"), `url`.

### 4.5 `benchmark`
`name`, `dataset` → `dataset`, `metric` (string, e.g. "top-1 accuracy"), `unit` (`%`, `BLEU`, `FID`…), `higherIsBetter` (boolean). The last field lets the UI render "better/worse" arrows correctly. FID is lower-is-better, for example.

### 4.6 `author` / `organization`
`author`: `name`, `slug`, `affiliation` → `organization`.
`organization`: `name`, `slug`, `kind` (`industry-lab` · `university`), `logo` (image).

### 4.7 `storyline`
`title`, `slug`, `dek` (string), `cover` (image), `intro` (Portable Text), `steps[]` (object `{influence → influence, narrative: Portable Text}`), `featured` (boolean).
Portable Text includes custom **annotations** `paperMention` (→ paper) and `conceptMention` (→ concept). On the site these show as hover cards.

### 4.8 Objects
- `result`: `benchmark` → benchmark (required), `value` (number, required), `setting` enum (`zero-shot` · `few-shot` · `fine-tuned` · `linear-probe`), `note`.
- `insight`: `category` enum (`did-you-know` · `key-takeaway` · `contrarian` · `data-point`), `text` (max 280), `origin` (`ai` · `curator`).

### 4.9 `siteSettings` (singleton)
`heroTitle`, `heroDek`, `featuredStoryline` → storyline.

---

## 5. Key GROQ queries (`apps/web/sanity/queries.ts`)

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

### 6.1 Sanity Studio (`apps/studio`)

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

### 6.2 Lineage Desk: App SDK app (`apps/desk`)

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
| Deploy | `sanity deploy` from `apps/desk` → appears in the Sanity Dashboard | |

### 6.3 Public site (`apps/web`)

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

## 8. Seed data (`scripts/seed.ts`)

The 9 papers already curated in paperflakes: Transformer, BERT, ResNet, GAN, Adam, DDPM, GPT-3, ViT, CLIP. They come with hand-verified edges (`origin: 'curator'`), concepts, datasets (ImageNet, WebText, the CLIP WIT-400M dataset, CIFAR-10…), benchmarks, results, and one storyline, *"From Attention to CLIP"*. The seed spends **no AI credits** and makes the site useful from the start. New papers after that go through the AI pipeline. **Demo candidates**: GPT-2, Swin, Latent Diffusion (Stable Diffusion), LLaMA.

Draft edge list (checked against the papers before seeding):

| From → To | Relation | Inherited |
|---|---|---|
| Transformer → BERT | extends | self-attention, Transformer encoder |
| Transformer → GPT-3 | extends | Transformer decoder |
| Transformer → ViT | applies-to-new-domain | self-attention |
| ResNet → ViT | benchmarks-against | (ImageNet baseline; the hybrid variant uses ResNet features) |
| ViT → CLIP | combines | ViT image encoder |
| Transformer → CLIP | combines | Transformer text encoder |
| ResNet → DDPM | combines | residual blocks |
| Transformer → DDPM | combines | sinusoidal position embedding |
| GAN → DDPM | challenges | generative image modelling |
| Adam → Transformer | uses* | Adam optimiser |

\*Optimiser use is modelled as `combines` with an `optimization` concept, so we don't need a weaker extra relation type.

---

## 9. Milestones and cut lines

| # | Milestone | Done when | Est. |
|---|---|---|---|
| M0 | Scaffold | pnpm monorepo, Sanity project + 2 datasets, Studio runs locally, Next.js runs, TypeGen wired | 1.5 h |
| M1 | Content model + seed | All schemas, validation and previews done; seed loaded; structure tool; arXiv input | 3 h |
| M2 | Public site core | `/`, `/paper`, `/concept` with live graph on Vercel; Live Content API working | 5 h |
| M3 | Pipeline | Workflow deployed, Functions deployed, fetch → enrich → edges → checks working end to end on 1 new paper | 5 h |
| M4 | Lineage Desk | Queue, edge cards, accept/reject, approve/send-back deployed to Dashboard | 4 h |
| M5 | Story + Visual Editing + `/pipeline` | Storyline page, Presentation tool click-to-edit, live pipeline board | 3 h |
| M6 | Polish + submission | Mobile, dark mode, a11y pass, demo video, DEV post from BUILD_LOG | 3 h |

**Cut lines**, dropped in this order if we fall behind: `/connect` → `/suggest` → semantic search (stretch) → Studio Lineage view tab → scrollytelling animation (story becomes a static page) → Desk live graph preview.
**Never cut:** schema quality, the workflow with human approval, the App SDK Desk, the deployed site, BUILD_LOG.

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

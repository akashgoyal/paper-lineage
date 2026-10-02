# Paper Lineage: System Architecture (v2)

> **Every idea has ancestors.** Ask a question about AI papers and get an answer drawn from an
> evidence-backed family tree of 197 papers traced back from BLIP-2. Every link is a citation fact
> mined from the paper's full text, and it only gets a relation label once a curator accepts it.

Built for the [DEV × Sanity Challenge](https://dev.to/devteam/join-the-sanity-challenge-2500-in-prizes-for-five-winners-514m). Path Two (vibe-coded app), with both bonus areas (**Workflows**, **App SDK**). The Ask agent on **Sanity Context + Knowledge Base** also fits Path One.

v2 changes: chat-first front door (Ask), Sanity Context with two MCP endpoints (GROQ + Knowledge Base), facts vs interpretations, private visitor questions feeding a curation loop, and an explicit split of who uses what.

---

## 1. Principles

1. **The map and the territory.** The *dataset* is the map: which paper built on which, queried live with GROQ. The *Knowledge Base* is the territory: what the papers actually say. An answer never mixes them up (§5).
2. **Facts are public; interpretations are earned.** A link's citation facts (count, section, sentences) are always shown. Its relation label appears only after a curator accepts it.
3. **Visitors ask; curators decide.** End users only use the website. Sanity Studio and the Lineage Desk are tools for the builders and curators (§3).
4. **Questions drive curation.** A weak answer becomes a `gap` the curators work through, and the next visitor gets a better answer.
5. **Free plan only.** Everything below runs on Sanity's Free plan (§9).

---

## 2. System diagram

**Legend:** what each box is.

| Colour | Meaning |
|---|---|
| 🟥 **Sanity: provided** | A managed Sanity product we configure but don't write (Content Lake, Context MCP, Knowledge Base, Live API, Agent Actions, Functions runtime, Dashboard) |
| 🟧 **Ours: runs on Sanity** | Our code or configuration, executed or hosted by Sanity (schema, Studio customisations, App SDK app, Function handlers, workflow definition, MCP instructions, Knowledge Base sources) |
| 🟦 **Ours: runs elsewhere** | Our code outside Sanity (Next.js site on Vercel, the Ask agent route, data-prep scripts on a laptop) |
| ⬜ **Third party** | External services we call (Anthropic Claude, arXiv / ar5iv, OpenAlex, Vercel hosting) |

```mermaid
flowchart LR
  %% ---------- people ----------
  V(["Visitor / judge"])
  C(["Curator (project Administrator)"])

  %% ---------- ours, elsewhere ----------
  subgraph WEB["Next.js on Vercel"]
    direction TB
    ASK["Ask page<br/>chat UI + cards"]
    PAGES["Explore · Paper · Concept<br/>Story · Pipeline pages"]
    AGENT["/api/ask route<br/>agent loop (Vercel AI SDK)<br/>+ card queries + rate limit"]
    SUGGEST["Suggest-a-paper<br/>server action"]
  end

  subgraph PREP["Data prep (laptop, run once)"]
    direction TB
    HARVEST["harvest.mjs<br/>full-text citation mining"]
    CURATE["curate.mjs<br/>relations · concepts · overrides"]
    SEED["seed.mjs + kb-build.mjs<br/>NDJSON + KB zip"]
  end

  %% ---------- third party ----------
  CLAUDE["Anthropic Claude API<br/>(chat model)"]
  ARXIV["arXiv API · ar5iv HTML · PDFs<br/>OpenAlex title lookup"]

  %% ---------- Sanity ----------
  subgraph SAN["Sanity platform (Free plan)"]
    direction TB
    subgraph LAKE["Content Lake"]
      PROD[("production dataset<br/>paper · influence · concept<br/>storyline · datasetStats")]
      PRIV[("private id paths<br/>paperText.* · questions.*")]
      WFDS[("workflows dataset")]
    end
    LIVE["Live Content API + CDN<br/>image pipeline"]
    CTXG["Context MCP endpoint A<br/>paper-lineage-graph<br/>(GROQ mode)"]
    CTXK["Context MCP endpoint B<br/>paper-lineage-papers<br/>(Knowledge Base mode)"]
    KB[["Knowledge Base<br/>40 papers + glossary"]]
    AA["Agent Actions<br/>generate · prompt · patch"]
    FNRT["Functions runtime"]
    WFE["Workflow engine<br/>(library)"]
    DASH["Dashboard"]
    STUDIO_RT["Studio hosting<br/>Presentation tool"]

    SCHEMA["Schema + validation<br/>facts vs interpretation"]
    STUDIOX["Studio customisations<br/>structure · evidence picker<br/>views · actions · badges"]
    DESK["Lineage Desk (App SDK)<br/>Review · Question Inbox<br/>Storyline Composer"]
    FNS["Function handlers<br/>start-intake · drain-effects<br/>question-to-gap · refresh-stats"]
    WFDEF["paper-intake<br/>workflow definition"]
    CTXCFG["MCP instructions<br/>groqFilter · KB purpose"]
  end

  %% ---------- flows ----------
  V --> ASK & PAGES
  V --> SUGGEST
  ASK --> AGENT
  AGENT <--> CLAUDE
  AGENT -->|tools| CTXG & CTXK
  AGENT -->|card queries| LIVE
  AGENT -->|save question| PRIV
  PAGES --> LIVE
  SUGGEST -->|create paper| PROD
  CTXG --> PROD
  CTXK --> KB
  LIVE --> PROD

  C --> STUDIO_RT --> STUDIOX
  C --> DASH --> DESK
  STUDIOX --> PROD
  DESK -->|accept / reject<br/>batched actions| PROD
  DESK --> WFE

  PROD -->|document events| FNRT --> FNS
  PRIV -->|question saved| FNRT
  FNS --> WFE
  WFE --> WFDS
  FNS --> AA --> PROD
  FNS --> ARXIV
  WFDEF -.-> WFE
  SCHEMA -.-> PROD
  CTXCFG -.-> CTXG & CTXK

  HARVEST --> ARXIV
  HARVEST --> CURATE --> SEED
  SEED -->|dataset import| PROD
  SEED -->|zip upload| KB
  PROD -.->|optional dataset source| KB

  %% ---------- styles ----------
  classDef sanity fill:#FDE3E0,stroke:#E0402F,color:#3B0D08,stroke-width:1.5px;
  classDef ours_on_sanity fill:#FFF0D2,stroke:#B45309,color:#3D2302,stroke-width:1.5px;
  classDef ours fill:#E3EAFE,stroke:#3446C4,color:#121A4A,stroke-width:1.5px;
  classDef third fill:#F1F1F1,stroke:#6B7280,color:#1F2937,stroke-dasharray:4 3;
  classDef person fill:#FFFFFF,stroke:#17191E,color:#17191E;

  class PROD,PRIV,WFDS,LIVE,CTXG,CTXK,KB,AA,FNRT,WFE,DASH,STUDIO_RT sanity;
  class SCHEMA,STUDIOX,DESK,FNS,WFDEF,CTXCFG ours_on_sanity;
  class ASK,PAGES,AGENT,SUGGEST,HARVEST,CURATE,SEED ours;
  class CLAUDE,ARXIV third;
  class V,C person;
```

### Component inventory

| Component | Kind | What it does | Built with |
|---|---|---|---|
| Content Lake `production` | 🟥 Sanity | Papers, links, concepts, storylines, stats | Documents, references, GROQ |
| Private id paths `paperText.*`, `questions.*` | 🟥 Sanity | Full texts and visitor questions, not readable by public queries | Document id paths (verified: public `count(*[_type=="paperText"]) == 0`) |
| Content Lake `workflows` | 🟥 Sanity | Workflow definitions and instances | Second Free-plan dataset |
| Live Content API + CDN | 🟥 Sanity | Site reads; approvals appear without reload | `next-sanity` `defineLive` |
| Context MCP **A: graph** | 🟥 Sanity, 🟧 our config | GROQ access to the lineage for the agent | Dataset source, `groqFilter`, instructions |
| Context MCP **B: papers** | 🟥 Sanity, 🟧 our config | Knowledge Base access for "how does it work" | Knowledge Base source, instructions |
| Knowledge Base | 🟥 Sanity, 🟧 our sources | Prebuilt, cited entries from 40 papers; conflicting claims flagged as issues | File source (zip), optional dataset source |
| Agent Actions | 🟥 Sanity | Summaries, explanations, evidence checks, Desk "Rewrite" | `client.agent.action.*`, `useAgentPatch` |
| Functions runtime | 🟥 Sanity | Runs our handlers on document events and a daily schedule | Blueprints |
| Workflow engine | 🟥 Sanity library | Stages, actions and effects of `paper-intake` | `@sanity/workflow-engine` (early access) |
| Schema | 🟧 ours on Sanity | Facts / interpretation groups, validation, reference filters | `defineType` (deployed with `sanity schema deploy`) |
| Studio customisations | 🟧 ours on Sanity | Curator editing (§3) | Structure builder, custom inputs, views, actions |
| Lineage Desk | 🟧 ours on Sanity | Fast work across many documents (§3) | App SDK, Sanity UI, Workflows SDK |
| Function handlers | 🟧 ours on Sanity | Intake, effect draining, question → gap, stats | `@sanity/functions` |
| Next.js site | 🟦 ours | Ask + browse pages for visitors | Next.js, React Flow, TypeGen |
| `/api/ask` agent route | 🟦 ours | Agent loop, card queries, question logging, rate limit | Vercel AI SDK + `@ai-sdk/mcp` |
| Data prep scripts | 🟦 ours | Harvest → curate → seed → KB zip | Node, ar5iv HTML, `pdftotext` |
| Claude | ⬜ third party | The chat model | Anthropic API |
| arXiv / ar5iv / OpenAlex | ⬜ third party | Metadata, full text, title → ID lookups | Public APIs |

---

## 3. Audiences and access

| Who | Uses | Sanity access | Notes |
|---|---|---|---|
| **Visitor** | Website only: Ask, browse, suggest a paper | None | Writes (questions, suggestions) go through the site's server token |
| **Judge** | Website; optionally the hosted Studio, read-only | Invited as **Viewer** (free, unlimited) | Can see schema, structure and inputs, but not edit |
| **Curator** | Studio + Lineage Desk | **Administrator** (the only role that can write on Free) | Small trusted team, because Administrators also control project settings |
| **Builder** | Everything + CLI | Administrator / organization admin | Deploys schema, Studio, Desk, Functions, workflows |

| Credential | Lives in | Permission |
|---|---|---|
| Organization token (Context Viewer) | `web/.env.local` on the server | Read through Context MCP only |
| Project write token (narrow) | `web/.env.local` on the server | Create `question` and suggested `paper` documents |
| Robot token | Functions Blueprint | Workflow + content writes for handlers |
| Anthropic API key | `web/.env.local` on the server | Chat model |

Studio, Desk and Context are **builder and curator tools**. The website is the only end-user surface.

---

## 4. Main flows

### 4.1 Ask (end user)

```mermaid
sequenceDiagram
  autonumber
  actor V as Visitor
  participant S as Ask page (Next.js) 🟦
  participant R as /api/ask route 🟦
  participant M as Claude ⬜
  participant G as Context MCP: graph 🟥
  participant K as Context MCP: papers (KB) 🟥
  participant L as Content Lake 🟥

  V->>S: "How does BLIP-2's Q-Former differ from Flamingo's resampler?"
  S->>R: question + conversation
  R->>M: system prompt (data contract) + tools from G and K
  M->>G: groq_query: concepts, chain, Flamingo→BLIP-2 link
  G-->>M: docs with _ids (link: cited 5×, unreviewed)
  M->>K: knowledge_base_read: blip2/q-former, flamingo/resampler
  K-->>M: entries with citations to paper sections
  M-->>R: answer text + cited _ids + KB entry refs
  R->>L: card queries by _id (paper cards, chain, status chips)
  R->>L: save questions.<uuid> (outcome, cited ids)
  R-->>S: stream answer + cards
  S-->>V: chain card 🟥data · quote blocks from papers · follow-up chips
```

### 4.2 Curation loop (curator)

```
question saved (outcome partial / unanswered)
   → Function question-to-gap 🟧 → gap document
   → Lineage Desk 🟧 Question Inbox: accept links · add missing paper · write storyline
   → paper created → Function start-intake 🟧 → Workflow paper-intake 🟥/🟧
        fetching → enriching (Agent Actions 🟥) → checks → curation (human) → publishing
   → Live Content API 🟥 updates the site; the next Knowledge Base refresh picks up curated text
```

### 4.3 Paper intake workflow

| Stage | Moved by | Work |
|---|---|---|
| fetching | Function effect | arXiv metadata + full text → `paper` + `paperText.*` |
| enriching | Function effect | Agent Actions: summary, concepts used, proposed links (drafts) |
| checks | Function effect | Quote found in full text? Agent Action `prompt`: does the quote support the relation? |
| curation | **Curator** (Desk / Studio Workflows view) | Accept / reject each link, then **Approve** or **Send back** with a note |
| publishing | Function effect | Publish paper + accepted links in one transaction |

Human curation is never skipped, because lineage links are claims about history. The checks only set review priority.

---

## 5. Data contract for Ask: GROQ vs Knowledge Base

**Rule: GROQ answers *who / when / which / how many / verified?*; the Knowledge Base answers *how / why / what results*.**

| Data | GROQ (endpoint A) | Knowledge Base (endpoint B) |
|---|---|---|
| Paper metadata, dates, kinds | ✅ | — |
| Link citation facts (count, section, sentences) | ✅ | — |
| Link relation / inherited concepts / explanation | ✅ only if `accepted` | — |
| Review status, counts, rankings | ✅ | — |
| Concept tree (theme → concept, introduced by, used by) | ✅ | glossary only (vocabulary) |
| Storylines | ✅ structure | ✅ narrative (dataset source, once storylines exist) |
| Full text of 40 core papers | — (`paperText` filtered out) | ✅ |
| Visitor questions, gaps, drafts | ❌ | ❌ |

**Answer rules** (system prompt + enforced in rendering):
1. Structural claims cite a GROQ `_id`, and the UI draws them as cards and chips from that id.
2. Content claims cite a Knowledge Base entry and its paper and section. The UI draws them as quote blocks labelled "From the paper".
3. The Knowledge Base never creates links. A mention with no matching link becomes a `missing-link` gap.
4. Unreviewed links are stated as "cites n×", never with a relation.
5. If they disagree, GROQ (live) beats the Knowledge Base (last build).
6. If neither covers the question, the answer says so and a gap is logged.

---

## 6. Content model (deployed)

| Type | Id pattern | Public? | Key design |
|---|---|---|---|
| `paper` | `paper-<arxiv>` | ✅ | `uses[]` → concept. *Introduced* concepts are derived from `concept.introducedBy` (stored once) |
| `paperText` | `paperText.<arxiv>` | ❌ private path | Full text by section; kept out of `paper` so neither public queries nor the agent pull it |
| `influence` | `influence-<from>-<to>` | ✅ | Groups **Fact** (read-only `citation{…contexts[_key]}`), **Interpretation** (`relation`, `inherited`, `explanation`, `evidenceKey` → a context `_key`) and **Review** (`provenance`). Validation: time order, no self-link, no duplicates, accepted ⇒ has relation |
| `concept` | `concept-<slug>` | ✅ | `level` theme/concept, `broader` → theme (filtered), `introducedBy` → paper |
| `storyline` | free | ✅ | Steps reference **accepted** links only (reference filter). Portable Text with paper / concept / link annotations |
| `question` | `questions.<uuid>` | ❌ private path | Outcome, endpoints used, weak refs to cited papers and links, `gap` |
| `gap` | free | ✅ (curator data) | `missing-link · missing-paper · unanswered · weak-evidence`, status |
| `datasetStats`, `siteSettings` | singletons | ✅ | Stats refreshed by Function; example prompts, start papers |

Seeded: 197 papers, 197 full texts, 1,349 links (1,127 with a keyed evidence sentence), 25 themes + 180 concepts, 2 singletons.

---

## 7. Data pipeline (one-time, 🟦 ours)

```
arXiv metadata ⬜ ─┐
ar5iv HTML / PDF ⬜ ┼─▶ harvest.mjs ─▶ data/raw/graph.json   (229 papers, 2,684 citations)
OpenAlex lookup ⬜ ─┘        │
                             ▼
              curate.mjs + overrides.json + concepts.json
                             ▼
              data/curated/* (197 papers, 1,349 links, 205 concepts)
                  │                                  │
                  ▼                                  ▼
          seed.mjs → production.ndjson        kb-fetch.sh + kb-build.mjs
                  │ sanity dataset import           │ upload in Context app
                  ▼                                  ▼
          Content Lake 🟥                     Knowledge Base 🟥
```

---

## 8. Repository layout

```
paper-lineage/
├── web/                     🟦 Next.js site + /api/ask (Vercel)
├── studio/                  🟧 Sanity Studio: schemaTypes/, structure.ts
├── desk/                    🟧 Lineage Desk (App SDK)
├── workflows/               🟧 paper-intake definition + effect handlers
├── functions/               🟧 Function handlers
├── scripts/                 🟦 harvest, curate, seed, kb-fetch, kb-build, context-smoke
├── data/
│   ├── raw/graph.json       harvested citation graph (HTML/PDF caches git-ignored)
│   ├── curated/             papers, influences, concepts, overrides
│   ├── seed/                production.ndjson
│   └── kb/                  manifest + glossary (PDFs and zip git-ignored)
└── docs/                    ARCHITECTURE · SPEC · UX_REVIEW · CONTEXT_SETUP · BUILD_LOG
```

---

## 9. Free-plan feature map

| Used | Free allowance | Where |
|---|---|---|
| Content Lake, GROQ, references, validation | 10k docs (we use ~1,950), 250k API / 1M CDN req/mo | everywhere |
| 2 public datasets + private id paths | 2 | `production`, `workflows`; `paperText.*`, `questions.*` |
| Hosted Studio, Presentation, Visual Editing | included | curators |
| Live Content API | 1,000 connections / dataset | site |
| **Sanity Context** (MCP, GROQ mode) | included ("Agent Actions and Context") | Ask endpoint A |
| **Knowledge Bases** (beta, Labs) | plan-capped count / sources; limits may change | Ask endpoint B |
| Agent Actions | 1,000 AI credits / mo | intake, Rewrite, checks |
| Functions | 500k invocations, scheduled daily minimum | runtime |
| App SDK + Dashboard | included | Lineage Desk |
| Workflows (early access) | library on our datasets + Functions | intake |
| Not on Free → replaced | Comments, Tasks, Releases, custom roles, private datasets | send-back notes · one-transaction publish · trusted Admins · private id paths |

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Knowledge Base beta limits (the challenge post says 150 documents) | 40 PDFs + 2 files in one zip; the dataset source is optional |
| Knowledge Base build cost in AI credits | One build first; watch usage before adding the dataset source |
| Context needs an organization token | Server-only env var, Context Viewer (least privilege) |
| Chat cost / abuse on a public site | Rate limit per IP, short context, questions capped in length |
| Workflows early access (0.x) | Pinned versions; `provenance.reviewDecision` works without the engine |
| Wrong mined relations | Hidden until accepted; the Desk shows quotes and checks |
| Judges can't log in | Viewer invites, demo video, `/pipeline` |

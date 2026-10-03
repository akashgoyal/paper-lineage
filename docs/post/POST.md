---
title: Paper Lineage: every AI idea has ancestors (built on Sanity Context, Knowledge Bases, App SDK and Workflows)
tags: sanitychallenge, devchallenge, ai, nextjs
---

# Paper Lineage: every AI idea has ancestors

## What I Built

### A known problem

Ask an AI tool "where did BLIP-2's Q-Former come from?" and you get a confident paragraph: *"it extends Flamingo's resampler…"*. Citation graphs can tell you **that** one paper cites another, but not **how** it built on it. Language models fill that gap with plausible verbs. In a literature review, a plausible verb is often a wrong one, and nothing tells you which.

### What I built

**Paper Lineage** is an evidence-backed family tree of 197 AI papers, traced three generations back from BLIP-2. It keeps two kinds of claim apart:
- a **fact**: "BLIP-2 cites Flamingo 5 times, here are the sentences", mined from the paper's full text
- an **interpretation**: "BLIP-2 *extends* BLIP", shown only after a curator has accepted it

> **Bahdanau attention (2014) → Transformer (2017) → Set Transformer (2018) → Perceiver (2021) → Flamingo (2022) → BLIP-2 (2023)**
> Perceiver: *"Most closely related to our work is the Set Transformer."*
> Flamingo: *"…a Perceiver-based architecture that can produce a small fixed number of visual tokens…"*
>
> The Q-Former's ancestry as Paper Lineage shows it. Every hop is a citation, with the sentence the later paper used.

### Architecture

![Architecture: our code on the left, the Sanity platform (everything in red) on the right](diagrams/architecture.png)

*Everything in solid red is a Sanity feature. Peach: our apps built on Sanity. Blue: our code. Grey: third party.*

Three paths go through it:
1. **A visitor asks:** the Next.js site → our `/api/ask` agent → **Sanity Context MCP** (GROQ over the graph, plus the **Knowledge Base**) → every card re-read from the **Content Lake**.
2. **A curator reviews:** the **Lineage Desk (App SDK)** accepts a link → **Content Lake** → **Live Content API** → the site shows the relation at once.
3. **A new paper arrives:** **Sanity Workflows** runs `paper-intake` (fetching → checks → curation → publishing); a small runner of ours executes each stage's effect.

### Six features, each on Sanity

| # | Feature | Sanity product | What it does here | Advantage |
|---|---|---|---|---|
| 1 | **Ask**: a chat that answers with evidence | **Sanity Context** (MCP, GROQ mode) | The agent writes GROQ against the lineage graph: who built on whom, when, how often cited, verified or not | Retrieval over *structured* data is hosted; no vector database or RAG pipeline to build |
| 2 | **Paper explanations** in Ask | **Sanity Knowledge Base** (Context MCP, Knowledge Base mode) | Answers "how does it work / why / what results" from 40 core papers (20 entries) | Upload the PDFs, Sanity builds the entries; built with the `sanity context` CLI in one command each |
| 3 | **The evidence graph** | **Sanity Content Lake** + GROQ + private id paths | Papers, citation links (fact and interpretation in separate fields), concepts with "builds-on" chains | One query walks a whole chain; full texts and visitor questions stay private on a public dataset |
| 4 | **Live verified labels** | **Sanity Live Content API** | A link a curator accepts appears on the site at once | No redeploy, no cache busting, no websocket code |
| 5 | **Lineage Desk**: curation | **Sanity App SDK** (+ **Agent Actions**) | Review links with the evidence beside them, triage what visitors couldn't get answered, compose stories | Real-time document hooks, accept-and-publish in one transaction with Undo, hosted in the Sanity Dashboard behind Sanity login |
| 6 | **Paper intake** | **Sanity Workflows** | New paper → fetch metadata → count links → curator approval → publish | The process is data; the **engine** refuses approval while any link is unreviewed, not the UI |

Plus **Sanity Studio** for schema-driven editing, with custom evidence and relation pickers.

### What Sanity saved me from building

A vector database and a RAG pipeline (Context + Knowledge Base). A login system for curators (the Dashboard). A websocket layer (Live Content API). A workflow engine (Workflows). An admin interface (Studio). All on the **free plan**.

## Demo

- **Live:** https://paper-lineage-xi.vercel.app
- **Video:** _(link)_. It follows this post's order: the problem, what I built, the architecture, the six features on Sanity, how Context is configured, one real question in real time, the features in the running app, then the same activity inside Sanity's dashboards.
- **Try asking:** "Where did BLIP-2's Q-Former come from?" · "What did CLIP build on?" · "How does the Q-Former use learnable queries?"
- **Status:** _N_ of 1,349 links verified so far. Curation is ongoing, and every unverified link shows as "cites ×n", by design.

## Code

https://github.com/akashgoyal/paper-lineage. The repo has `web/` (site + Ask agent), `studio/`, `desk/` (App SDK), `workflows/` (definition + runner) and `scripts/` (harvest → curate → seed). `docs/BUILD_LOG.md` is the full build log.

## How it runs, in real time

### Sanity Context: configured once, used on every question

![Sources, the Knowledge Base and two MCP endpoints configured once, then used by the agent on every question](diagrams/kb-mcp.png)

- **Configured once:** 42 files (40 core papers, a manifest, a concept glossary) go into a Knowledge Base with `sanity context create`, `imports create` and `build`, giving 20 entries. Two MCP endpoints serve Sanity Context: `paper-lineage-graph` in GROQ mode over the `production` dataset (with a `groqFilter` and instructions) and `paper-lineage-papers` in Knowledge Base mode. One endpoint serves one mode, hence two. A read-only organisation token authorises every call.
- **Used on every question:** `initial_context` from both is preloaded into the system prompt; the agent then calls `groq_query` and `knowledge_base_search` / `knowledge_base_read`, and every card is re-checked against the Content Lake.

### One real question, in real time

"Where did BLIP-2's Q-Former come from?" (one run, every call in order; long projections trimmed):

```text
→ groq_query          (Sanity Context · GROQ mode)
  *[_type=="paper" && shortName match "BLIP-2"]{_id, shortName, title, publishedAt}
→ groq_query          (Sanity Context · GROQ mode)
  *[_type=="concept" && name match "Q-Former"]{_id, name, summary,
    "by": introducedBy->{_id, shortName, publishedAt},
    "buildsOn": buildsOn[]->{name, "by": introducedBy->{_id, shortName, publishedAt}}}
→ knowledge_base_read (Sanity Context · Knowledge Base mode)
  {"knowledgeBase":"kbawj3190IH1","paths":["blip2"]}
→ groq_query          (Sanity Context · GROQ mode)
  *[_type=="influence" && to->shortName=="BLIP-2" && (from->shortName=="Flamingo" || from->shortName=="BLIP")]
    {_id, "from": from->{…}, "mentions": citation.mentions, "method": citation.methodMentions,
     "decision": provenance.reviewDecision, "relation": select(provenance.reviewDecision=="accepted" => relation)}
→ showChain × 2       (our server rebuilds each card from the Sanity Content Lake and checks it)
→ suggestFollowUps
```

![A visitor asks a question](diagrams/example-ask.png)

The answer: the Q-Former is BLIP-2's own module, built on two earlier ideas, Flamingo's Perceiver resampler and BLIP's encoder–decoder. The links show as "cites, not yet reviewed", because the GROQ above returns a relation only for accepted links. It took 3 model turns (4 Sanity lookups: 3 GROQ queries and 1 Knowledge Base read), 23 s and 0.6¢. The question is then saved to the Content Lake under a private id path. A weak answer becomes a `gap` that curators see in the Desk Inbox.

**The model never writes a card.** It passes ids to a display tool, and the server rebuilds the card from Sanity. Anything it can't verify goes back to the model as an error instead of reaching the visitor:
- an unknown id
- papers out of date order, or a chain with no link at some hop
- a quote that isn't word for word in its source
- a relation on an unreviewed link

### In the app

- **Every hop is a citation.** `/concept/q-former` shows the Q-Former's ancestry as a timeline: Bahdanau attention (2014) → Transformer → Set Transformer → Perceiver → Flamingo → BLIP-2 (2023), each step with its citing sentence and section.
- **Explore the family tree.** The Explore tab opens on the paper the last answer was about. Select a paper and its neighbourhood lights up in violet; select a link and the citing sentence appears as evidence.

### Curators: the Lineage Desk (App SDK → Content Lake → Live Content API)

![A curator verifies a link](diagrams/example-curation.png)

### New papers: Sanity Workflows

![A new paper goes through the paper-intake workflow](diagrams/example-intake.png)

### Where to see it inside Sanity

| What | Where | Screenshot |
|---|---|---|
| The Knowledge Base: 42 sources → 20 entries, 12 open issues | Sanity Dashboard → Context → Knowledge Bases → *Paper Lineage: papers* | _(screenshot)_ |
| The two MCP endpoints (GROQ mode with a `groqFilter`; Knowledge Base mode) | Sanity Dashboard → Context → MCP | _(screenshot)_ |
| Lineage Desk, reviewing BLIP-2's links | Sanity Dashboard → Lineage Desk | _(screenshot)_ |
| The `paper-intake` instance waiting in curation | Lineage Desk → Pipeline | _(screenshot)_ |

### The schema: where facts and interpretation live

```js
// influence-2201-12086-2301-12597: BLIP → BLIP-2 (real document, trimmed)
{
  from: {_ref: "paper-2201-12086"},          // BLIP
  to:   {_ref: "paper-2301-12597"},          // BLIP-2
  citation: {                                 // FACT: read-only, mined from BLIP-2's full text
    mentions: 9, methodMentions: 3,
    contexts: [ /* 4 sentences: Introduction, Related Work, Method ×2 */
      {_key: "c2", section: "Method",
       text: "Inspired by BLIP (Li et al. 2022), we jointly optimize three pre-training objectives…"} ]
  },
  evidenceKey: "c2",                          // INTERPRETATION: the sentence that best supports…
  relation: "extends",                        // …this relation. Public only once accepted.
  provenance: {origin: "harvest", suggestedRelation: "extends", confidence: 0.95, reviewDecision: "proposed"}
}
```

Public queries read interpretation only through `select(provenance.reviewDecision == "accepted" => relation)`, and a unit test fails if any query skips that gate.

## My Build Process

Two days (Oct 2–3) with **Claude Code**, from an empty folder to the deployed site, Studio, Desk, workflow and Knowledge Base. I wrote the prompts; Claude Code wrote the code and the docs. The full log is in [`docs/BUILD_LOG.md`](https://github.com/akashgoyal/paper-lineage/blob/main/docs/BUILD_LOG.md).

**Prompts that worked**
- *"create a new repo - start with system architecture - make most use of sanity features which are available in free version… Then create a spec before actual implementation."* Architecture and spec came first, so later prompts could be one line.
- *"Review the design spec. Is it complete… Can it be used for moving ahead with implementation"*: it found the chat had no way to choose cards, which led to the server-verified display tools.
- *"Can you do sanity checks with some API code - rather than login in claude browser?"*: every Studio and Desk query and write path is tested against the real dataset.

**Where I had to course-correct the model**
- *"If paper apis are not working… download the pdf & analyse it on your own."* Semantic Scholar returned 429 on every call. Reading full text instead gave a better signal: where and how often a paper is cited.
- *"In 205 papers, there are only 48 concepts."* The taxonomy became 25 themes and 180 concepts.
- *"The first page should be a chat-box."* The design had been browse-first.
- *"Highlight clearly in the block diagram the features used are from sanity or code."* That gave the red Sanity block in the diagrams.

**Where the model got it wrong, and how it was caught**
- **Sanity features that aren't on the free plan.** It planned Comments, Tasks and Releases, all paid-only. Caught when it checked Sanity's pricing page.
- **"Workflows" as a status field.** It first modelled Workflows as a status field. It's a real early-access engine, so the design was rebuilt around a deployed definition.
- **The Context and Knowledge Base setup.** The docs I had pointed to the Dashboard only, but the current CLI has `sanity context`. The Knowledge Base was created, imported (206 MB, 42 sources) and built from the terminal. The MCP endpoints still need the Dashboard; I created them there.
- **"Ancestors" newer than their descendants.** Data validation found 19 links where the earlier paper was published after the citing one (a later revision had cited newer work). Fixed in the pipeline; the 19 are still in production as unreviewed, for a curator to reject.
- **Browser reads failing on the live site.** Every browser-side Sanity read failed after deploy, because the domain wasn't in the project's CORS origins. It was caught by screenshotting the live site.
- **Choosing the chat model.** My credits were on Together AI, where Gemma isn't offered for tool calling. I tested the cheapest models through the real agent loop:
  - Qwen3.5-9B returned empty answers.
  - GLM-5.3-Flash kept searching and never answered.
  - gpt-oss-120b printed its reasoning as the answer.
  - **DeepSeek-V4-Flash worked, at about 1¢ per answer.**
- **Knowledge Base quotes kept failing the word-for-word check.** The entries are Sanity's *summaries* of the papers, not their words. Quotes from them are now captioned "Knowledge Base summary of BLIP-2".

**Cut:**
- AI-proposed links: links come from the full-text harvest.
- Sanity Functions: Free-plan schedules run daily, and hosted workflow runtimes aren't available yet, so a small runner drains the workflow's effects.
- A path-finder page.
- Live cursors in the story composer.

**Not verified by the agent:** clicking through the Desk and Studio, which need a Sanity login. Their queries and write paths were tested by scripts against the real dataset.

## Sanity Project Details

- **Project ID:** `jd22zcim`. Dataset `production` is public: [first five papers](https://jd22zcim.api.sanity.io/v2025-02-19/data/query/production?query=*[_type=="paper"][0...5]{shortName,publishedAt})
- **Context:** organisation `o2qzzix4g`; MCP endpoints `paper-lineage-graph` (GROQ mode) and `paper-lineage-papers` (Knowledge Base `kbawj3190IH1`)
- **Schema:** `paper`, `influence` (fact / interpretation / review), `concept` (theme → concept, `buildsOn`), `storyline`, `gap`, and private `paperText.*` and `questions.*`
- **Studio** (curators): https://paper-lineage.sanity.studio · **Desk:** an app in the Sanity Dashboard

## Agent Session

_(link to the exported Claude Code session, made public)_

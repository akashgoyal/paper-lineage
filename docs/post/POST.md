*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

**Paper Lineage** answers "where did this AI idea come from?" with a chain you can check. It's for anyone reading AI research who wants to know what a paper really built on: students, researchers, engineers doing a literature review.

**The strange part:** it's an AI chat that isn't allowed to say how one paper built on another until a human has signed off. The model can cite; only a curator can interpret.

**The problem.** Ask an AI tool "where did BLIP-2's Q-Former come from?" and you get a confident paragraph: *"it extends Flamingo's resampler…"*. Citation graphs say **that** one paper cites another, not **how** it built on it. Language models fill the gap with plausible verbs, and nothing tells you which verb is wrong.

**The app.** An evidence-backed family tree of 197 AI papers, traced three generations back from BLIP-2: 1,349 citation links and 205 concepts. It keeps two kinds of claim apart:
- a **fact**: "BLIP-2 cites Flamingo 5 times, here are the sentences", mined from the paper's full text
- an **interpretation**: "BLIP-2 *extends* BLIP", shown only after a curator has accepted it

> **Bahdanau attention (2014) → Transformer (2017) → Set Transformer (2018) → Perceiver (2021) → Flamingo (2022) → BLIP-2 (2023)**
> Perceiver: *"Most closely related to our work is the Set Transformer."*
> Flamingo: *"…a Perceiver-based architecture that can produce a small fixed number of visual tokens…"*
>
> The Q-Former's ancestry as Paper Lineage shows it. Every hop is a citation, with the sentence the later paper used.

### Architecture

![Architecture: our code on the left, the Sanity platform (everything in red) on the right](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/3bxymyzypts5e2fx21hb.png)

*Solid red: Sanity features. Peach: our apps built on Sanity. Blue: our code. Grey: third party.*

1. **A visitor asks:** the Next.js site → our `/api/ask` agent → **Sanity Context MCP** (GROQ over the graph, plus a **Knowledge Base**) → every card re-read from the **Content Lake**.
2. **A curator reviews:** the **Lineage Desk (App SDK)** accepts a link → **Content Lake** → **Live Content API** → the site shows the relation at once.
3. **A new paper arrives:** **Sanity Workflows** runs `paper-intake` (fetching → checks → curation → publishing).

### Six features, each built on Sanity

| Feature | Sanity product | Advantage |
|---|---|---|
| **Ask**: a chat that answers with evidence | **Sanity Context** (MCP, GROQ mode) | The agent writes GROQ over typed references; no vector database or RAG pipeline to build |
| **Paper explanations** in Ask | **Knowledge Base** (Context MCP, Knowledge Base mode) | 40 papers uploaded, Sanity builds and serves 20 entries |
| **The evidence graph** | **Content Lake** + GROQ + private id paths | One query walks a chain; full texts and visitor questions stay private on a public dataset |
| **Live verified labels** | **Live Content API** | An accepted link appears on the site at once: no redeploy, no websocket code |
| **Lineage Desk** for curators | **App SDK** (+ Agent Actions) | Real-time document hooks, accept-and-publish in one transaction, Sanity login |
| **Paper intake** | **Workflows** | The engine refuses approval while any link is unreviewed, not the UI |

Plus **Studio** for schema-driven editing. Everything runs on Sanity's **free plan**.

## Demo

**Live:** https://paper-lineage-xi.vercel.app

Try asking: "Where did BLIP-2's Q-Former come from?" · "What did CLIP build on?" · "How does the Q-Former use learnable queries?"

![Ask: the answer, a chain card that says "cites 9× · not yet reviewed", paper cards and a Knowledge Base quote](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/v7s704m69scv7dsjz8e8.png)
*Ask: one answer, four Sanity sources.*
- **Lead:** written from **Context MCP** (GROQ) results
- **Chain card:** **Context MCP** finds it, re-read from the **Content Lake**; "cites", as the link isn't reviewed yet
- **Paper cards:** **Content Lake** counts, never typed by the model
- **Quote:** **Knowledge Base**, checked word for word

![The Q-Former's concept page: a timeline from Bahdanau attention, each step with its citing sentence](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/edq4u207n3fzhc8ghi4t.png)
*The concept page: six steps back to 2014.*
- **Steps:** `concept` docs linked by `buildsOn` in the **Content Lake** (GROQ)
- **Quotes, "cited 5×":** citation facts mined from full text
- **"Not yet reviewed":** review status, set in the **Lineage Desk**

![Explore: BLIP-2's lineage in year columns, CLIP selected in violet with its links highlighted](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/asa0pdwi2fm25crl93py.png)
*Explore: BLIP-2's family tree, CLIP selected.*
- **Graph and counts:** `paper` and `influence` docs from the **Content Lake** (GROQ)
- **"Verified only":** curator decisions from the **Lineage Desk** (App SDK)

**Status:** _N_ of 1,349 links verified so far. Curation is ongoing; every unverified link shows as "cites ×n", by design.

## Code

https://github.com/akashgoyal/paper-lineage

`web/` (Next.js site + Ask agent) · `studio/` · `desk/` (App SDK) · `workflows/` (definition + runner) · `scripts/` (harvest → curate → seed). The full build log is [`docs/BUILD_LOG.md`](https://github.com/akashgoyal/paper-lineage/blob/main/docs/BUILD_LOG.md).

## My Build Process

Two days (Oct 2–3) in **Claude Code**, from an empty folder to the deployed site, Studio, Desk, workflow and Knowledge Base. I wrote the prompts; Claude Code wrote the code and docs.

**Prompts that worked**
- *"create a new repo - start with system architecture - make most use of sanity features which are available in free version… Then create a spec before actual implementation."* Architecture and spec came first, so later prompts could be one line.
- *"Can you do sanity checks with some API code - rather than login in claude browser?"*: every Studio and Desk query and write path is tested against the real dataset.
- *"I have enabled 'Context' in organization Labs page. I hope you can setup the Sanity KB with relevant pdfs & correct schema."* and then *"upload the Knowledge Base"*: it picked the 40 core papers, added a manifest and a concept glossary, and created, imported and built the Knowledge Base with the `sanity context` CLI. 42 sources became 20 entries without touching the Dashboard.
- *"Define a distinction on the data to be considered from KB & GROQ - when end user is using app"*: this became the data contract behind the two MCP endpoints. Who / when / how often / verified comes from GROQ over the graph; how it works / why / results comes from the Knowledge Base. Knowledge Base quotes are captioned as such.

**Where I had to course-correct**
- *"How do you plan to use : Sanity studio & App Sdk. The current data storage use seems very simple use of sanity"*: the first design used Sanity as a store. This prompt turned it into the Desk on the App SDK, custom Studio inputs (evidence and relation pickers), the Live Content API for verified labels, and Workflows for intake.
- *"So, that means Sanity Studio should be used while building app or managing it post deploy - not by end users. Also, how do you plan to use Sanity Knowledge Bases?"*: Studio and the Desk became curator-only, behind Sanity login, and the Knowledge Base got its job: explaining papers inside Ask.
- *"If paper apis are not working… download the pdf & analyse it on your own."* Semantic Scholar returned 429 on every call. Reading full text gave a better signal anyway: where and how often a paper is cited.
- *"In 205 papers, there are only 48 concepts."* The taxonomy became 25 themes and 180 concepts.
- *"The first page should be a chat-box."* The design had been browse-first.
- *"Highlight clearly in the block diagram the features used are from sanity or code."* That gave the red Sanity block in the diagrams.

**Where the model got it wrong, and how it was caught**
- **Paid-only features.** It planned Comments, Tasks and Releases. Caught when it checked Sanity's pricing page.
- **Where the MCP endpoints live.** After *"I did a 'npx sanity login' from the terminal… Don't see MCP endpoints in project page"*, it turned out Context is organisation-level: endpoints are made in Dashboard → Context, and the token is an organisation token, not a project one. The CLI can build a Knowledge Base but not an endpoint, so I created both endpoints there and it verified them with a smoke test that lists each endpoint's tools.
- **One endpoint for both sources.** A dataset and a Knowledge Base on the same endpoint looks simpler, but the dataset silently wins and the Knowledge Base is ignored. Hence two endpoints, one per mode.
- **"Ancestors" newer than their descendants.** Validation found 19 links where the earlier paper was published after the citing one (a later revision cited newer work). Fixed in the pipeline; the 19 remain as unreviewed, for a curator to reject.
- **Browser reads failing on the live site.** The domain wasn't in the project's CORS origins. Caught by screenshotting the deployed site.
- **The chat model.** My credits were on Together AI. I tested the cheapest models through the real agent loop: Qwen3.5-9B returned empty answers, GLM-5.3-Flash never stopped searching, gpt-oss-120b printed its reasoning as the answer. **DeepSeek-V4-Flash worked, at about 1¢ per answer.**
- **Model behaviour, fixed in code, not the prompt.** It narrated ("Let me show…"), rewrote its lead every turn, produced too many cards, and once drew a chain through a link that doesn't exist. Now there's a card budget, a narration filter, one final lead, and chains need a link at every hop.

### Reaching past the Studio

**Sanity Context and the Knowledge Base.** The docs I had pointed to the Dashboard, but the current CLI has `sanity context`: the Knowledge Base was created, imported (42 sources, 206 MB) and built from the terminal. The two MCP endpoints still needed the Dashboard. One surprise: Knowledge Base entries are Sanity's *summaries*, not the papers' words, so quotes from them kept failing my word-for-word check. They're now captioned "Knowledge Base summary of BLIP-2".

**App SDK: the Lineage Desk.** A curator reads the evidence beside each link and accepts or rejects it. That's one transaction with Undo, and the Live Content API updates the public site. The Desk also has an Inbox of questions visitors couldn't get answered, and a story composer that only uses accepted links. It's deployed into the Sanity Dashboard, so curators sign in with Sanity. Its "Write explanation" button is an **Agent Action** (`generate`, grounded in the citing sentence). A dry run against BLIP → BLIP-2 returned *"BLIP-2 extends BLIP by jointly optimizing three pre-training objectives that share the same input format and model parameters."* in 2.3 s.

![A curator verifies a link: Desk → Content Lake → Live Content API → site](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/o6v18ze0p303q6hghfwd.png)

**Workflows: paper intake.** The model first modelled "workflows" as a status field. Workflows is a real early-access engine, so the design was rebuilt around a deployed definition. The useful part: approval is gated **in the definition**. While any link into the paper is unreviewed, the engine refuses Approve, and the Desk shows the engine's own reason. Sanity Functions schedules run daily on the free plan and hosted workflow runtimes aren't available yet, so a small runner executes each stage's effect (arXiv fetch, link count, publish).

![paper-intake: fetching → checks → curation → publishing](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/4vvxyf5z7ae86xm0sg8a.png)

**Cut:** AI-proposed links (links come from the full-text harvest), a path-finder page, live cursors in the composer.

**Not verified by the agent:** clicking through the Desk and Studio, which need a Sanity login. Their queries and write paths were tested by scripts against the real dataset.

## Sanity Project Details

- **Project ID:** `jd22zcim`. Dataset `production` is public: [first five papers](https://jd22zcim.api.sanity.io/v2025-02-19/data/query/production?query=*[_type=="paper"][0...5]{shortName,publishedAt})
- **Schema:** `paper`, `influence` (fact / interpretation / review), `concept` (theme → concept, `buildsOn`), `storyline`, `gap`, plus private `paperText.*` and `questions.*`
- **Context:** organisation `o2qzzix4g`; MCP endpoints `paper-lineage-graph` (GROQ mode) and `paper-lineage-papers` (Knowledge Base `kbawj3190IH1`)
- **Studio** (curators): https://paper-lineage.sanity.studio · **Desk:** an App SDK app in the Sanity Dashboard

**Where facts and interpretation live.** One real `influence` document, trimmed:

```js
// BLIP → BLIP-2
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

**How Ask uses Sanity Context.**

![Sources, the Knowledge Base and two MCP endpoints configured once, then used by the agent on every question](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/jnb0st8pnee9qff9w0eq.png)

One real run of "Where did BLIP-2's Q-Former come from?", every call in order:

```text
→ groq_query          find BLIP-2
→ groq_query          concept "Q-Former" → introducedBy, buildsOn[] → introducedBy
→ knowledge_base_read entry "blip2"
→ groq_query          influence links into BLIP-2 from Flamingo and BLIP, with
                      "relation": select(provenance.reviewDecision=="accepted" => relation)
→ showChain × 2       our server rebuilds each card from the Content Lake and checks it
→ suggestFollowUps
```

3 model turns, 4 Sanity lookups, 23 s, 0.6¢. **The model never writes a card**: it passes ids, and the server rebuilds the card from Sanity, refusing unknown ids, papers out of date order, chains with a missing hop, inexact quotes and relations on unreviewed links. Each question is saved under a private id path, and a weak answer becomes a `gap` in the Desk Inbox.

## Agent Session

_(link to the exported Claude Code session, made public)_

# Sanity Context setup: Knowledge Base + two MCP endpoints

Everything in code is done: schema deployed, `production` seeded, Knowledge Base files built.
The Knowledge Base (step 1) is created, imported and built with `sanity context` (CLI). The other steps happen in the **Sanity Dashboard → Context app** and **Manage**.
Values are ready to paste.

Organization: `o2qzzix4g` · Project: `jd22zcim` · Dataset: `production`

Why two endpoints: one MCP serves one mode, and if a dataset source and a Knowledge Base source sit on the same endpoint, **the dataset wins and the Knowledge Base is silently ignored**. See the data contract in [ARCHITECTURE.md §5](ARCHITECTURE.md#5-data-contract-for-ask-groq-vs-knowledge-base).

---

## 0. Organization token (Manage)

Manage → organization `o2qzzix4g` → **API → Tokens** (organization level, not project) → new token with **Context Viewer**.
Put it in `web/.env.local` as `SANITY_ORGANIZATION_TOKEN=…`. Never commit it; it is server-side only.

## 1. Knowledge Base: "Paper Lineage: papers"

> **Done via CLI (2026-10-03):** `sanity context` now covers creating, importing and building, so step 1's create, upload and build ran from the terminal. Knowledge Base id: **`kbawj3190IH1`**.
>
> ```bash
> npx sanity context create --organization o2qzzix4g --title "Paper Lineage: papers" --description "<purpose below>"
> npx sanity context imports create kbawj3190IH1 --file ../data/kb/paper-lineage-kb.zip   # 42 sources (40 PDFs + 2 .md)
> npx sanity context build kbawj3190IH1 --watch
> npx sanity context get kbawj3190IH1 --json                                              # entries, issues
> ```
>
> Still in the Context app (no CLI command): the two **Instructions** below and reviewing **Issues**.

Dashboard → **Context** → **New knowledge base**

| Field | Value |
|---|---|
| Title | `Paper Lineage: papers` |
| Purpose | `Explain how vision-language ideas evolved from BLIP-2's ancestors: how each method works, why it was designed that way, and what results it reported, citing the papers themselves. For readers asking about mechanisms, motivations and results, not about which paper cites which.` |

**Add source → Files** → upload `data/kb/paper-lineage-kb.zip` (206 MB). The archive is expanded: 40 PDFs, `papers-manifest.md`, `concepts-glossary.md`.

*Optional second source → Dataset* (gives the refresh loop: curated text flows in on schedule):

```groq
*[_type == "concept"]{name, level, summary, aliases, "theme": broader->name, "introducedBy": introducedBy->shortName}
```

If the build refuses it over a document limit (the challenge post mentions 150), skip it: `concepts-glossary.md` in the zip covers the same vocabulary. Once storylines exist, switch the query to `*[_type == "storyline"]`.

**Build entries** → wait for *Entries up to date* → review **Entries** (expect topics such as Q-Former, Perceiver resampler, contrastive pre-training) and **Issues** (conflicting claims across papers; resolve the ones that change answers).

Copy the Knowledge Base public id (starts with `kb…`).

**Instructions** to add (Instructions view):
- `Name papers by the short name and year in papers-manifest.md, e.g. "BLIP-2 (2023)", never by file name.`
- `When papers report different numbers for the same benchmark, keep both and attribute each to its paper; do not average or pick one.`

## 2. MCP endpoint A: lineage graph (GROQ mode)

Context → **New MCP**

| Field | Value |
|---|---|
| Title | `Paper Lineage: graph` |
| Name (immutable) | `paper-lineage-graph` |
| Sources | Dataset `jd22zcim.production` (nothing else) |
| GROQ filter | `_type in ["paper", "influence", "concept", "storyline", "datasetStats"]` |

The filter keeps out `paperText` (full text), `question` and `gap` (visitor data) and `siteSettings`.

**Instructions** (paste as-is):

```text
You answer questions about the lineage of AI research papers: which paper built on which, when, and through which ideas.

Schema guide:
- paper: shortName (use it to refer to papers), title, publishedAt, kind (method|dataset|benchmark|analysis), arxivId, abstract, uses[] -> concept.
- influence: a lineage link from an earlier paper (from) to a later paper (to).
  citation{mentions, methodMentions, sections[], contexts[{_key, section, text}]} is FACT mined from the later paper's text.
  relation, inherited[], explanation are INTERPRETATION and only valid when provenance.reviewDecision == "accepted".
- concept: level "theme" or "concept"; a concept has broader -> theme and introducedBy -> paper. Papers that use it: *[_type=="paper" && references(^._id)].
- storyline: curated ordered steps[].influence.

Rules:
1. Never state a relation type (extends, combines, challenges...) for a link unless provenance.reviewDecision == "accepted". For other links say "X cites Y n times" and quote a citation context.
2. Every structural claim (who built on whom, dates, counts) must come from a query result. Return the _id of every paper and link you rely on.
3. Prefer links with citation.methodMentions > 0 when describing lineage; Related Work mentions are weaker.
4. If no path or link exists, say the dataset does not contain it. Do not infer links from your own knowledge.

Useful queries:
- Ancestors: *[_type=="influence" && to->shortName==$name]{from->{_id, shortName, publishedAt}, citation{mentions, methodMentions}, "relation": select(provenance.reviewDecision=="accepted" => relation)}
- Concept history: *[_type=="concept" && name match $q]{name, summary, "theme": broader->name, "by": introducedBy->shortName}
```

## 3. MCP endpoint B: paper contents (Knowledge Base mode)

| Field | Value |
|---|---|
| Title | `Paper Lineage: papers` |
| Name (immutable) | `paper-lineage-papers` |
| Sources | Knowledge Base `kb…` from step 1 (no dataset source) |

**Instructions**:

```text
You explain what the papers in this Knowledge Base say: how methods work, why they were designed that way, and what results they report.
Cite the paper (short name and year) and the section for every claim.
Do not assert that one paper builds on, extends or challenges another; lineage is answered elsewhere. You may mention that a paper names another paper as inspiration, quoting the sentence.
If the papers do not cover the question, say so.
```

## 4. Wire into the app

`web/.env.local` (server-side only):

```bash
SANITY_ORGANIZATION_TOKEN=          # step 0
SANITY_CONTEXT_GRAPH_URL=https://api.sanity.io/v1/context/organizations/o2qzzix4g/mcp/paper-lineage-graph
SANITY_CONTEXT_PAPERS_URL=https://api.sanity.io/v1/context/organizations/o2qzzix4g/mcp/paper-lineage-papers
ANTHROPIC_API_KEY=                  # the chat model
ASK_MODEL=                          # optional, defaults to claude-opus-5
SANITY_WRITE_TOKEN=                 # project token, Editor: saves questions.*, creates/bumps gaps, storyline drafts
SANITY_READ_TOKEN=                  # optional Viewer token for the /pipeline intake board (falls back to the write token)
UPSTASH_REDIS_REST_URL=             # rate limits (free Upstash database; DESIGN_SPEC §11.3)
UPSTASH_REDIS_REST_TOKEN=           # without Upstash, an in-memory limiter is used (fine locally, not on serverless)
RATE_LIMIT_SALT=                    # optional, salts the hashed visitor key
NEXT_PUBLIC_SITE_URL=               # optional on Vercel (VERCEL_PROJECT_PRODUCTION_URL is used); absolute URLs for OG/sitemap
```

Without the Context, Anthropic or write variables, `/api/ask` answers 503 "Ask is unavailable right now" and the rest of the site works.

## 5. Run the paper-intake workflow (curators)

The definition is deployed to the `workflows` dataset (`cd workflows && npm run deploy`). Its effects (fetch arXiv metadata, count links, publish) run in a small runner that uses your `sanity login` session (or `SANITY_AUTH_TOKEN`):

```bash
cd workflows && npm run runner          # keep running while curating; drains queued effects every 5 s
npm run start -- paper-2301-12597       # start an intake by hand (the Desk Inbox "Add paper" also starts one)
npx sanity-workflows list               # in-flight instances · show <id> · diagnose <id>
```

Smoke test once set (lists tools per endpoint: expect `groq_query` on A, `knowledge_base_read` on B):

```bash
node scripts/context-smoke.mjs
```

## Known-answer checks

| Ask | Endpoint | Expected |
|---|---|---|
| What did BLIP-2 build on? | graph | 16 ancestors incl. BLIP (cited 9×, 3 in Method), CLIP, Flamingo, OPT, Flan-T5 |
| Who introduced the Q-Former? | graph | BLIP-2 (2023), theme "Vision-language models on frozen LLMs" |
| How does the Q-Former use learnable queries? | papers | BLIP-2 §3: 32 learnable query embeddings interacting with frozen image features through cross-attention |
| What image-text datasets did BLIP use? | papers | BLIP: COCO, Visual Genome, CC3M, CC12M, SBU, LAION (129M images total) |

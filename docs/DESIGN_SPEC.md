# Paper Lineage: Design Spec

Status: **v1.1** · 2026-10-02 · ready for implementation
Mockups: [Paper Lineage UI canvas](https://claude.ai/artifact/WEJKpzxJntAVTP2q7U3CJT) (boards 1–9, private until shared) · System: [ARCHITECTURE.md](ARCHITECTURE.md) · Product: [SPEC.md](SPEC.md)

This spec is the contract between the mockups and the code. Where the two differ, the spec wins and the canvas gets updated.

**v1.1 changes** (from the implementation-readiness review):
- **Ask display tools** (§5.6): the model shows cards by calling typed tools. The server resolves every card from Sanity and checks every quote.
- **Explorer node budget** (§5.3): at most 30 papers, ranked; the rest collapse into per-year stacks. The real default view has 88 papers.
- **No conversation sharing at launch.** Conversations live only in the browser; the server stores the anonymised question (§6.2).
- **Rate limiting** with Upstash Redis's free tier (§11.3).
- **Suggest-a-paper** creates a `gap` for curators, not a paper (§6.7).
- **Fallbacks:** summary missing (all 197 today) → abstract; verified meter at 0; Stories hidden until one is published.
- **Concept evolution** has a defined rule and a new `concept.buildsOn` field (§6.5).
- **New sections:** Desk Inbox, Composer and Pipeline tabs (§10.2); site basics (SEO, errors, loading, performance, caching, privacy) (§11).

---

## 1. Design principles

1. **Show where every claim comes from.** Every sentence on screen is one of three things, and each *looks* different: a **verified lineage claim**, a **citation fact**, or **the paper's own words**. AI-drafted text is labelled as such (§4).
2. **The question first, the graph second.** Visitors start at Ask. Graphs, paper and concept pages are where answers *open*, not where people have to begin.
3. **Quotes over paraphrase.** When a source sentence exists, show it. A quote in the paper's voice beats our summary.
4. **Honest emptiness.** "Nothing yet" and "this dataset doesn't cover that" are designed states, never errors and never filler.
5. **A reading room, not a dashboard.** Warm paper ground, serif for reading, sans for UI, mono for identifiers. No gradients, no glow, no emoji.

---

## 2. Information architecture

### 2.1 Sitemap (public site, `web/`)

| Route | Screen | Primary job | Canvas board | Rendering |
|---|---|---|---|---|
| `/` | **Ask** first visit, then conversation | Ask; answers open papers in the side panel | 1, 2, 3 | static shell + streaming `/api/ask` |
| `/explore?focus=&depth=&verified=&datasets=&all=` | **Explorer** | A paper's ancestry by year | 4 | static shell, client graph |
| `/paper/[slug]` | **Paper** | What it built on, what it led to, its concepts | 5 | static (all 197) + live updates |
| `/concept/[slug]` | **Concept** | Where an idea came from and who carried it | 6 | static (180) + live |
| `/theme/[slug]` | **Theme** | Concepts in an area, on a year axis | — | static (25) + live |
| `/stories`, `/story/[slug]` | **Storylines** | Curated narratives along verified links | — | static + live; **hidden from navigation until one is published** |
| `/pipeline` | **Pipeline** | Curation progress and intake board | — | dynamic, live |
| `/suggest` | **Suggest a paper** | Ask curators to add a paper | — | static + server action |
| `/about` | **About** | How it's built, what's verified, privacy | — | static |
| `not-found`, `error` | **System** | 404 and failure pages | — | §6.8 |

Removed: `/ask/[id]` (no sharing at launch, §6.2), `/explore/map` (decision D1).
Curator-only (not linked from the site): **Sanity Studio** and **Lineage Desk** (board 7).

### 2.2 Navigation

- **Desktop top bar:** wordmark · `Ask` `Explore` `Concepts` `Stories`* `Pipeline` · ⌘K search · verified meter. *`Stories` only appears when `count(*[_type=="storyline"]) > 0` (live).
- **Mobile bottom bar:** `Ask` `Explore` `Concepts` `Pipeline` (56 px tall). Search is a 44 px icon button in the header.
- **Footer** (all pages): About · Suggest a paper · Privacy (anchor on About) · "Built on Sanity".
- **⌘K palette:** papers (shortName, year), concepts, themes, plus "Ask: ‹typed text›" as the last row.
- **URL holds state** for the Explorer (focus, depth, toggles, `all`) and the open side-panel tab (`#panel=‹slug›`). Ask conversations are *not* in the URL.

---

## 3. Design tokens

Implemented as CSS custom properties on `:root` and mapped into Tailwind's theme. **Launch is light-only** (decision D2): `color-scheme: light` on `:root`; the Dark columns are kept for a later release, not wired up.

### 3.1 Colour: neutrals

| Token | Light | Dark | Use | Contrast (light on ground / dark on bg) |
|---|---|---|---|---|
| `--ground` | `#F6F4EF` | `#121418` | page background | — |
| `--surface` | `#FFFFFF` | `#1B1E24` | cards, panels | — |
| `--ink` | `#17191E` | `#ECEDEF` | primary text, focus node fill | 16.0 / 15.7 |
| `--ink-2` | `#454A54` | `#B8BCC4` | secondary text | 8.1 / 9.7 |
| `--muted` | `#626873` | `#9AA0AA` | captions, metadata | 5.1 / 7.0 |
| `--line` | `#E2DED5` | `#2A2E36` | dividers, card borders | decorative |
| `--line-strong` | `#CFCAC0` | `#3A3F49` | control borders | decorative (paired with label) |

### 3.2 Colour: relations (the lineage palette)

Colour is **never the only signal**: every relation has a label, and the unreviewed state has its own line pattern.

| Relation | Label | Light | Dark | Text contrast (white / dark surface) | Line |
|---|---|---|---|---|---|
| `extends` | Extends | `#3446C4` | `#8B98F5` | 7.5 / 6.3 | solid 2 px |
| `combines` | Reuses components | `#A35A0B` | `#E3A64F` | 5.2 / 7.8 | solid 2 px |
| `challenges` | Challenges | `#A21C5B` | `#F07AAE` | 7.4 / 6.4 | solid 2 px |
| `benchmarks-against` | Benchmarks against | `#0F766E` | `#4FC1B4` | 5.5 / 7.7 | solid 2 px |
| `uses-dataset` | Trained / evaluated on | `#4B5563` | `#A9B1BD` | 7.6 / 7.7 | solid 2 px |
| `applies-to-new-domain` | Applies to a new domain | `#3446C4` | `#8B98F5` | as extends | solid 2 px + "↗ domain" label |
| `simplifies` / `replaces` | Simplifies / Replaces | `#4B5563` | `#A9B1BD` | 7.6 / 7.7 | solid 2 px |
| *unreviewed* | Cites · not yet reviewed | `#7E848E` | `#6E747E` | 3.8 / 3.9 (graphic, ≥ 3:1 ✓) | **dotted** 1.25 px, dash `2 4`, round caps |

### 3.3 Colour: provenance and status

| Token | Use | Treatment |
|---|---|---|
| `--verified` = relation colour | accepted link | solid line, relation chip with colour swatch |
| `--unreviewed` | proposed link | dotted line, grey chip "Cites · not yet reviewed" |
| `--ai` | AI-drafted text (summaries, concept text) | caption "Drafted by AI · not yet reviewed" in `--muted` |
| `--from-paper` | quote blocks | `--surface` block, serif text, caption "From ‹Paper› · §‹Section›" |
| `--warning` `#9A5B05` / bg `#FDF2DF` | check flags, rate-limit notice | text + bg pair (4.9:1) |
| `--danger` `#B42318` | reject, errors | text on white 6.6:1 |
| `--success` `#1E7A46` | accept button fill (white text 5.4:1) | Desk only |

### 3.4 Typography

| Role | Family | Size / line-height | Weight | Where |
|---|---|---|---|---|
| Display | Newsreader | 54 / 60 (38 / 44 on < 640) | 500 | Ask hero |
| H1 | Newsreader | 38–46 / 1.12 (30 on < 640) | 500 | paper / concept titles |
| H2 | Newsreader | 26–28 / 1.2 | 500 | section headings |
| Reading | Newsreader | 17–20 / 1.45–1.5 | 400 | answers, summaries, quotes |
| UI | IBM Plex Sans | 13–15 / 1.4 | 400–600 | controls, labels, cards |
| Caption | IBM Plex Sans | 12 / 1.35 | 400 | metadata, sources line |
| Overline | IBM Plex Sans | 12 / 1.3, +0.06em, uppercase | 500 | section labels |
| Mono | IBM Plex Mono | 11–13 | 400–500 | arXiv IDs, years, counts, ⌘K |

Rules: never below 12 px (graph node meta at 10.5 px is the one exception, always paired with the 13 px name); body ≥ 15 px; max measure 72 ch; `tabular-nums` on counts and years.

### 3.5 Space, shape, elevation, motion

| Scale | Values |
|---|---|
| Spacing (4 px base) | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 96 |
| Radius | chip 999 · control 8 · card 10–12 · panel 14 · composer 16 |
| Elevation | `e0` none · `e1` `0 1px 2px rgb(23 25 30 / .06)` · `e2` `0 6px 24px rgb(23 25 30 / .08)` · focus node `0 4px 14px rgb(23 25 30 / .25)` |
| Motion | `fast` 120 ms · `base` 200 ms · `slow` 450 ms (edge draw-in) · easing `cubic-bezier(.2,.7,.2,1)` · all disabled under `prefers-reduced-motion` |
| Breakpoints | `sm` < 640 · `md` 640–1023 · `lg` 1024–1279 · `xl` ≥ 1280 · max-width 1440, gutters 16 / 24 / 32 |
| Z-index | content 0 · sticky composer 10 · side panel 20 · popover 30 · palette / dialog 40 · toast 50 |

---

## 4. How verification looks on screen

| Kind of claim | Source | Looks like | Wording |
|---|---|---|---|
| **Verified lineage** | GROQ, `reviewDecision == "accepted"` | Solid coloured line or chip with relation label | "BLIP-2 **extends** BLIP" |
| **Citation fact** | GROQ, any link | Dotted grey line; chip "Cites · not yet reviewed"; counts in mono | "BLIP-2 **cites** Flamingo 5×" |
| **The paper's words** | Knowledge Base entry or `citation.contexts` | Serif quote block, caption "From ‹Paper› · §‹Section›" | verbatim; ellipsis only at ends |
| **AI-drafted text** | `origin: "ai"` | Normal text + caption "Drafted by AI · not yet reviewed" | plain |
| **Abstract excerpt** | `paper.abstract` | Normal text + caption "From the abstract" | first 2 sentences, verbatim |
| **Our answer prose** | the Ask agent | Serif reading text, no box | 1–3 sentences; every claim backed by a card, chip or quote |
| **Absence** | no data | Quiet text + one next action | "Nothing yet. ‹Action› →" |

Never: a relation word ("extends", "inspired", "built on") for an unreviewed link; a quote without its section; a number without its source; a quote the server hasn't checked against its source (§5.6).

---

## 5. Components

Names map to `web/components/*`. Each lists its anatomy, states, accessibility and data source.

### 5.1 Global

**TopNav**: wordmark (link to `/`), nav links (`aria-current="page"` on the current one, 2 px underline), SearchButton (`⌘K`), VerifiedMeter. Sticky, `e1` after 8 px of scroll.

**VerifiedMeter**: links to `/pipeline`, live from `datasetStats`.
- `linksAccepted > 0`: "**‹v›** of ‹n› links verified" + a 140 × 4 bar.
- `linksAccepted == 0`: "Curation starting · ‹n› links to review" + an empty bar (no fake progress).
- `aria-label` repeats the visible text.

**CommandPalette**: modal (focus trapped, Esc closes, focus returns). Groups Papers / Concepts / Themes / Ask, 8 each, matched via GROQ `match` on shortName, title, name and aliases (`prefix*`). Empty: "No paper or concept named ‹q›. Ask about it →".

**Footer**: links (§2.2) + "Questions you ask are stored anonymously to improve the dataset." (links to About → Privacy).

### 5.2 Ask: input and messages

**Composer**: `<form>` with a labelled `<textarea>` (visually hidden label "Ask about papers and ideas"), a helper line, and a 40 px submit button (`aria-label="Ask"`).
- Helper line: "Answers come only from the ‹N› papers in this dataset, with quotes. Questions are stored anonymously; don't include personal details."
- Variants: `hero` (2 rows, 18 px) and `docked` (1 row, grows to 6, sticky with a 16 px offset).
- States: idle · submitting (spinner; textarea stays editable) · streaming (submit becomes **Stop**) · rate-limited (helper in `--warning`: "You've reached the question limit. Try again in ‹m› min.", submit disabled with a countdown) · daily cap reached ("Ask is resting for today (budget reached). Explore and paper pages still work.") · outage (helper: "Ask is unavailable right now.").
- Keys: Enter sends, Shift+Enter adds a new line, ↑ in an empty composer edits the last question. Max 500 characters (counter from 400).

**ExamplePrompt**: pill button that submits its text (`siteSettings.examplePrompts`).
**StartPaperTile**: shortName + year (mono) + "‹n› later papers built on it" → `/explore?focus=`. If n = 0: "Starting point of this dataset".
**UserMessage**: right-aligned ink bubble, radius `16 16 4 16`, max 70% wide (85% on mobile).

**AssistantAnswer**: no bubble, full column width. Order:
1. **Lead** (serif 19 px, 1–3 sentences), streamed as text.
2. **Primary card** from a display tool (§5.6).
3. **Support** (optional): ≤ 2 QuoteBlocks and/or a short paragraph.
4. **SourcesLine**: computed by the server from every `_id` the answer's cards resolved: "From ‹n› links: ‹v› verified, ‹u› not yet reviewed · Show in Explorer".
5. **FollowUps**: 2–4 chips (`suggestFollowUps`).

Streaming: text streams token by token. A card shows a fixed-size skeleton from the moment its tool call starts until its payload arrives (no layout shift). SourcesLine and FollowUps appear last. **Stop** aborts the request and keeps whatever has rendered, marked "Stopped".

### 5.3 Graph (Explorer, Paper "Neighbourhood", Desk preview)

**Node budget (v1.1).** The real default view (BLIP-2, 2 generations, datasets hidden) has **88 papers**; at 3 generations it's about 180. The Explorer never draws more than the budget.

| Rule | Value |
|---|---|
| Budget | **30 papers** on desktop, 18 at 1024–1279, Explorer list mode below 640 |
| Always shown | the focus; every generation-1 ancestor (BLIP-2 has 12, without datasets); both ends of every *verified* link in view; any paper the visitor pinned (click "Pin" in the inspector) |
| Ranking for the rest | `strength = 3 × methodMentions + mentions` of the link that connects the paper to the shown set (max across links); ties broken by later year, then by descendants |
| Overflow | per year column, one **StackNode** "+‹n› more · ‹year›"; links from hidden papers are not drawn |
| Escape hatch | "Show all ‹N›" switches to a **table view** (paper, year, generation, strongest link, cited ×, status), sortable, not a hairball graph |

Example (BLIP-2, depth 2): shows BLIP-2, its 12 direct ancestors and the 17 strongest second-generation papers. 58 collapse into stacks (2021: +12, 2022: +10, 2019: +11, 2020: +9, 2018: +7, older: +9).

**YearRuler**: one column per year in view; mono 12 px labels; dashed `--line` guides.
**PaperNode**: 104 × 44, radius 8, shortName (13 px / 600, ellipsis + `title`) and "year · kind" (mono 10.5 px; kind only when not a method).
- Variants: default · focus (ink fill, white text, focus shadow) · selected endpoint (2 px ink border) · dataset (only when "Hide datasets" is off; dashed border) · dimmed (40% when filtered) · pinned (small pin glyph).
- Interaction: click → inspector; double-click or Enter on a focused node → refocus; Tab moves in year order.
**StackNode**: same size, dashed `--line-strong` border, "+‹n› more" (13 px) and the year (mono). Click expands that year by up to 8 more papers (the budget grows by that many for this view), or opens the table filtered to the year when there are more than 8.
**LinkEdge**: cubic Bezier, right edge of source → left edge of target, styles per §3.2. The selected link is ink, 2.5 px, with a pill label "cites 5× · unreviewed" (or the relation name) at the midpoint. Hover +1 px.
**GraphControls**: "Generations back" 1 / 2 / 3 (`aria-pressed`); checkboxes "Verified only", "Hide datasets" (on by default), "Simplify" (hides a link A→C when A→B→C is in view and A→C isn't verified); status text "Showing 30 of 88 · Show all".
**Legend**: always visible under the graph.
**Inspector** (360 px): a selected link shows the fact tiles, a QuoteBlock (from `evidenceKey`, else the first context), the relation or the "not yet reviewed" explainer, and "Open ‹Paper›". A selected paper shows a compact OpenedPanel plus "Pin" and "Refocus here". A "Links in view" list makes every drawn link keyboard-reachable.
**Layout**: ELK `layered` (left → right) in a Web Worker, with x snapped to the year column. Edges are drawn as SVG under HTML nodes. Relayout animates (`base`), except under reduced motion.

### 5.4 Pages

**ConceptChip**: name (13 px / 500) + theme (11 px, `--muted`); strong variant (ink border) for "Introduces".
**EvolutionStep**: timeline row (year · dot + connector · content). The connector is coloured per the link between consecutive introducing papers, dotted when unreviewed, and absent ("no direct link in this dataset") when there's none.
**StatTile**: number (20–22 px / 600) + label + optional names line.
**BuiltOnRow**: grid `170px 1fr`: paper link, mono facts, relation chip (verified only) | quote (serif 15.5 px) + section caption. No context captured: "Cited ‹n›×; no citation sentence captured."
**PaperHeaderSummary**: `summary` with the AI caption if present; otherwise the first two abstract sentences with the caption "From the abstract". Never empty.

### 5.5 Feedback and system

**Toast**: bottom-centre, 4 s (8 s when it has Undo), `role="status"`.
**Skeleton**: `--line` blocks at the final size; 1.2 s pulse, off under reduced motion.
**EmptyState**: one sentence + one action link; no illustration.
**InlineError**: `--danger` text + "Try again" button; keeps the user's input.

### 5.6 Ask display tools (v1.1)

The model **never writes card content directly**. It reads data through the two Context MCP endpoints (§ARCHITECTURE 5), then calls one of these server-defined display tools. The server **resolves every card from Sanity** (or re-reads the Knowledge Base entry), enforces the rules in §4, and streams a typed card payload to the client. Invalid calls return a tool error the model can correct; nothing invalid reaches the screen.

| Tool | Input (validated with zod) | Server work | Card | Rejects when |
|---|---|---|---|---|
| `showPapers` | `{ids: string[1..6], caption?: string≤80}` | fetch paper cards by `_id` | **PaperCardList** (2-up grid) | an id isn't a published paper |
| `showChain` | `{paperIds: string[2..6], conceptSlugs?: string[]}` (oldest → newest) | for each consecutive pair, find the link; set its status (verified + relation / cites n× / none) | **ChainCard** | fewer than 2 resolvable papers; out of date order |
| `showComparison` | `{a: id, b: id, rows: {label≤24, a≤140, b≤140, sources: SourceRef[1..]}[1..4]}` | compute the "Shared" row from both papers' concepts; check every row cites at least 1 source that resolves | **CompareTable** | a row has no resolvable source |
| `showQuote` | `{source: {kind:"kb", kb:string, path:string} \| {kind:"link", influenceId, contextKey}, quote: string≤600}` | KB: re-read the entry via `knowledge_base_read` and require `quote` as a verbatim substring (whitespace-normalised); link: take the text from `citation.contexts[contextKey]` and ignore the model's text | **QuoteBlock** | the quote isn't found verbatim |
| `suggestFollowUps` | `{items: string[2..4] ≤ 90}` | none | **FollowUps** | — |
| `reportOutcome` | `{outcome: "answered" \| "partial" \| "unanswered", gap?: {kind, title≤90, paperIds?, arxivIds?}}` | writes `questions.<uuid>`; the `question-to-gap` Function does the rest | none (also drives the Answer state) | — |
| `draftStoryline` | `{title≤80, paperIds: string[2..8]}` | creates a private `drafts.storyline-…` (`origin: "ai"`); counts against the Ask rate limit (D4) | Toast "Storyline draft sent to curators · Undo" | — |

`SourceRef = {kind:"doc", id} | {kind:"kb", kb, path}`. Card payloads are typed in `web/lib/cards.ts` and shared by server and client. Tool calls stream as AI SDK UI message parts; the client switches on the tool name to pick the component (skeleton while `input-available`, card on `output-available`, InlineError on `output-error` after the model gives up).

The system prompt carries the data contract (§ARCHITECTURE 5) and the writing rules (§7); the display-tool guarantees above enforce the important ones in code.

### 5.7 Answer states

| State | Trigger | Design |
|---|---|---|
| Answered | `reportOutcome: answered` | full anatomy |
| Partial | `partial` (e.g. relies only on unreviewed links) | full anatomy + note "These links haven't been reviewed yet, so they show what the papers cite, not how they're related." |
| No path | `showChain` impossible: no connection found | "‹A› and ‹B› aren't connected in this dataset." + nearest shared concept (if any) + "Suggest a missing link" (→ gap) |
| Out of scope | `unanswered` | "This dataset doesn't cover that. It traces ‹N› papers back from BLIP-2." + 3 example prompts |
| Conflict | KB contradicts GROQ | GROQ wins; footnote "Some text about this is being updated." |
| Stopped | visitor pressed Stop | rendered parts kept + caption "Stopped" |
| Error | model / MCP failure after retries | InlineError "Something went wrong answering that." + Try again; the question is kept |
| Rate-limited / cap | 429 from `/api/ask` | Composer states (§5.2); the previous conversation stays readable |

---

## 6. Screens

Desktop layouts use a 12-column grid inside 1440 max width with 32 px gutters.

### 6.1 Ask: first visit (board 1)
- One centred column (max 820): hero (display + 17 px lead) → hero Composer (with privacy helper) → "Try asking" (6 ExamplePrompts) → "Or start from a paper" (3 × 2 StartPaperTiles) → dataset line (live counts).
- Mobile: hero 38 px, prompts in a horizontally scrolling row, tiles 2-up.
- Focus goes to the composer on load (desktop only; on mobile it would open the keyboard).

### 6.2 Ask: conversation (boards 2, 3)
- Grid `minmax(0,1fr) 440px`: conversation column (max 860, centred) with a docked Composer | sticky OpenedPanel.
- New answers scroll to the user's question, not the bottom.
- **Persistence (v1.1):** the conversation lives in `localStorage` (last 10 conversations, 30 turns each, wrapped in try/catch) with a "New conversation" button and a "Recent" menu. **No share links at launch.** The server stores only `questions.<uuid>` (text, outcome, cited ids, endpoints used). Conversation history sent to the model is trimmed to the last 6 turns.
- **OpenedPanel**: tabs for papers and concepts opened from answers (max 6; the oldest closes first). A paper tab shows chips (kind, month year, arXiv ID), H2 title, authors ("‹3› and ‹n› others"), PaperHeaderSummary, Introduces chips, StatTiles (built on / built on it, with names), and actions "Open full page", "Explore its lineage", "Ask about ‹Paper›". Below 1024 px it becomes a bottom sheet (90% height, drag handle, Esc / swipe down).

### 6.3 Explorer (board 4)
- Header: overline "Lineage of", H1 shortName + year, GraphControls with the "Showing 30 of 88" status. Body `minmax(0,1fr) 360px`: graph + legend | inspector.
- Defaults: focus BLIP-2, depth 2, datasets hidden, simplify on, budget per §5.3.
- No ancestors: "‹Paper› has no earlier papers in this dataset."
- Table view (`&all=1`): sortable table; row click selects the paper in the inspector; "Back to graph".

### 6.4 Paper (board 5)
- `minmax(0,1fr) 400px`. Main: breadcrumbs, chips, H1, authors, **PaperHeaderSummary**, **Built on** (verified first, then "Also cited · not yet reviewed (n)": 4 shown + "Show n more"), **Led to** ("Nothing yet" when empty, with "Suggest a paper that builds on ‹Paper›"), Abstract (collapsed after 3 lines).
- Aside (sticky): Neighbourhood mini-graph (≤ 8 nodes, budget rules apply), Concepts (Introduces / Uses with theme), provenance note ("Read from the paper's full text (‹html|pdf›): ‹n› references parsed"). No key figures (D3).

### 6.5 Concept (board 6)
- `minmax(0,1fr) 380px`. Main: breadcrumb (Concepts / Theme / Concept), chips (category, "Introduced by ‹Paper› · year"), H1, summary (AI caption), **How this idea evolved**, **Papers using this** (list, year order). Aside: other concepts in the theme, "Next questions" (Ask prompts that link to `/?q=`).
- **Evolution rule (v1.1):**
  1. **Curated chain first.** A new field `concept.buildsOn[]` (references to earlier concepts, curated, seeded for key ideas such as Q-Former ← Perceiver resampler ← latent-array cross-attention ← inducing-point attention) is followed recursively, up to 6 steps. Each step shows the concept and its introducing paper. The connector between steps is the link between those two papers: verified, unreviewed (dotted) or "no direct link in this dataset".
  2. **Automatic fallback** when `buildsOn` is empty: up to 3 "Related earlier ideas": concepts in the same theme whose introducing paper is an ancestor (≤ 2 generations) of this concept's introducing paper, ranked by link strength. Labelled "Suggested from citations" (not presented as a curated chain).
  3. **Neither:** "No earlier ideas recorded for this concept yet."
- Schema change: `concept.buildsOn` (array of references to `level == "concept"`, validation: each target's introducing paper is older). Added to M1's remaining work.

### 6.6 Theme, Stories, Pipeline
- **Theme** (`/theme/[slug]`): H1 + summary; concepts on a horizontal year axis. **Bar definition:** starts at the concept's introducing paper's year (or its first user, if it has no introducer) and ends at the latest `publishedAt` among papers that use it (`paper.uses` or inherited on a link). Below: an accessible list (concept, introduced by, year span, number of papers).
- **Stories** (`/stories`, `/story/[slug]`): index of published storylines (title, standfirst, chain preview). Story page: scrollytelling, with narrative on the left (serif 19 px; paper, concept and link mentions as links with hover/focus cards) and a sticky ChainCard on the right highlighting the current step. Stacks on mobile. *Hidden from navigation until one is published.*
- **Pipeline** (`/pipeline`): hero VerifiedMeter (zero state per §5.1); "Recently verified" (last 10 accepted links, live); intake board (fetching → enriching → checks → curation → publishing → published), each card showing the paper, how long it has been in the stage, and the actor (AI / human chip). Empty board: "No papers in the intake pipeline right now." Explains in 3 sentences how a link gets verified.

### 6.7 Suggest a paper (`/suggest`) (v1.1)
- One column (max 640): H1 "Suggest a paper", a sentence on scope ("AI papers, preferably vision-language and their ancestors"), and a form: arXiv URL or ID (normalised on blur), optional "Why it belongs" (≤ 280), submit.
- Server action: validate the format → look up the arXiv metadata → **create or update a `gap` (`kind: missing-paper`, `suggestedArxivIds`, `questionCount + 1`)**. A paper is never created directly; curators add it from the Desk Inbox (which starts the intake workflow).
- States: preview card "Is this the paper? ‹Title› (‹year›)" before submitting · already in dataset ("Already here → Open ‹Paper›") · not a CS paper ("This looks outside the dataset's scope.") · rate-limited (shared with Ask) · success ("Thanks. Curators will review it. Track progress on the Pipeline page.").

### 6.8 System pages and loading
- **404**: "No page here." + palette-style search box + links to Ask and Explore. For `/paper/[slug]` misses, it suggests the 3 closest shortNames.
- **Error** (route error boundary): "Something broke on this page." + Try again + link to Ask. Errors go to the server log only (no third-party tracker).
- **Loading**: each route has a `loading.tsx` skeleton matching its layout (header block, two columns). The graph skeleton is the year ruler with ghost nodes. No spinners on whole pages.
- **Offline**: Ask shows the outage composer state; static pages work from cache.

---

## 7. Ask: conversation design

| Rule | Detail |
|---|---|
| Length | Lead ≤ 3 sentences; the whole answer fits one desktop viewport above the follow-ups |
| Naming | "ShortName (year)" on first mention, then shortName |
| Numbers | Every number comes from a tool result; shown in mono in cards |
| Relation words | Only for accepted links (enforced by `showChain`); otherwise "cites ‹n›×" |
| Quotes | ≤ 2 per answer, only through `showQuote` (verified verbatim) |
| Uncertainty | State the data limit plainly ("in this dataset"); no "I think", "might", "it seems" |
| Follow-ups | 2–4, each answerable; mix deeper / sideways / action |
| Refusals | Off-topic → out-of-scope state; no general-knowledge answers |
| Tone | Plain, specific, calm; a knowledgeable librarian |

---

## 8. Responsive behaviour

| Element | ≥ 1280 | 1024–1279 | 640–1023 | < 640 |
|---|---|---|---|---|
| Ask | conversation + 440 panel | + 380 panel | panel → bottom sheet | single column; docked composer; bottom nav |
| ChainCard | horizontal | horizontal | horizontal, scrolls | vertical list |
| Explorer | graph (budget 30) + inspector | graph (budget 18) + inspector 320 | graph (18); inspector → sheet | **list mode**: "Built on" grouped by generation (board 8) |
| Paper / Concept | main + aside | main + aside 340 | aside below main | single column; mini-graph hidden |
| CompareTable | table | table | table | stacked cards per row |

Touch targets ≥ 44 px; nothing hover-only (hover cards also open on focus and tap).

---

## 9. Accessibility checklist

- Text contrast ≥ 4.5:1 (all tokens pass); meaningful graphics ≥ 3:1 (unreviewed line `#7E848E`).
- Relations always have text labels; colour and line pattern are redundant signals.
- Every graph has a text equivalent: "Links in view" list, table view, mobile list mode.
- Real elements only (`<button>`, `<a href>`, `<form>`, `<table>`, `<figure>`); icon-only buttons have `aria-label`.
- Live regions: the answer lead in `aria-live="polite"` (announced once it's complete, not per token); cards announced as "‹n› papers found" etc.; toasts `role="status"`.
- Focus: 2 px `--ink` outline, 2 px offset; palette, dialogs and sheets trap focus and return it.
- `prefers-reduced-motion` disables edge draw-in, relayout animation, pulses and smooth scroll.
- `lang="en"`; one H1 per page; images need `alt` (schema-enforced).

---

## 10. Curator surfaces

### 10.1 Sanity Studio (customisations)

| Customisation | UX |
|---|---|
| **Evidence picker** (`influence.evidenceKey`) | Every citation sentence as a radio card (section overline, sentence with the cited author highlighted); selecting writes its `_key`; current one has an ink border. Empty: "No citation sentences were captured." |
| **Relation picker** (`influence.relation`) | Radio list with colour swatches, title and one-line meaning; the suggestion tagged "Suggested · ‹origin› · ‹confidence›" |
| **arXiv input** (`paper.arxivId`) | Paste a URL → normalised on blur; inline ✓ format, ✓ unique; "Open on arXiv" |
| **buildsOn input** (`concept.buildsOn`) | Reference array filtered to concepts whose introducing paper is older; each row shows the concept, its paper and year |
| **Views** | Paper: *Lineage* (2-hop mini-graph, drafts dashed), *Source* (`paperText` sections). Link: *In context* (paragraph around each sentence). Concept: *Evolution* (EvolutionSteps) |
| **Document actions** | Links: Accept (decision + reviewer + time, then publish), Reject, Relabel. Papers: Re-harvest. Concepts: Promote |
| **Badges** | Origin and review state on lists and headers |
| **Structure** | Deployed: Papers by kind, Lineage links (Unreviewed, Unreviewed · cited in Method, Verified, Rejected), Concepts by theme, Storylines, Questions & gaps, Full texts, singletons |

### 10.2 Lineage Desk (App SDK, board 7)

Built with **Sanity UI**, so it follows the Dashboard theme (light/dark) and system font, not the site's tokens. Shell: 52 px header (app name, dataset, verified count, avatars), then three panes: 270 px list | flexible main | 320 px context. **No save buttons anywhere:** every change writes immediately, with Undo from a toast.

**Tabs (left pane):** `Review` · `Inbox` · `Composer` · `Pipeline`.

**Review** (board 7):
- List: papers with proposed links, flagged first (a check warning or low confidence), then by count; badge = number left to review.
- Main: paper header ("‹n› incoming links · ‹a› accepted · ‹r› to review"), triage bar ("Accept all high-confidence (n)": confidence ≥ 0.8 **and** cited in Method; a confirmation lists them; one batched transaction), EdgeCards.
- **EdgeCard:** A → B, counts, confidence, check badge; quote with the cited author highlighted; relation radio group (suggestion marked "AI" or "Harvest"); Accept (A), Reject (R), Rewrite explanation (Agent Action patch, shows its AI-credit cost), Open in Studio. Focused card: 2 px blue ring. Fixed-height skeleton.
- Context pane: 2-hop preview (accepted solid, proposed dashed, the focused link highlighted); live activity feed.

**Inbox** (v1.1): gaps first, then questions.
- List: open gaps sorted by `questionCount` (desc), each with a kind badge (Missing link · Missing paper · Unanswered · Weak evidence) and a count.
- Main, for the selected gap: title, detail, up to 3 example questions (text, time, outcome), related papers (chips), suggested arXiv IDs with live metadata preview.
- Actions by kind:
  - **Missing paper** → "Add paper": creates the paper from the arXiv ID, which starts `paper-intake`; the gap moves to in-progress.
  - **Missing link** → "Create link": choose from / to (prefilled), opens a new EdgeCard with `origin: curator`.
  - **Unanswered** → "Write storyline" (opens Composer prefilled) or "Out of scope" (gap → wont-fix with a reason).
  - **Weak evidence** → "Pick better evidence" (opens the link in Review with the evidence picker).
  - Always: "Resolve" with a resolution note; status pills open / in-progress / resolved / won't fix.
- Context pane: live question feed (newest first, outcome badge).

**Composer** (v1.1):
- List: storylines, drafts first; badge "From chat" for `origin: ai` drafts.
- Main: title and standfirst fields; steps (drag to reorder, each "A → B" with link status; an unreviewed step shows "Review this link first" → opens Review); per-step narrative and intro with `SDKPortableTextEditable` (live cursors of other curators); a Publish action, disabled with the reason while any step is unreviewed.
- Context pane: live ChainCard preview; "Add step" picker (search paper A, then only *accepted* links from A are offered).

**Pipeline**: workflow instances in the `curation` stage (`useWorkflowInstances`). Same EdgeCards, plus **Approve** / **Send back** (note required) rendered from the workflow session's evaluation; a disabled action shows the engine's reason.

**Keyboard:** `J/K` move · `A` accept · `R` reject · `E` relation · `1–8` choose relation · `⌘↵` publish reviewed / approve · `G then R/I/C/P` switch tab · `?` help.

---

## 11. Site basics (v1.1)

### 11.1 SEO and sharing
- `<title>`: "‹Page› · Paper Lineage" (Ask: "Paper Lineage: every idea has ancestors").
- Descriptions: paper "What ‹ShortName› (‹year›) built on and led to, with quotes from the papers."; concept "Where ‹Concept› came from, introduced by ‹Paper› (‹year›)."
- Open Graph images via `next/og`, 1200 × 630: wordmark, page title, a 3-node chain or concept chips, ground colour. Default image for static pages.
- `sitemap.xml` (papers, concepts, themes, published stories), `robots.txt` allow all; `/api/*` disallowed. Canonical URLs without query strings (except the Explorer `focus`).
- Favicon: a three-node lineage glyph in `--ink` on `--ground` (SVG + 32 px PNG + apple-touch 180).

### 11.2 Performance budgets
| Metric | Budget |
|---|---|
| LCP (Moto G-class, 4G) | < 2.5 s on Ask, Paper, Concept |
| CLS | < 0.05 (fixed-size skeletons and cards) |
| JS on Ask / Paper / Concept | < 130 KB gzip (graph code not included) |
| Graph bundle (`@xyflow/react` + `elkjs`) | lazy-loaded on Explorer and mini-graphs only; ELK in a Web Worker |
| Ask time to first token | p50 < 2.5 s; first card < 5 s |
| `/api/ask` | Node runtime, `maxDuration` 60 s, ≤ 6 tool calls per answer |

### 11.3 Rate limiting and cost guard
- **Upstash Redis** (free tier) with `@upstash/ratelimit`, keyed by a hash of the IP:
  - Ask + storyline drafts + suggestions: **10 per 10 minutes** (sliding window) and **50 per day** per visitor.
  - **Global daily cap: 400 questions** (protects the Anthropic and AI-credit budget), giving the "resting" composer state.
- Env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (server only). Without them (local dev), an in-memory limiter is used and the global cap is skipped, with a startup warning.
- Requests over 500 characters are rejected before reaching the model.

### 11.4 Rendering and caching
- Paper, concept and theme pages are pre-rendered at build time (`generateStaticParams`) and kept fresh with `next-sanity` `defineLive` (Live Content API sync tags), so an accept in the Desk updates the open page without a rebuild.
- The Explorer and Ask are static shells with client data; Explorer data comes from one GROQ query per focus/depth (cached per query by the Sanity CDN).
- Interpretation fields are always projected with `select(provenance.reviewDecision == "accepted" => …)` in every public query (lint rule: no raw `relation` in `web/sanity/queries.ts`).

### 11.5 Privacy
- About → **Privacy**: we store question text, time, outcome and which papers were cited, under private IDs that public queries can't read; no IP addresses (only a salted hash in the rate limiter, expiring after 24 h); no cookies beyond `localStorage` for your own conversations; no analytics.
- The composer helper line asks visitors not to include personal details.

### 11.6 About page content
Sections: What this is (2 paragraphs) · How links are verified (facts vs interpretations, with the §4 examples) · Where the data comes from (harvest method, 197 papers, BLIP-2 root, limits) · Built with Sanity (feature list linking to the architecture) · Privacy · Credits (arXiv, ar5iv, OpenAlex).

---

## 12. Implementation notes

| Concern | Decision |
|---|---|
| Styling | Tailwind v4 `@theme` mapped to §3 variables; no component library on the site |
| Fonts | `next/font/google`: Newsreader (opsz), IBM Plex Sans, IBM Plex Mono; `display: swap` |
| Graph | `@xyflow/react` + `elkjs` (Web Worker); budget logic in `web/lib/graph-budget.ts` (unit-tested against the BLIP-2 numbers in §5.3) |
| Ask | Vercel AI SDK `streamText` + `@ai-sdk/mcp` (two Context clients) + display tools from §5.6 in `web/app/api/ask/tools.ts`; card types in `web/lib/cards.ts` |
| Data | `next-sanity` `defineLive`; TypeGen; queries in `web/sanity/queries.ts` |
| Icons | inline stroke SVG 16 / 18 px, `currentColor`; no emoji |
| Testing | contrast table in CI; axe on Ask, Explorer, Paper; display-tool unit tests (quote verification, relation gating); known-answer checks from CONTEXT_SETUP |

### Component → data map

| Component | Source | Query / tool |
|---|---|---|
| VerifiedMeter, dataset line | GROQ | `*[_id=="datasetStats"][0]` |
| ExamplePrompt, StartPaperTile | GROQ | `*[_id=="siteSettings"][0]{examplePrompts, startPapers[]->{shortName, publishedAt, slug}}` |
| Nav "Stories" visibility | GROQ | `count(*[_type=="storyline" && !(_id in path("drafts.**"))]) > 0` |
| Ask cards | display tools → GROQ / KB | §5.6 |
| Explorer graph | GROQ | focus + depth query → `graph-budget.ts` |
| Concept evolution | GROQ | `buildsOn` chain + links between introducing papers; fallback query §6.5 |
| Suggest a paper | server action | arXiv API + `gap` upsert |
| Desk lists and cards | App SDK | `useDocuments` + `useDocumentProjection`; Inbox via `useDocuments({documentType: "gap"})`; Composer via `SDKPortableTextEditable` |

---

## 13. Design decisions

| # | Question | Decision | Why | Consequence |
|---|---|---|---|---|
| D1 | Ship the Map view? | **No, not at launch** | Ask answers "where do I start"; the Explorer covers browsing; a 197-node map is the costliest screen to make readable | Route removed; first screen to come back if time frees up |
| D2 | Dark mode at launch? | **Light only** | The graph, relation palette and quote blocks need their own dark-mode check | `color-scheme: light`; dark tokens kept; the Desk follows the Dashboard theme |
| D3 | Paper key figures? | **Not at launch** | Each figure needs a human-checked caption and alt text | `paper.keyFigure` stays in the schema; cards use type only |
| D4 | "Make this a storyline" without confirmation? | **Yes, as a draft** | It only creates a private draft a curator must finish; asking adds friction for no safety gain | `draftStoryline` tool + Undo toast; unreviewed steps block publishing |
| D5 | How does Ask show cards? | **Server-validated display tools** | Generic MCP tools can't map to cards, and the model must not write quotes or relations itself | §5.6 |
| D6 | Explorer at 88+ papers? | **30-paper budget + stacks + table view** | 88 nodes / 600+ links are unreadable as a graph | §5.3 |
| D7 | Shareable conversations? | **No, not at launch** | Sharing needs server-side conversation storage; we keep only anonymised questions | `localStorage` only; `/ask/[id]` removed |
| D8 | Rate limiting store? | **Upstash Redis (free)** | Serverless functions don't share memory; a public chat needs per-visitor and global caps | §11.3; needs an Upstash account (yours to create) |
| D9 | What does Suggest create? | **A gap, not a paper** | Visitors shouldn't create content; curators add papers from the Inbox | §6.7; ARCHITECTURE updated |
| D10 | How is concept evolution built? | **Curated `buildsOn`, with a labelled automatic fallback** | Citation links alone don't say which *idea* evolved | §6.5; schema change in M1 |

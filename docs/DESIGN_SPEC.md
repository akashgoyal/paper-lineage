# Paper Lineage: Design Spec

Status: **v1** · 2026-10-02
Mockups: [Paper Lineage UI canvas](https://claude.ai/artifact/WEJKpzxJntAVTP2q7U3CJT) (boards 1–9, private until shared) · System: [ARCHITECTURE.md](ARCHITECTURE.md) · Product: [SPEC.md](SPEC.md)

This spec is the contract between the mockups and the code. Where the two differ, the spec wins and the canvas gets updated.

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

| Route | Screen | Primary job | Canvas board |
|---|---|---|---|
| `/` | **Ask** (first visit) | Ask a question, or start from a paper | 1 |
| `/?q=…` / `/ask/[id]` | **Ask** (conversation) | Answer with cards; open papers in the side panel | 2, 3 |
| `/explore?focus=&depth=&verified=&datasets=` | **Explorer** | See a paper's ancestry by year | 4 |
| `/explore/map` | **Map** | All papers in research-area rows × years | — (stretch) |
| `/paper/[slug]` | **Paper** | What it built on, what it led to, its concepts | 5 |
| `/concept/[slug]` | **Concept** | Where an idea came from and who carried it | 6 |
| `/theme/[slug]` | **Theme** | Concepts in an area, on a year axis | — |
| `/story/[slug]` | **Storyline** | Curated narrative along verified links | — |
| `/pipeline` | **Pipeline** | Live curation progress and workflow board | — |
| `/about` | **About** | How it's built, what's verified, Sanity features | — |

Curator-only surfaces (not linked from the site): **Sanity Studio** (hosted) and **Lineage Desk** (App SDK, Sanity Dashboard), board 7.

### 2.2 Navigation

- **Desktop top bar:** wordmark · `Ask` `Explore` `Concepts` `Stories` `Pipeline` · ⌘K search · verified meter.
- **Mobile bottom bar:** `Ask` `Explore` `Concepts` `Pipeline` (4 targets, 56 px tall). Search is a 44 px icon button in the header.
- **⌘K palette:** papers (shortName, year), concepts, themes, plus "Ask: ‹typed text›" as the last row. Arrow keys move, Enter opens, Esc closes.
- **URL holds state.** Explorer focus, depth and toggles; the Ask conversation id; the open side-panel tab (`#panel=flamingo`). Any screen can be linked and restored.

---

## 3. Design tokens

Implemented as CSS custom properties on `:root`, overridden under `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`, and mapped into Tailwind's theme.

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

Colour is **never the only signal**: every relation also has a label, and the unreviewed state has its own line pattern.

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

> Earlier mockups used `#A3A8B0` for unreviewed lines. That's 2.4:1, which fails the 3:1 minimum for meaningful graphics; the token above replaces it.

### 3.3 Colour: provenance and status

| Token | Use | Treatment |
|---|---|---|
| `--verified` = relation colour | accepted link | solid line, relation chip with colour swatch |
| `--unreviewed` | proposed link | dotted line, grey chip "Cites · not yet reviewed" |
| `--ai` | AI-drafted text (summaries, concept text) | caption "Drafted by AI · not yet reviewed" in `--muted`, no colour |
| `--from-paper` | Knowledge Base quote blocks | `--surface` block, serif text, caption "From ‹Paper› · §‹Section›" |
| `--warning` `#9A5B05` / bg `#FDF2DF` | Desk check flags | text + bg pair (4.9:1) |
| `--danger` `#B42318` | reject, errors | text on white 6.6:1 |
| `--success` `#1E7A46` | accept button fill (white text 5.4:1) | Desk only |

### 3.4 Typography

| Role | Family | Size / line-height | Weight | Where |
|---|---|---|---|---|
| Display | Newsreader | 54 / 60 | 500 | Ask hero |
| H1 | Newsreader | 38–46 / 1.12 | 500 | paper / concept titles |
| H2 | Newsreader | 26–28 / 1.2 | 500 | section headings |
| Reading | Newsreader | 17–20 / 1.45–1.5 | 400 | answers, summaries, quotes |
| UI | IBM Plex Sans | 13–15 / 1.4 | 400–600 | controls, labels, cards |
| Caption | IBM Plex Sans | 12 / 1.35 | 400 | metadata, sources line |
| Overline | IBM Plex Sans | 12 / 1.3, +0.06em, uppercase | 500 | section labels |
| Mono | IBM Plex Mono | 11–13 | 400–500 | arXiv IDs, years, counts, ⌘K |

Rules: never below 12 px; body copy ≥ 15 px; maximum measure 72 ch for reading text; `font-variant-numeric: tabular-nums` on counts and years.

### 3.5 Space, shape, elevation, motion

| Scale | Values |
|---|---|
| Spacing (4 px base) | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 96 |
| Radius | chip 999 · control 8 · card 10–12 · panel 14 · composer 16 |
| Elevation | `e0` none · `e1` `0 1px 2px rgb(23 25 30 / .06)` · `e2` `0 6px 24px rgb(23 25 30 / .08)` (composer, popovers) · focus node `0 4px 14px rgb(23 25 30 / .25)` |
| Motion | `fast` 120 ms (hover, press) · `base` 200 ms (panels, chips) · `slow` 450 ms (edge draw-in) · easing `cubic-bezier(.2,.7,.2,1)` · all disabled under `prefers-reduced-motion` |
| Breakpoints | `sm` < 640 · `md` 640–1023 · `lg` 1024–1279 · `xl` ≥ 1280 · page max-width 1440, gutters 16 (sm) / 24 (md) / 32 (lg+) |
| Z-index | content 0 · sticky composer 10 · side panel 20 · popover 30 · palette / dialog 40 · toast 50 |

---

## 4. How verification looks on screen

This is what makes the product trustworthy; every component follows it.

| Kind of claim | Source | Looks like | Wording |
|---|---|---|---|
| **Verified lineage** | GROQ, `reviewDecision == "accepted"` | Solid coloured line or chip with relation label | "BLIP-2 **extends** BLIP" |
| **Citation fact** | GROQ, any link | Dotted grey line; chip "Cites · not yet reviewed"; counts in mono | "BLIP-2 **cites** Flamingo 5×" |
| **The paper's words** | Knowledge Base entry or `citation.contexts` | Serif quote block on surface, caption "From ‹Paper› · §‹Section›" | quoted verbatim, ellipsis only at ends |
| **AI-drafted text** | `origin: "ai"` (summaries, concept text) | Normal text + caption "Drafted by AI · not yet reviewed" | plain, no hedging words |
| **Our answer prose** | the Ask agent | Serif reading text, no box | 2–4 sentences, every claim backed by a card, chip or quote |
| **Absence** | no data | Quiet text + one next action | "Nothing yet. ‹Action› →" |

Never: a relation word ("extends", "inspired", "built on") for an unreviewed link; a quote without its section; a number without its source.

---

## 5. Components

Each entry lists its anatomy, variants and states, accessibility notes, and the data it draws on. Names map to `web/components/*`.

### 5.1 Global

**TopNav**: wordmark (link to `/`), nav links (current page in `--ink` with a 2 px underline and `aria-current="page"`), SearchButton (opens the palette; shows `⌘K`), VerifiedMeter. Sticky on scroll, `e1` shadow after 8 px of scroll.

**VerifiedMeter**: "**12** of 1,347 links verified" plus a 140 × 4 bar. Links to `/pipeline`. Live via `datasetStats` (Live Content API), and the bar animates its width on change (`base`). `aria-label="12 of 1,347 links verified"`.

**CommandPalette**: modal dialog (focus trapped, Esc closes, returns focus to the trigger). Results are grouped (Papers / Concepts / Themes / Ask), 8 per group, matched on shortName, title and aliases via GROQ `match`. Empty: "No paper or concept named ‹q›. Ask about it →".

### 5.2 Ask

**Composer**: a `<form>` with a labelled `<textarea>` (visually hidden label "Ask about papers and ideas"), helper line "Answers come only from the ‹N› papers in this dataset, with quotes.", and a 40 px submit button (`aria-label="Ask"`).
- Variants: `hero` (2 rows, 18 px, on first visit) and `docked` (1 row, auto-grows to 6, sticky at the bottom with 16 px offset).
- States: idle · typing · submitting (button shows a spinner, textarea stays editable) · rate-limited (helper turns `--warning`: "You've asked a lot. Try again in ‹m› min.") · disabled (only during an outage).
- Keys: Enter sends, Shift+Enter adds a new line, ↑ in an empty composer edits the last question. Max 500 characters (counter appears at 400).

**ExamplePrompt**: a pill button that fills and submits the composer. From `siteSettings.examplePrompts`.

**StartPaperTile**: shortName + year (mono), plus "‹n› later papers built on it". Links to `/explore?focus=`. From `siteSettings.startPapers`.

**UserMessage**: right-aligned ink bubble, radius `16 16 4 16`, max 70% wide (85% on mobile).

**AssistantAnswer**: no bubble, full width of the column. Content always comes in this order:
1. **Lead** (serif 19 px): 1–3 sentences that answer directly.
2. **Primary card**: ChainCard, CompareTable, PaperCardList or Leaderboard.
3. **Support** (optional): 1–2 QuoteBlocks and/or a second paragraph.
4. **SourcesLine**: "From ‹n› links: ‹v› verified, ‹u› not yet reviewed · Show in Explorer".
5. **FollowUps**: 2–4 chips.

Streaming: the lead streams token by token. Cards render **as their tool results arrive**, with a skeleton held at the final size (no layout shift). The sources line and follow-ups appear last. A "Stop" button replaces submit while streaming.

**ChainCard**: a horizontal sequence of nodes (year in mono, shortName in bold, concept name in `--ink-2`) joined by connectors coloured per §3.2. The last node is the focus (ink fill). Nodes are links that open the side panel. Below 640 px it becomes a vertical ordered list (board 3). `role="list"`; each connector has a visually hidden "then, via ‹relation or "cites"›".

**CompareTable**: a real `<table>` with `scope` headers. The first row is "Shared" (concept chips spanning both columns); then one row per difference. At most 5 rows, with "Show full comparison" linking to a dedicated view.

**QuoteBlock**: a `<figure>` holding a serif `<blockquote>` and a `<figcaption>` "From ‹Paper› · §‹Section› · cited ‹n›×". From a Knowledge Base entry or `citation.contexts[evidenceKey]`. Max 3 lines collapsed, with "Show more" to expand.

**FollowUpChip**: a pill button that submits its text. Generated by the agent, but each must be answerable from the data (the agent's system prompt says so).

**SourcesLine**: caption text plus a link. Counts come from the answer's cited `_id`s.

**OpenedPanel** (side panel, ≥ 1024 px): a `tablist` of papers and concepts opened from the conversation (max 6; the oldest closes first). A paper tab shows: chips (kind, month year, arXiv ID), the H2 title, authors ("‹3› and ‹n› others"), the summary (with AI caption) or the first two sentences of the abstract, Introduces (concept chips), a pair of stat tiles (built on / built on it, with names), and actions "Open full page", "Explore its lineage", "Ask about ‹Paper›". Below 1024 px the panel becomes a bottom sheet (90% height, drag handle, Esc / swipe down to close).

**Answer states**

| State | Trigger | Design |
|---|---|---|
| Answered | structural + content claims found | full anatomy |
| Partial | answer relies on unreviewed links only | lead + cards + note "These links haven't been reviewed yet, so they show what the papers cite, not how they're related." |
| No path | `path(a,b)` empty | "‹A› and ‹B› aren't connected in this dataset." + nearest shared concept, if any + "Suggest a missing link" |
| Out of scope | neither endpoint has it | "This dataset doesn't cover that. It traces 197 papers back from BLIP-2." + 3 example prompts. Logged as a `gap`. |
| Conflict | KB contradicts GROQ | GROQ wins on screen; footnote "A story about this is being updated." |
| Error | model or MCP failure | "Something went wrong answering that. Try again" + retry button; the question text is kept |

### 5.3 Graph (Explorer, Paper "Neighbourhood", Desk preview)

**YearRuler**: columns per year that has papers in view; mono 12 px labels; dashed `--line` guides.
**PaperNode**: 104 × 44, radius 8, shortName (13 px / 600, ellipsis) and "year · kind" (mono 10.5 px; kind only when not "method").
- Variants: default · focus (ink fill, white text, focus shadow) · selected endpoint (2 px ink border) · dataset (hidden by default; dashed border when shown) · dimmed (40% opacity when filtered).
- Interaction: click opens the edge or paper inspector; double-click refocuses the Explorer; keyboard Tab moves in year order, Enter opens.
**LinkEdge**: a cubic Bezier from the right edge of the source node to the left edge of the target. Styles per §3.2. The selected edge is ink, 2.5 px, with a pill label "cites 5× · unreviewed" at the curve's midpoint. Hover thickens by 1 px. Edges are focusable via a hidden list in the inspector ("Links in view").
**GraphControls**: "Generations back" segmented control 1 / 2 / 3 (`aria-pressed`), plus checkboxes "Verified only", "Hide datasets", "Simplify" (transitive reduction).
**Legend**: relation swatches plus the unreviewed pattern, always visible under the graph.
**Inspector** (right column, 360 px): for a selected link, the citation fact tiles, QuoteBlock, the relation (verified) or the "not yet reviewed" explainer, and actions. For a selected paper: a compact OpenedPanel.
Layout: ELK `layered`, left → right, x snapped to the year column. Edges drawn with SVG under HTML nodes. More than 60 nodes in view switches "Simplify" on automatically, with a toast.

### 5.4 Pages

**ConceptChip**: concept name (13 px / 500) + theme (11 px, `--muted`); a strong variant (ink border) for "Introduces".
**EvolutionStep**: a timeline row (year · dot + connector · content). The connector is coloured per relation or dotted. The content holds the paper link, concept name, summary, and a nested link-evidence card.
**StatTile**: number (20–22 px / 600) + label + optional names line.
**BuiltOnRow**: grid `170px 1fr`. Left: paper link, mono facts, relation chip (verified only). Right: QuoteBlock-lite (serif 15.5 px) + section caption.

### 5.5 Feedback and system

**Toast**: bottom-centre, 4 s, `role="status"`.
**Skeleton**: `--line` blocks at the final size, with a 1.2 s pulse that's disabled under reduced motion.
**EmptyState**: one sentence + one action link; no illustration.

---

## 6. Screens

All desktop layouts are on a 12-column grid inside a max width of 1440 with 32 px gutters. Heights are content-driven.

### 6.1 Ask: first visit (board 1)
- One centred column (max 820). Hero (display + 17 px lead) → hero Composer → "Try asking" (6 ExamplePrompts) → "Or start from a paper" (3 × 2 StartPaperTiles) → dataset line (mono counts, live from `datasetStats`).
- Focus goes to the composer on load (no scroll jump on mobile).

### 6.2 Ask: conversation (board 2)
- Grid `minmax(0,1fr) 440px`. The conversation column (max 860, centred) holds messages and a docked Composer. On the right is the sticky OpenedPanel (top 20 px).
- New answers scroll into view at the user message (not the bottom), so the lead is visible first.
- The conversation persists per browser (`localStorage`, with try/catch) and is shareable via `/ask/[id]`. The server keeps only the anonymised `questions.*` record.

### 6.3 Explorer (board 4)
- Header: overline "Lineage of", H1 shortName + year, controls on the right. Body grid `minmax(0,1fr) 360px`: graph card + legend | inspector.
- Default focus BLIP-2, depth 2, datasets hidden, simplify on.
- Empty: a focus with no ancestors shows "‹Paper› has no earlier papers in this dataset."

### 6.4 Paper (board 5)
- Grid `minmax(0,1fr) 400px`. Main: breadcrumbs, chips, H1, authors, summary (AI caption), **Built on** (verified first, then "Also cited · not yet reviewed (n)" with 4 shown and "Show n more"), **Led to** (or its honest empty state), Abstract (collapsed).
- Aside (sticky): Neighbourhood mini-graph (≤ 8 nodes), Concepts (Introduces / Uses with theme), "Where this comes from" provenance note, key figure (when present, with caption and alt).

### 6.5 Concept (board 6)
- Grid `minmax(0,1fr) 380px`. Main: breadcrumb (Concepts / Theme / Concept), chips (category, "Introduced by ‹Paper› · year"), H1, summary, **How this idea evolved** (EvolutionSteps, oldest first), **Papers using this** (list). Aside: other concepts in the theme (name + introducing paper), "Next questions" (Ask links prefilled).

### 6.6 Theme, Story, Pipeline (no boards yet; specs only)
- **Theme**: H1 + summary; concepts on a horizontal year axis (each concept at its introduction year, with a bar until its last use in the dataset); a list underneath for screen readers.
- **Storyline**: scrollytelling. Narrative on the left (serif 19 px, Portable Text with paper/concept/link mentions as underlined links with hover cards); a sticky ChainCard on the right that highlights the current step. Stacks on mobile.
- **Pipeline**: the verified meter as a hero, "Recently verified" (live list), workflow kanban (fetching → enriching → checks → curation → publishing → published), each card showing paper, stage age and actor (AI / human chip). Read-only, no login.

---

## 7. Ask: conversation design

| Rule | Detail |
|---|---|
| Length | Lead ≤ 3 sentences; a whole answer fits one desktop viewport above the follow-ups |
| Naming | Always "ShortName (year)" on first mention, then shortName |
| Numbers | Counts and years in mono; every number from a tool result |
| Relation words | Only for accepted links; otherwise "cites ‹n›×" |
| Quotes | ≤ 2 per answer, verbatim, with section |
| Uncertainty | State the data limit plainly ("in this dataset"); no "I think", "might", "it seems" |
| Follow-ups | 2–4, each answerable; mix of deeper (same topic), sideways (compare) and action (make a storyline) |
| Refusals | Off-topic questions get the out-of-scope state; no general-knowledge answers |
| Tone | Plain, specific, calm; a knowledgeable librarian, not a hype account |

---

## 8. Responsive behaviour

| Element | ≥ 1280 | 1024–1279 | 640–1023 | < 640 |
|---|---|---|---|---|
| Ask | conversation + 440 px panel | + 380 px panel | panel → bottom sheet | single column; docked composer full-width; bottom nav |
| ChainCard | horizontal | horizontal | horizontal, scrolls | vertical list |
| Explorer | graph + inspector | graph + inspector (320) | graph; inspector → sheet | **list mode**: "Built on" grouped by generation (board 8) |
| Paper / Concept | main + aside | main + aside (340) | aside below main | single column; mini-graph hidden |
| CompareTable | table | table | table | stacked cards per row |

Touch targets ≥ 44 px; no hover-only information (hover cards also open on focus or tap).

---

## 9. Accessibility checklist

- Text contrast ≥ 4.5:1 (all tokens in §3 pass); meaningful graphics ≥ 3:1 (the unreviewed line fixed to `#7E848E`).
- Relations always carry text labels; colour and line pattern are redundant signals.
- Every graph has a text equivalent: a "Links in view" list in the inspector and a list mode on mobile.
- Real elements only: `<button>`, `<a href>`, `<form>`, `<table>`, `<figure>`. Icon-only buttons have `aria-label`.
- Live regions: streaming answers in `aria-live="polite"` (the lead only, not every token; cards announced as "‹n› papers found"); toasts as `role="status"`.
- Focus: visible 2 px `--ink` outline with 2 px offset; palette, dialogs and sheets trap focus and return it.
- `prefers-reduced-motion` disables edge draw-in, pulses and smooth scrolling.
- `lang` set; headings in order (one H1 per page); images (key figures) need `alt` (enforced in the schema).

---

## 10. Curator surfaces

### 10.1 Sanity Studio (customisations)

| Customisation | UX |
|---|---|
| **Evidence picker** (`influence.evidenceKey`) | Lists every citation sentence as a radio card (section overline, sentence with the cited author highlighted). Selecting one writes its `_key`. The current one has an ink border. Empty: "No citation sentences were captured." |
| **Relation picker** (`influence.relation`) | Radio list with colour swatches (§3.2), title and one-line meaning. The suggested relation is tagged "Suggested · ‹origin› · ‹confidence›". |
| **arXiv input** (`paper.arxivId`) | Paste a URL and it normalises to an ID on blur; inline ✓ format and ✓ unique (async); link "Open on arXiv". |
| **Views** | Paper: *Lineage* (mini-graph, 2 hops, drafts dashed), *Source* (sections of `paperText`). Link: *In context* (the full paragraph around each sentence). Concept: *Evolution* (EvolutionSteps). |
| **Document actions** | On links: Accept (sets the decision + reviewer + time, then publishes), Reject, Relabel. On papers: Re-harvest. On concepts: Promote. |
| **Badges** | Origin (harvest / AI / curator) and review state on lists and the document header. |
| **Structure** | Already deployed: Papers by kind, Lineage links (Unreviewed, Unreviewed · cited in Method, Verified, Rejected), Concepts by theme, Storylines, Questions & gaps, Full texts, singletons. |

### 10.2 Lineage Desk (App SDK, board 7)

- Built with Sanity UI, so it follows the Dashboard theme (light/dark) and system font; it doesn't use the public site's tokens.
- **Layout:** 270 px queue | flexible review column | 320 px preview and activity.
- **Queue tabs:** Backlog · Pipeline · Inbox (questions and gaps). Items show shortName, year, a flag dot (has check warnings) and the count to review.
- **EdgeCard:** header (A → B, counts, confidence, check badge), quote with the cited author highlighted, relation radio group (suggestion marked "AI" or "Harvest"), actions Accept (A), Reject (R), Rewrite explanation (Agent Action, shows its credit cost), Open in Studio. The focused card has a 2 px blue ring. Fixed-height skeleton while loading.
- **Bulk:** "Accept all high-confidence (n)" shows a confirmation with the count and list, then one batched transaction.
- **Keyboard:** `J/K` move · `A` accept · `R` reject · `E` edit relation · `1–8` choose relation · `⌘↵` publish reviewed · `?` shortcuts help.
- **Activity:** live feed from document events ("‹You› accepted CLIP → BLIP-2 · 2 min ago").
- **No save buttons:** every change writes immediately; undo comes from a toast.

---

## 11. Implementation notes

| Concern | Decision |
|---|---|
| Styling | Tailwind v4 with `@theme` mapped to the CSS variables in §3; no component library on the public site |
| Fonts | `next/font/google`: Newsreader (opsz), IBM Plex Sans, IBM Plex Mono; `display: swap` |
| Graph | `@xyflow/react` + `elkjs` (layered); custom node/edge components per §5.3 |
| Data | Site reads via `next-sanity` `defineLive`; Ask cards fetch by `_id` with typed GROQ (TypeGen); interpretation fields projected with `select(provenance.reviewDecision == "accepted" => …)` |
| Streaming | Vercel AI SDK UI message stream; tool results map to card components by tool name |
| Icons | Inline stroke SVG at 16 / 18 px, `currentColor`; no emoji |
| Testing | Contrast checked in CI (token table); axe on Ask, Explorer and Paper; known-answer checks from CONTEXT_SETUP for Ask |

### Component → data map

| Component | Source | Query / tool |
|---|---|---|
| VerifiedMeter, dataset line | GROQ | `*[_id=="datasetStats"][0]` |
| ExamplePrompt, StartPaperTile | GROQ | `*[_id=="siteSettings"][0]{examplePrompts, startPapers[]->{shortName, publishedAt, slug}}` |
| ChainCard, PaperCard, SourcesLine | GROQ (by cited `_id`) | card queries in `web/sanity/queries.ts` |
| QuoteBlock (paper words) | Knowledge Base / `citation.contexts` | `knowledge_base_read` / `evidenceKey` |
| Explorer graph | GROQ | focus + depth query, interpretation projected only when accepted |
| Concept evolution | GROQ | concept + introducing papers + links between them |
| Desk lists and cards | App SDK | `useDocuments` (handles) + `useDocumentProjection` per card |

---

## 12. Open design questions

1. Should the Map view ship, or does the Explorer + Ask cover discovery? (Currently the first cut.)
2. Dark mode for the public site at launch, or light only? Tokens are ready; the graph needs a dark-mode pass.
3. Key figures: pulling the first figure from the ar5iv HTML is feasible, but needs captions and alt text written or reviewed before publishing.
4. Should a follow-up chip ever trigger an action (e.g. "Make this a storyline") without a confirmation? Proposal: yes for drafts, since curators review them.

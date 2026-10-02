# UX & App SDK Review (after real data)

Date: 2026-10-02 · Inputs: the harvested BLIP-2 lineage dataset (`data/`), the App SDK docs (best practices, hooks, editing), and the Workflows App SDK guide.
This document **changes the spec**. Each change is marked **→ SPEC** and is folded into `SPEC.md`.

---

## 1. What the real data changed

The spec was written for 9 hand-picked papers. The real dataset traced back from BLIP-2 is a different shape:

| Property | Spec assumption | Real data | Consequence |
|---|---|---|---|
| Papers | 9 | **205** (harvested 229, 24 excluded as off-topic) across 2013–2023 | Showing the whole graph on the homepage would be unreadable |
| Lineage edges | ~10, hand-written | **1,369**, mined from citation text | One-by-one review won't scale; a bulk triage UX is needed |
| Node types | all "methods" | methods **plus datasets** (COCO, Visual Genome, LAION, CC12M) and benchmarks (VQA) | Datasets need their own look and filter |
| Edge certainty | all verified | citation facts are certain, but the *relation label* is a guess | Facts and interpretations must be modelled separately (see §2) |
| Edge text | hand-written explanation | the citing sentence plus mention counts per section | The evidence quote comes free on every edge |

---

## 2. Main schema change: separate facts from interpretations

A mined edge mixes two kinds of claim:

1. **Citation fact** (objective, verifiable): *BLIP-2 cites ALBEF 9 times, including in its Method section: "…"*.
2. **Lineage interpretation** (a judgment call): *BLIP-2 **extends** ALBEF, inheriting **image–text matching***.

**→ SPEC §4.2:** `influence` gets a read-only `citation` object `{mentions, methodMentions, sections[], contexts[]}`. These facts are always publishable. The interpretation fields (`relation`, `inherited`, `explanation`) appear on the public site **only when `provenance.reviewDecision == "accepted"`**. Enforced in GROQ:

```groq
"relation": select(provenance.reviewDecision == "accepted" => relation),
"explanation": select(provenance.reviewDecision == "accepted" => explanation)
```

As a result:
- The site has a **full graph from day one**. Unreviewed edges render as neutral dotted "cites" links, with the quote and mention counts.
- Curation turns dotted citations into **typed, coloured lineage** one at a time. That is visible progress, and the Lineage Desk makes it fast.
- The provenance stays honest: nothing interpretive is shown until a human accepts it. This is a strong talking point for "schema thoughtfulness".

**→ SPEC §4.1:** `paper.kind`: `method · dataset · benchmark · analysis`. Seeded from a short hand list. Datasets render as distinct nodes and can be filtered out.

**→ SPEC §4.1:** `paper.shortName` (e.g. "BLIP-2", "ALBEF"). Long titles can't be graph labels.

**→ SPEC §4.2:** `provenance.origin` gains `harvest`. The full set is `harvest` (mined from citation text) · `ai` (Agent Action pipeline) · `curator` (written by a person).

---

## 3. Public site UX changes

| # | Problem | Change |
|---|---|---|
| U1 | A ~250-node graph on `/` is a hairball | **Lineage Explorer** replaces the full graph. One focus paper (default BLIP-2) sits on the right, with ancestors fanning left by year. A **depth control (1–3 hops)** sets how far back to show. Toggles: *verified only*, *hide datasets*, relation filter. Clicking any node makes it the focus. The URL holds the state (`/?focus=clip&depth=2`) |
| U2 | People need the big picture too | A **Map** view (second tab) arranges all papers in **swimlanes by area** (Vision backbones · Language models · Vision-language · Self-supervised · Data & benchmarks) against a year axis. Edges stay hidden until you hover or select a node, so there's no hairball |
| U3 | Even 3 hops is dense | **Transitive reduction is on by default**: if A→B→C exists, the direct A→C edge is hidden unless it is accepted lineage. A "show all citations" toggle brings them back |
| U4 | 250 papers need search | **⌘K command palette** over papers, concepts and authors. "Search this graph" filters the Map view |
| U5 | "Why is this link here?" | The edge popover shows the **citation fact** first ("cited 9×, 3× in Method"), then the quote, then the interpretation if it's been accepted. Dotted links carry an "unreviewed" chip |
| U6 | The paper page needs context | A **"Path to BLIP-2"** breadcrumb shows the shortest lineage path from this paper to the root, e.g. *Transformer → ViT → CLIP → BLIP → BLIP-2* |
| U7 | Curation progress is invisible to visitors | A small **"N of M links verified"** meter in the header links to `/pipeline`. Visitors can see the dataset improving live, which demonstrates the Live Content API |
| U8 | Mobile | The Explorer becomes a vertical list: the focus paper, then "Built on" sections grouped by hop. The Map view is desktop-only and shows a notice on small screens |
| U9 | Storylines are expensive to write | **Suggested storylines**: the longest paths made entirely of verified edges are offered as story candidates in the Desk Composer (§4, D7) |

---

## 4. Lineage Desk (App SDK): review against Sanity's best practices

Checked against *App SDK best practices*, *Editing documents*, *React hooks* and *Build a workflow interface with the App SDK*.

### What the spec got right
- A purpose-built review surface rather than another read-only frontend, which is what the bonus asks for.
- Keyboard-first triage, and real-time collaboration between two curators.

### What must change

| # | Spec said | Best practice says | Change → SPEC §6.2 |
|---|---|---|---|
| D1 | "useDocuments for draft influence…" plus big queries | Fetch **document handles** with `useDocuments`, then render each card in its own component using `useDocumentProjection`. **One Suspense-ful hook per component**, with Suspense around every card | `EdgeList` uses `useDocuments({documentType:'influence', filter:'to._ref == $paper && provenance.reviewDecision == "proposed"'})`. Each `EdgeCard` uses `useDocumentProjection` and is wrapped in `<Suspense>` with a **fixed-height skeleton** so the layout doesn't jump |
| D2 | Inline edit, then save | **No save, submit or lock buttons.** Read with `useDocument` and write with `useEditDocument`, without copying into local state | The explanation and relation pickers write straight to the document. Undo is a toast that writes the previous value back |
| D3 | Accept = set `reviewDecision` | `useEditDocument` writes to the **draft**. Seeded edges are *published*, so accepting has to publish too | **Accept** = a single `useApplyDocumentActions` call doing `[editDocument(reviewDecision='accepted'), publishDocument(handle)]` in one transaction. **Reject** = edit and publish as well (the rejection is kept as data, so the edge stays hidden). Pipeline-created AI edges are still drafts until the workflow's `publish-bundle` |
| D4 | One edge at a time | There are 1,369 mined edges, and the SDK supports batchable document actions | **Triage mode**: group by citing paper, with "Accept all high-confidence" (confidence ≥ 0.8 **and** cited in Method) as **one batched `apply()`**. It shows the count before applying |
| D5 | (missing) | `useAgentPatch` makes schema-validated Agent Action edits from the app | **✨ Rewrite** on a card: Agent Action *patch* rewrites `explanation` from the evidence quote and the chosen relation. It shows the AI-credit cost, and the result appears live like any other edit |
| D6 | (missing) | `useNavigateToStudioDocument`, `useDocumentEvent`, `useProjectMembers` | **Open in Studio** link on every card. **Live activity feed** ("Akash accepted ALBEF → BLIP") from `useDocumentEvent`. Assignee avatars from the Workflows `AssigneePicker` and `useProjectMembers` |
| D7 | Review only | Pages built with the App SDK should do things you can't do in the Studio | **Storyline Composer** tab: pick a verified path in the graph to create a `storyline` with ordered steps. The narrative is edited with **`SDKPortableTextEditable`**, which shows other people's cursors live. This is real collaborative authoring, not a CRUD form |
| D8 | Workflow queue only | Seeded papers never go through the intake workflow | Two queues: **Pipeline** (workflow instances in `curation`, via `useWorkflowInstances` + `useWorkflowSession`) and **Backlog** (seeded papers with proposed edges, via `useDocuments`). Both use the same card UI |
| D9 | Graph preview queries everything | `useQuery` puts performance on you | The preview uses `useQuery` with a **tight projection limited to the paper's 2-hop neighbourhood**. Accepted edges are solid and proposed edges are dashed |
| D10 | Custom styling | The Dashboard and Studio use Sanity UI | Build with **`@sanity/ui`** so the Desk looks native in the Dashboard. Light and dark follow the Dashboard |

### Workflow integration (App SDK side)
- `useWorkflowSession` mounts the session for the open paper. Actions such as **Approve & publish** and **Send back (note)** render from the session's *evaluation*, never hard-coded. A disabled action shows the engine's *insight* text as its reason (e.g. "2 edges still proposed").
- `useDocumentWorkflows(handle)` adds a stage chip next to each paper in both queues.
- The engine's checks are advisory (see the Workflows early-access notes). The real gate is also enforced in the `publish-bundle` handler and in GROQ (§2).

---

## 5. Studio changes from the data

- **Data health** sidebar lists, now useful with real data:
  - accepted edges with no inherited concept
  - papers with 0 accepted ancestors
  - `kind=dataset` papers with no `dataset` doc
  - edges whose only quote is from Related Work (weak evidence)
- **Concept tagging** (49 concepts): a "Concept coverage" list shows concepts used by fewer than 2 papers, which are candidates to merge.
- The Lineage view tab and validation rules are unchanged.

---

## 6. Updated priority (replaces SPEC §9 ordering where they differ)

1. Schema with fact/interpretation split, plus seed of the curated data (all edges published as *proposed citations*)
2. Explorer + paper page (dotted vs typed edges), live
3. **Lineage Desk**: Backlog queue, EdgeCard, Accept/Reject as batched actions, Triage mode. *This becomes the main demo.*
4. Workflow pipeline for new papers, then the Desk Pipeline queue
5. Map view, ⌘K, Composer (`SDKPortableTextEditable`), `useAgentPatch` rewrite
6. Story page, `/pipeline`, polish

The cut order is unchanged, plus: Map view → Composer → Rewrite before the existing cut list.

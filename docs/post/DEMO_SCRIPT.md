# Demo script: Paper Lineage (target 2:45, hard cap 3:00)

**Goal:** in under three minutes a judge sees the problem, the agent on Sanity Context + Knowledge Base (Path One), and the working app with App SDK + Workflows (Path Two), and sees that the "facts vs interpretation" rule is enforced, not claimed.

**Setup:** 1440×900, browser zoom 110%, light mode. Window 1 = the site; window 2 = Sanity Dashboard (Lineage Desk). Record each scene as its own clip; join in editing.

## Before recording

1. Start the intake runner (scene 6 needs it):
   ```bash
   cd ~/Documents/paper-lineage/workflows && npm run runner
   ```
2. Log in to the Sanity Dashboard in window 2 and open **Lineage Desk**.
3. **Choose the link you'll accept on camera**, and read its evidence first. Accepting is a real curation decision. Suggested: **BLIP → BLIP-2**, Method sentence *"Inspired by BLIP (Li et al. 2022), we jointly optimize three pre-training objectives that share the same input format and model parameters."*, suggested relation **extends**.
4. **Rehearse scene 5 once:** Accept, watch `/paper/blip-2` in window 1 update within a few seconds, then press **Undo** in the toast. If the page doesn't update, reload it once and note it, so you can retake with a reload.
5. Open tabs in window 1: `/` (click **New conversation**), `/concept/q-former`, `/explore`, `/paper/blip-2`.
6. Ask the scene 2 question once off camera, so the Context endpoints are warm.

## Scenes

| # | Time | On screen | Say (voice-over) | Caption |
|---|---|---|---|---|
| 1 | 0:00–0:12 | Home page, cursor in the box | "Ask an AI where an idea came from and you get a confident paragraph. Paper Lineage gives you the chain, with the sentence each paper used to cite the one before it." | *Every idea has ancestors* |
| 2 | 0:12–0:50 | Type **Where did BLIP-2's Q-Former come from?** → the violet progress line ("Searching the lineage graph…", "Reading blip2 in the Knowledge Base…") → *cut the wait* → answer: lead, chain cards, follow-ups | "The agent works over two Sanity Context endpoints: GROQ over the lineage graph for *who built on whom*, and a Knowledge Base built from 40 papers for *how it works*. The cards aren't written by the model: the server rebuilds each one from Sanity and checks it. And it says *cites*, not *extends*, because no curator has verified these links yet." | *Sanity Context: GROQ + Knowledge Base* · *cards verified on the server* |
| 3 | 0:50–1:12 | `/concept/q-former`, slow scroll down the six steps | "The same idea as a timeline: Bahdanau attention, 2014, then Transformer, Set Transformer, Perceiver, Flamingo, BLIP-2. Every step is a real citation, with the sentence." | *6 steps · each one a citation* |
| 4 | 1:12–1:35 | `/explore`: click **CLIP** (violet highlight, its links light up), then click one of its links → evidence sentence in the panel | "Explore is the whole family tree: 197 papers and 1,349 links, mined from full text. Select a paper and its neighbourhood lights up; select a link and you get the evidence." | *197 papers · 1,349 links* |
| 5 | 1:35–2:20 | Split screen. Desk **Review** → find **BLIP-2** in the queue (papers with low-confidence links are listed first; scroll before recording so it's in view) → the BLIP card: evidence sentence, relation *extends* → **Accept** → window 1 `/paper/blip-2`: BLIP moves to *Verified* with "Extends" | "Curators use the Lineage Desk, a Sanity App SDK app. I read the evidence, pick the relation, and accept. That's one transaction, and the Live Content API updates the site. Only now can the site, and the agent, say BLIP-2 *extends* BLIP." | *App SDK · one transaction · live update* |
| 6 | 2:20–2:38 | Desk **Pipeline**: the BLIP-2 intake → **Re-check links** → count drops by one → **Approve** still disabled, with the engine's reason | "New papers go through a Sanity Workflow. Approval is gated by the workflow engine itself: while any link into the paper is unreviewed, it refuses." | *Sanity Workflows: the engine enforces the gate* |
| 7 | 2:38–2:45 | Architecture image (`docs/post/diagrams/architecture.png`) | "Context, Knowledge Base, App SDK, Workflows, on Sanity's free plan. Every idea has ancestors." | *paper-lineage-xi.vercel.app* |

## If things go wrong

- **Ask is slow (over 40 s) or refuses a card:** keep recording; the progress line covers the wait, then cut it. A refused card never shows. If the answer is thin, ask again: answers vary between runs.
- **The page doesn't update live in scene 5:** reload once and keep the take; say "the site picks it up" instead of "instantly".
- **Running long:** drop the link click in scene 4 (−8 s), then shorten scene 3's scroll (−8 s).

## After recording

- Undo nothing you accepted on camera unless you disagree with it: it's a real review.
- Upload to YouTube or Loom (unlisted is fine) and paste the link into both posts' **Demo** sections.

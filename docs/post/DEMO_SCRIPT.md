# Demo script: Paper Lineage (target 3:00)

**Storyline:** a known problem → what I built → the architecture → six features, each on a Sanity product, and the advantage → how Sanity Context is configured → one real question, in real time → the same features in the running app → the same activity inside Sanity's dashboards.

**One spine, three formats.** The deck and this script use the same parts in the same order. The blog (`POST.md`) follows the DEV submission template, so it holds the same content under the template's headings (mapped below). The deck's speaker notes are the "Say" lines below, word for word.

| # | Part | Deck slide | Blog section | In the video |
|---|---|---|---|---|
| 1 | A known problem | 2 | What I Built (the problem) | slide |
| 2 | What I built | 3 | What I Built (the app) | slide |
| 3 | Architecture | 4, 5 | What I Built → Architecture | slides |
| 4 | Six features, each on Sanity | 6, 7 | What I Built → Six features, each built on Sanity | slides |
| 5 | Sanity Context: configured once, used on every question | 8 | Sanity Project Details → How Ask uses Sanity Context | slide |
| 6 | One real question, in real time | 9, 10 | Sanity Project Details → How Ask uses Sanity Context (the trace) | slide 9, then the live site |
| 7 | In the app | 11–15 | Demo (screenshots) · My Build Process → Reaching past the Studio | live site + Lineage Desk (slides 11–15 are the fallback screenshots) |
| 8 | Where to see it inside Sanity | 16 | (not in the post) | live Sanity Dashboard |
| 9 | Close | 17, 18 | My Build Process | slide 18 |

**Setup:** 1440×900, light mode, browser zoom 110%. Window 1 = the deck in present mode. Window 2 = the site. Window 3 = the Sanity Dashboard. Record each part as its own clip and join them in editing.

## Before recording

1. Start the intake runner (part 7 needs it):
   ```bash
   cd ~/Documents/paper-lineage/workflows && npm run runner
   ```
2. Log in to the Sanity Dashboard in window 3. Open four tabs: **Context → Knowledge Bases → Paper Lineage: papers**, **Context → MCP**, **Lineage Desk → Review**, **Lineage Desk → Pipeline**.
3. **Choose the link you'll accept on camera**, and read its evidence first: accepting is a real curation decision. Suggested: **BLIP → BLIP-2**, Method sentence *"Inspired by BLIP (Li et al. 2022), we jointly optimize three pre-training objectives…"*, suggested relation **extends**.
4. **Rehearse the accept once:** Accept, watch `/paper/blip-2` update within a few seconds, then press **Undo** in the toast. If the page doesn't update, reload it once and note it.
5. Window 2 tabs: `/` (click **New conversation**), `/concept/q-former`, `/paper/blip-2`.
6. Ask the part 6 question once off camera, so the Context endpoints are warm.
7. **Record part 6 before part 7.** Part 6 says "cites, not extends"; that stops being true for BLIP once you accept the link in part 7.

## Script

| Part | Time | On screen | Say (voice-over) | Caption |
|---|---|---|---|---|
| 1 | 0:00–0:12 | Slide 2, *A known problem* | "This is a known problem. Ask an AI where an idea came from and you get plausible verbs: the Q-Former *extends* Flamingo's resampler. Citation graphs say that one paper cites another, not how it built on it, and nothing tells you which verb is wrong." | *A known problem* |
| 2 | 0:12–0:24 | Slide 3, *What I built* | "I built Paper Lineage for this: a family tree of 197 AI papers, traced back from BLIP-2. It keeps facts, like *BLIP-2 cites Flamingo five times, with the sentences*, apart from interpretations like *extends*, which appear only after a curator accepts them." | *Facts vs interpretation* |
| 3 | 0:24–0:44 | Slide 4, *Architecture at a glance* → slide 5, *Three paths* | "Here's the architecture. Everything in red is Sanity. Three paths go through it. A visitor asks, and our agent reads Sanity Context. A curator reviews in an App SDK app, and the Live Content API updates the site. A new paper runs through a Sanity Workflow." | *Red = Sanity* |
| 4 | 0:44–1:04 | Slide 6, *Six features* → slide 7, *What Sanity saved me from building* | "It has six features, each on a Sanity product: Ask on Context MCP over GROQ; paper explanations from a Knowledge Base; the evidence graph in the Content Lake; live verified labels on the Live Content API; the Lineage Desk on the App SDK; and paper intake on Workflows. The advantage: no vector database, curator login, websocket layer, workflow engine or admin UI to build. All on the free plan." | *Six features · six Sanity products* |
| 5 | 1:04–1:16 | Slide 8, *Sanity Context: configured once* | "Context is configured once: 42 files go into a Knowledge Base with the `sanity context` CLI, and two MCP endpoints serve it, one in GROQ mode over the graph and one over the Knowledge Base. Every question then uses both." | *Configured once · used on every question* |
| 6 | 1:16–1:50 | Slide 9 for 3 s → window 2 `/`: type **Where did BLIP-2's Q-Former come from?** → the progress line ("Searching the lineage graph…", "Reading blip2 in the Knowledge Base…") → *cut the wait* → the answer: lead, chain cards, follow-ups | "This is how it runs in real time. The agent writes its own GROQ against the graph and reads the Knowledge Base entry. Then the server rebuilds every card from Sanity and checks it; the model never writes a card. And it says *cites*, not *extends*, because no curator has verified these links yet." | *Sanity Context: GROQ + Knowledge Base* · *every card checked on the server* |
| 7a | 1:50–2:00 | `/concept/q-former`, slow scroll through the six steps | "The same idea as a timeline: six steps from Bahdanau attention to BLIP-2, each one a real citation, with its sentence." | *Every hop is a citation* |
| 7b | 2:00–2:08 | Click the **Explore** tab: it opens on the paper the answer was about. Click one of its links → the evidence sentence in the panel | "Explore opens on the paper the answer was about. Select a link and you get its evidence." | *197 papers · 1,349 links* |
| 7c | 2:08–2:30 | Window 3 *Lineage Desk → Review* → **BLIP-2** → the BLIP card: evidence, relation *extends* → **Accept** → window 2 `/paper/blip-2`: BLIP moves to *Verified*, "Extends" | "Curators use the Lineage Desk, an App SDK app in the Sanity Dashboard. I read the evidence and accept. That's one transaction, and the Live Content API updates the site. Only now can the site, and the agent, say BLIP-2 *extends* BLIP." | *App SDK · Live Content API* |
| 7d | 2:30–2:40 | *Lineage Desk → Pipeline*: the BLIP-2 intake → **Re-check links** → the count drops by one → **Approve** still disabled, with the engine's reason | "New papers run through a Sanity Workflow. The engine itself refuses approval while any link into the paper is unreviewed." | *Sanity Workflows: the engine enforces the gate* |
| 8 | 2:40–2:55 | Window 3 *Context → Knowledge Bases → Paper Lineage: papers*: sources, entries, open the **blip2** entry → *Context → MCP*: the two endpoints, their modes and the `groqFilter` | "And here it is inside Sanity: the Knowledge Base, 42 sources built into 20 entries, including the blip2 entry the agent just read. And the two MCP endpoints it called." | *Inside Sanity: Context* |
| 9 | 2:55–3:00 | Slide 18, *Every idea has ancestors* | "Paper Lineage: every idea has ancestors. Try it at paper-lineage-xi.vercel.app." | *paper-lineage-xi.vercel.app* |

Part 8 shows the two Context frames of slide 16 live. Its other two frames, the Desk and Pipeline, are already on screen in 7c and 7d, which run inside the Sanity Dashboard.

Slides 10 (*The model never writes a card*) and 17 (*Built in two days*) aren't shown in the video. Part 6's voice-over covers slide 10, and the blog's *My Build Process* covers slide 17.

## If things go wrong

- **Ask is slow (over 40 s) or refuses a card:** keep recording. The progress line covers the wait; cut it in editing. A refused card never shows. If the answer is thin, ask again: answers vary between runs.
- **You retake part 6 after accepting in 7c:** the BLIP link now says *extends*. Change the last line to "It says *extends* for BLIP, which a curator verified, and *cites* for Flamingo, which nobody has yet."
- **The page doesn't update live in 7c:** reload once and keep the take. Say "the site picks it up" instead of "updates the site".
- **The progress line in part 6 didn't name `blip2`:** in part 8, open whichever entry it named, and say "the entry the agent just read".
- **The Knowledge Base page looks different from the slide:** show whatever lists the sources and entries. Don't narrate numbers the screen doesn't show.
- **Running long:** drop slide 5 from part 3 (−8 s), then 7b (−8 s), then shorten 7a's scroll (−5 s).

## After recording

- Don't undo what you accepted on camera unless you disagree with it: it's a real review.
- Upload to YouTube or Loom (unlisted is fine) and paste the link into both posts' **Demo** sections.

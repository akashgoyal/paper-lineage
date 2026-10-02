# Build Log

The honest record of building Paper Lineage with an AI coding agent (Claude Code).
Updated **during** the build. Each entry: goal · prompt · what the AI produced · what was wrong · fix · time.

---

## 2026-10-02 · Session 1: from idea to spec

**Goal:** pick an idea, design the architecture, write a spec before writing any code.

**Prompts (exact text):**
1. "There's a competition - <challenge link> Explain"
2. "For vibe-coded app - what do you think will make a winning entry"
3. "what will be the structured data for Paper Lineage app"
4. "How can the app make most use of sanity"
5. "create a new repo - start with system architecture - make most use of sanity features which are available in free version with good UX - refine the apps features/flow/design. Consider bonus points also in app design. Then create a spec before actual implementation."

**What the AI produced:** a challenge summary, a strategy, a first content model (paper / influence-as-edge / concept / dataset / benchmark / storyline), a feature list, then `ARCHITECTURE.md` + `SPEC.md`.

**Where the AI was wrong, and how we caught it:**
- In prompt 4 the agent suggested **Comments, Tasks and Content Releases**. When it checked sanity.io/pricing for prompt 5, it found all three are **paid-only**. They were replaced with the workflow `send-back` note and a single-transaction `publish-bundle` effect.
- Earlier, the agent described "Workflows" as a `status` field on documents. After reading the docs, it turned out **Sanity Workflows is a real early-access engine** (`@sanity/workflow-engine`, with stages, activities, actions, effects and a Studio plugin), which is what the bonus refers to. The design was rebuilt around a real `paper-intake` workflow definition. A plain `reviewDecision` field was kept as an engine-independent fallback.
- The agent's first idea copied the "AI content pipeline" cookbook, where clean checks skip the human. We changed it to *always* require human curation, because lineage edges are historical claims. The checks set review priority instead.

**Time:** about 1 h

---

## 2026-10-02 · Session 1b: project setup (M0, part 1)

- Created the Sanity project `jd22zcim` in the web UI.
- **Hiccup:** the human ran `mkdir paper-lineage && cd paper-lineage && npm create sanity …`. The agent had already created that folder, so `mkdir` failed and the `&&` chain silently skipped the scaffold. The agent noticed because there was no `studio/` folder and no `~/.config/sanity` login. Fix: the human ran `npx sanity login`, then the agent ran the scaffold non-interactively (`--package-manager npm --yes`).
- Studio: Sanity v6.17 (Workflows plugin needs ≥ 6.15 ✓). Next.js 16.3 scaffolded in `web/`.
- Created the public `workflows` dataset and added CORS `http://localhost:3000` (with credentials, needed for Presentation / Visual Editing).
- Layout changed from `apps/*` to `studio/`, `web/`, `desk/` at the repo root, to match what was already scaffolded.

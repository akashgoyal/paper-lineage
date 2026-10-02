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

# Paper Lineage

**Every idea has ancestors.** Ask a question about AI papers and get an answer from an evidence-backed family tree of 197 papers traced back from BLIP-2. Citation facts are mined from full text; relation labels appear only after a curator accepts them.

Built for the [DEV × Sanity Challenge](): Path Two (vibe-coded app) with the **Workflows** and **App SDK** bonuses; the Ask agent runs on **Sanity Context** (GROQ endpoint + Knowledge Base).

- 📐 [Architecture](docs/ARCHITECTURE.md)
- 🎨 [Design spec](docs/DESIGN_SPEC.md)
- 🔌 [Context setup](docs/CONTEXT_SETUP.md)
- 📋 [Spec](docs/SPEC.md)
- 📓 [Build log](docs/BUILD_LOG.md)

Stack: Sanity (Content Lake, Context MCP + Knowledge Base, Studio, App SDK, Functions, Agent Actions, Workflows, Live Content API, Visual Editing) · Next.js · React Flow · Vercel. Uses Sanity Free plan features only.

> Status: **M1 done**: schema + Studio customisations deployed at [paper-lineage.sanity.studio](https://paper-lineage.sanity.studio) (curators only); `production` seeded (1,950 docs); Knowledge Base package ready; Context endpoints pending setup ([steps](docs/CONTEXT_SETUP.md)). Next: M2 (Ask + site).

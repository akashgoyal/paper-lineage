# Paper Lineage

**Every idea has ancestors.** Ask a question about AI papers and get an answer from an evidence-backed family tree of 197 papers traced back from BLIP-2. Citation facts are mined from full text; relation labels appear only after a curator accepts them.

Built for the [DEV × Sanity Challenge](https://dev.to/devteam/join-the-sanity-challenge-2500-in-prizes-for-five-winners-514m): Path Two (vibe-coded app) with the **Workflows** and **App SDK** bonuses; the Ask agent runs on **Sanity Context** (GROQ endpoint + Knowledge Base).

- 📐 [Architecture](docs/ARCHITECTURE.md)
- 🎨 [Design spec](docs/DESIGN_SPEC.md)
- 🔌 [Context setup and env](docs/CONTEXT_SETUP.md)
- 📋 [Spec](docs/SPEC.md) (with an "As built" section listing every deviation)
- 📓 [Build log](docs/BUILD_LOG.md)

## What's in the repo

| Folder | What | Run |
|---|---|---|
| `web/` | Next.js 16 site: Ask (chat on Sanity Context), Explore, Paper, Concept, Theme, Story, Pipeline, Suggest, About | `npm run dev` · `npm test` · `npm run test:live` · `npm run build` |
| `studio/` | Sanity Studio for curators: schema, evidence/relation pickers, lineage views, Accept/Reject actions. Hosted at [paper-lineage.sanity.studio](https://paper-lineage.sanity.studio) | `npm run check` |
| `desk/` | **Lineage Desk**, an App SDK app in the Sanity Dashboard: Review, Inbox, Composer, Pipeline (Workflows SDK) | `npm run dev` · `npm run check` · `npm run deploy` |
| `workflows/` | **paper-intake** on Sanity Workflows: definition, deploy config, effect runner | `npm run check` · `npm run deploy` · `npm run runner` |
| `scripts/`, `data/` | Harvest → curate → seed pipeline and the Knowledge Base package | see [ARCHITECTURE §7](docs/ARCHITECTURE.md) |

Stack: Sanity (Content Lake, Context MCP + Knowledge Base, Studio, App SDK, Workflows, Agent Actions, Live Content API) · Next.js · Together AI (DeepSeek-V4-Flash, our own MCP tool loop) · Upstash · Vercel. Sanity Free plan features only.

## Status (2026-10-03)

- Studio, Desk ([Dashboard app](https://www.sanity.io/@o2qzzix4g/application/fhpnvzp9ueyizs9oh9kmwmsu)) and the `paper-intake` workflow definition are **deployed**. One intake instance (BLIP-2) is waiting in curation as a demo.
- Sanity Context is live: Knowledge Base `kbawj3190IH1` (built, 12 issues to review) and both MCP endpoints. Ask answers end to end locally on Together AI (≈1¢ per answer).
- The site builds (614 static pages) and passes its tests. **It isn't deployed yet**; set the env vars from [CONTEXT_SETUP](docs/CONTEXT_SETUP.md) §4 on Vercel.
- No lineage link is verified yet: 1,349 links are waiting in the Desk Review queue, so the site shows citation facts only.

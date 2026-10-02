#!/usr/bin/env node
// Builds the Knowledge Base upload: data/kb/paper-lineage-kb.zip
//   papers/<arxivId>.pdf   full text of the core papers (scripts/kb-fetch.sh)
//   papers-manifest.md     maps each file to its paper, so entries cite "BLIP-2 (2023)", not "2301.12597.pdf"
//   concepts-glossary.md   the 25 themes → 180 concepts, as vocabulary (fallback if a dataset source is refused)
import {execFileSync} from 'node:child_process'
import {existsSync, readFileSync, rmSync, writeFileSync} from 'node:fs'

const core = JSON.parse(readFileSync('data/kb-core.json', 'utf8'))
const papers = JSON.parse(readFileSync('data/curated/papers.json', 'utf8'))
const concepts = JSON.parse(readFileSync('data/curated/concepts.json', 'utf8'))
const byId = Object.fromEntries(papers.map((p) => [p.arxivId, p]))

const missing = core.filter((id) => !existsSync(`data/kb/papers/${id}.pdf`))
if (missing.length) throw new Error(`Run scripts/kb-fetch.sh first; missing ${missing.join(', ')}`)

writeFileSync(
  'data/kb/papers-manifest.md',
  `# Paper Lineage: papers in this Knowledge Base

Each PDF is named by its arXiv ID. Refer to papers by their short name and year, not by file name.

| File | Short name | Year | Title | Authors |
|---|---|---|---|---|
${core
  .map((id) => byId[id])
  .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
  .map((p) => `| papers/${p.arxivId}.pdf | ${p.shortName} | ${p.publishedAt.slice(0, 4)} | ${p.title.replace(/\|/g, '/')} | ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''} |`)
  .join('\n')}
`,
)

const themes = concepts.filter((c) => c.level === 'theme')
writeFileSync(
  'data/kb/concepts-glossary.md',
  `# Paper Lineage concept glossary

Vocabulary for the ideas in this dataset: ${themes.length} themes, each with the concepts that belong to it.
"Introduced by" names the paper credited with the idea in this dataset.

${themes
  .map(
    (t) => `## ${t.name}

${t.summary}

${concepts
  .filter((c) => c.broader === t.slug)
  .map((c) => {
    const by = c.introducedBy ? byId[c.introducedBy] : null
    return `- **${c.name}**: ${c.summary}${by ? ` Introduced by ${by.shortName} (${by.publishedAt.slice(0, 4)}).` : ''}${c.aliases?.length ? ` Also called: ${c.aliases.join(', ')}.` : ''}`
  })
  .join('\n')}`,
  )
  .join('\n\n')}
`,
)

rmSync('data/kb/paper-lineage-kb.zip', {force: true})
execFileSync('zip', ['-q', '-r', 'paper-lineage-kb.zip', 'papers', 'papers-manifest.md', 'concepts-glossary.md'], {cwd: 'data/kb'})
console.log(`data/kb/paper-lineage-kb.zip: ${core.length} papers + manifest + glossary`)

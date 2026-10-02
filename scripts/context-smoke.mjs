#!/usr/bin/env node
// Lists the tools each Context MCP endpoint serves, to confirm both are configured and in the right mode.
// Reads SANITY_ORGANIZATION_TOKEN, SANITY_CONTEXT_GRAPH_URL, SANITY_CONTEXT_PAPERS_URL from web/.env.local.
import {readFileSync} from 'node:fs'

const env = Object.fromEntries(
  readFileSync('web/.env.local', 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    // Unquote "value" / 'value' the way Next.js's env loader does.
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2')]),
)

// Minimal MCP over streamable HTTP: initialize, acknowledge, then list tools on the same session.
async function rpc(url, body, session) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SANITY_ORGANIZATION_TOKEN}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(session ? {'mcp-session-id': session} : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok && res.status !== 202) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  const text = await res.text()
  const data = text.startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data:'))?.slice(5)
  return {session: res.headers.get('mcp-session-id') ?? session, json: data ? JSON.parse(data) : null}
}

async function listTools(name, url) {
  const init = await rpc(url, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {protocolVersion: '2025-03-26', capabilities: {}, clientInfo: {name: 'paper-lineage-smoke', version: '1.0.0'}},
  })
  if (init.json?.error) throw new Error(`${name}: ${init.json.error.message}`)
  await rpc(url, {jsonrpc: '2.0', method: 'notifications/initialized'}, init.session)
  const {json} = await rpc(url, {jsonrpc: '2.0', id: 2, method: 'tools/list', params: {}}, init.session)
  if (json.error) throw new Error(`${name}: ${json.error.message}`)
  console.log(`${name}: ${json.result.tools.map((t) => t.name).join(', ')}`)
}

await listTools('graph (expect groq_query)', env.SANITY_CONTEXT_GRAPH_URL)
await listTools('papers (expect knowledge_base_read)', env.SANITY_CONTEXT_PAPERS_URL)

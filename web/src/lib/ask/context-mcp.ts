// Minimal Context MCP client used only to RE-READ a Knowledge Base entry when verifying a quote
// (the model itself reaches Context through Anthropic's MCP connector). Streamable HTTP: initialize,
// acknowledge, then tools/call on the same session.

type Rpc = {jsonrpc: '2.0'; id?: number; method: string; params?: unknown}

async function post(url: string, token: string, body: Rpc, session?: string | null) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(session ? {'mcp-session-id': session} : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok && res.status !== 202) throw new Error(`Context MCP ${res.status}`)
  const text = await res.text()
  const data = text.trimStart().startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data:'))?.slice(5)
  return {session: res.headers.get('mcp-session-id') ?? session ?? null, json: data ? JSON.parse(data) : null}
}

export async function readKnowledgeBaseEntry(kb: string, path: string): Promise<string | null> {
  const url = process.env.SANITY_CONTEXT_PAPERS_URL
  const token = process.env.SANITY_ORGANIZATION_TOKEN
  if (!url || !token) return null
  const init = await post(url, token, {jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-03-26', capabilities: {}, clientInfo: {name: 'paper-lineage-verify', version: '1.0.0'}}})
  await post(url, token, {jsonrpc: '2.0', method: 'notifications/initialized'}, init.session)
  const {json} = await post(url, token, {jsonrpc: '2.0', id: 2, method: 'tools/call', params: {name: 'knowledge_base_read', arguments: {knowledgeBase: kb, paths: [path]}}}, init.session)
  const content = json?.result?.content as {type: string; text?: string}[] | undefined
  return content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n') || null
}

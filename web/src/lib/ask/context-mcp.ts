// Minimal Context MCP client (streamable HTTP: initialize, acknowledge, then calls on the same session).
// The Ask agent runs its own tool loop, so this is how the model's groq_query / knowledge_base_* calls
// reach Sanity Context, and how a quote is re-read from the Knowledge Base before it is shown.

type Rpc = {jsonrpc: '2.0'; id?: number; method: string; params?: unknown}
export type McpTool = {name: string; description?: string; inputSchema?: Record<string, unknown>}

async function post(url: string, token: string, body: Rpc, session?: string | null, signal?: AbortSignal) {
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
    signal,
  })
  if (!res.ok && res.status !== 202) throw new Error(`Context MCP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const text = await res.text()
  // SSE responses may carry several events; the JSON-RPC result is the last data line.
  const data = text.trimStart().startsWith('{') ? text : text.split('\n').filter((l) => l.startsWith('data:')).at(-1)?.slice(5)
  return {session: res.headers.get('mcp-session-id') ?? session ?? null, json: data ? JSON.parse(data) : null}
}

export class McpSession {
  private session: string | null = null
  private ready: Promise<void> | null = null
  private id = 10

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly signal?: AbortSignal,
  ) {}

  private init() {
    this.ready ??= (async () => {
      const init = await post(this.url, this.token, {jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-03-26', capabilities: {}, clientInfo: {name: 'paper-lineage', version: '1.0.0'}}}, null, this.signal)
      if (init.json?.error) throw new Error(`Context MCP: ${init.json.error.message}`)
      this.session = init.session
      await post(this.url, this.token, {jsonrpc: '2.0', method: 'notifications/initialized'}, this.session, this.signal)
    })()
    return this.ready
  }

  async listTools(): Promise<McpTool[]> {
    await this.init()
    const {json} = await post(this.url, this.token, {jsonrpc: '2.0', id: this.id++, method: 'tools/list', params: {}}, this.session, this.signal)
    return json?.result?.tools ?? []
  }

  /** Text content of a tool call; tool-level errors come back as text the model can read and correct. */
  async callTool(name: string, args: unknown): Promise<{text: string; isError: boolean}> {
    await this.init()
    const {json} = await post(this.url, this.token, {jsonrpc: '2.0', id: this.id++, method: 'tools/call', params: {name, arguments: args}}, this.session, this.signal)
    if (json?.error) return {text: `Error: ${json.error.message}`, isError: true}
    const content = (json?.result?.content ?? []) as {type: string; text?: string}[]
    return {text: content.filter((c) => c.type === 'text').map((c) => c.text).join('\n'), isError: Boolean(json?.result?.isError)}
  }
}

export async function readKnowledgeBaseEntry(kb: string, path: string): Promise<string | null> {
  const url = process.env.SANITY_CONTEXT_PAPERS_URL
  const token = process.env.SANITY_ORGANIZATION_TOKEN
  if (!url || !token) return null
  const {text, isError} = await new McpSession(url, token).callTool('knowledge_base_read', {knowledgeBase: kb, paths: [path]})
  return isError ? null : text || null
}

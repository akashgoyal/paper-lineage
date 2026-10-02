import {createHash} from 'node:crypto'
import {Ratelimit} from '@upstash/ratelimit'
import {Redis} from '@upstash/redis'

// DESIGN_SPEC §11.3: per visitor 10 / 10 min and 50 / day across Ask, storyline drafts and suggestions;
// a global daily cap of 400 questions protects the model and AI-credit budget. Visitors are keyed by a
// salted hash of the IP (never the raw IP). Without Upstash env vars (local dev) an in-memory limiter is
// used and the global cap is skipped.

export type LimitResult = {ok: true} | {ok: false; reason: 'visitor' | 'global'; retryAfterSeconds: number}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN})
    : null

const limiters = redis
  ? {
      burst: new Ratelimit({redis, limiter: Ratelimit.slidingWindow(10, '10 m'), prefix: 'pl:burst'}),
      daily: new Ratelimit({redis, limiter: Ratelimit.fixedWindow(50, '1 d'), prefix: 'pl:day'}),
      global: new Ratelimit({redis, limiter: Ratelimit.fixedWindow(400, '1 d'), prefix: 'pl:global'}),
    }
  : null

if (!redis && process.env.NODE_ENV === 'production') {
  console.warn('[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set: using a per-instance in-memory limiter and no global cap')
}

const memory = new Map<string, number[]>()
function memoryLimit(key: string, max: number, windowMs: number): number {
  const now = Date.now()
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= max) return Math.ceil((hits[0] + windowMs - now) / 1000)
  memory.set(key, [...hits, now])
  return 0
}

export function visitorKey(ip: string | null) {
  const salt = process.env.RATE_LIMIT_SALT ?? 'paper-lineage'
  return createHash('sha256').update(`${salt}:${ip ?? 'unknown'}`).digest('hex').slice(0, 32)
}

export async function checkLimit(visitor: string, kind: 'ask' | 'action' = 'ask'): Promise<LimitResult> {
  if (!limiters) {
    const wait = memoryLimit(`burst:${visitor}`, 10, 10 * 60_000) || memoryLimit(`day:${visitor}`, 50, 86_400_000)
    return wait ? {ok: false, reason: 'visitor', retryAfterSeconds: wait} : {ok: true}
  }
  if (kind === 'ask') {
    const global = await limiters.global.limit('all')
    if (!global.success) return {ok: false, reason: 'global', retryAfterSeconds: Math.ceil((global.reset - Date.now()) / 1000)}
  }
  for (const limiter of [limiters.burst, limiters.daily]) {
    const r = await limiter.limit(visitor)
    if (!r.success) return {ok: false, reason: 'visitor', retryAfterSeconds: Math.ceil((r.reset - Date.now()) / 1000)}
  }
  return {ok: true}
}

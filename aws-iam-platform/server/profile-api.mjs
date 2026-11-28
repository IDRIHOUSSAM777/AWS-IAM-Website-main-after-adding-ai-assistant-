import { randomUUID } from 'node:crypto'
import mysql from 'mysql2/promise'

const ENDPOINT = '/api/profile'
export const ANONYMOUS_DISPLAY_NAME = 'Learner'

// Keep letters, marks (accents, Arabic diacritics), numbers, spaces, - and apostrophes.
// The name ends up inside an AI prompt, so nothing else is allowed.
export function cleanName(raw) {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{M}\p{N} '’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)
}

/** Connection settings come from .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME). */
export function dbConfigFromEnv(env = process.env) {
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME || 'aws_iam_platform',
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1024) {
        reject(new Error('too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch (error) { reject(error) }
    })
    req.on('error', reject)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host } catch { return false }
}

// Visitors must never see technical wording: they get one polite message, and the real cause
// (missing table, wrong password, database switched off...) is written to the server console.
function describeDbError(error) {
  const known = [
    'ER_NO_SUCH_TABLE', 'ER_BAD_DB_ERROR', 'ER_TABLEACCESS_DENIED_ERROR',
    'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR',
  ]
  if (known.includes(error?.code)) {
    return 'We cannot save names at the moment. You are welcome to continue without one.'
  }
  return null
}

/** @param {() => import('mysql2/promise').PoolOptions} getConfig read lazily, so .env is loaded first */
export function createProfileApi(getConfig = dbConfigFromEnv) {
  let pool
  const getPool = () =>
    (pool ??= mysql.createPool({
      ...getConfig(),
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
      connectTimeout: 5000,
    }))

  const visitorIdFrom = (req) =>
    /(?:^|;\s*)visitor_id=([0-9a-f-]{36})/.exec(req.headers.cookie ?? '')?.[1] ?? null

  async function findName(id) {
    if (!id) return null
    const [rows] = await getPool().execute('SELECT display_name FROM visitors WHERE id = ?', [id])
    return rows[0]?.display_name ?? null
  }

  // Used by KYUBI. It must never break the chat, so any database problem simply means "no name".
  async function getVisitorName(req) {
    try {
      const name = await findName(visitorIdFrom(req))
      return name === ANONYMOUS_DISPLAY_NAME ? null : name
    } catch (error) {
      console.error('[profile-api] could not read the visitor name for Kyubi:', error?.code ?? '', error?.message ?? error)
      return null
    }
  }

  async function handler(req, res, next) {
    if ((req.url ?? '').split('?')[0] !== ENDPOINT) {
      if (typeof next === 'function') return next()
      return send(res, 404, { error: 'Not found.' })
    }
    try {
      const id = visitorIdFrom(req)

      if (req.method === 'GET') {
        // A first-time visitor has no cookie, so touch the table anyway: a broken connection or a
        // missing table is then reported on the landing page instead of when they press the button.
        if (!id) await getPool().query('SELECT 1 FROM visitors LIMIT 1')
        const name = await findName(id)
        if (name) await getPool().execute('UPDATE visitors SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [id])
        return send(res, 200, { name })
      }

      if ((req.method === 'POST' || req.method === 'DELETE') && !sameOrigin(req)) {
        return send(res, 403, { error: 'Cross-origin request refused.' })
      }

      if (req.method === 'POST') {
        if (!String(req.headers['content-type']).includes('application/json')) {
          return send(res, 415, { error: 'Send JSON.' })
        }
        let body
        try { body = await readJson(req) } catch { return send(res, 400, { error: 'Invalid request.' }) }
        const name = cleanName(body?.name)
        if (name.length < 2) return send(res, 400, { error: 'Please enter at least 2 characters.' })
        const visitorId = id ?? randomUUID()
        await getPool().execute(
          `INSERT INTO visitors (id, display_name) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), last_seen_at = CURRENT_TIMESTAMP`,
          [visitorId, name],
        )
        return send(res, 200, { name }, {
          'Set-Cookie': `visitor_id=${visitorId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
        })
      }

      if (req.method === 'DELETE') {
        if (id) {
          // A different person is about to use this browser: their quiz answers go away with the name.
          try {
            await getPool().execute('DELETE FROM quiz_assignments WHERE visitor_id = ?', [id])
          } catch (error) {
            if (error?.code !== 'ER_NO_SUCH_TABLE') throw error
          }
          await getPool().execute('DELETE FROM visitors WHERE id = ?', [id])
        }
        return send(res, 200, { name: null }, {
          'Set-Cookie': 'visitor_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        })
      }

      return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' })
    } catch (error) {
      const friendly = describeDbError(error)
      console.error('[profile-api]', error?.code ?? '', error?.message ?? error)
      if (friendly) return send(res, 503, { error: friendly })
      return send(res, 500, { error: 'Something went wrong on our side. Please try again in a moment.' })
    }
  }

  return { handler, getVisitorName, getPool, visitorIdFrom, close: () => pool?.end() }
}

// One shared instance for vite.config.ts, server/index.mjs and KYUBI.
let shared
const getShared = () => (shared ??= createProfileApi())
export const createProfileHandler = () => (req, res, next) => getShared().handler(req, res, next)
export const getVisitorName = (req) => getShared().getVisitorName(req)
export const getSharedPool = () => getShared().getPool()
export const getVisitorId = (req) => getShared().visitorIdFrom(req)

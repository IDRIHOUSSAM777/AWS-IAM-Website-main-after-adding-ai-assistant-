import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import { createQuizApi, pickAssignments, toPublicQuestion } from './quiz-api.mjs'
import { QUIZ_BANK, QUIZ_SIZE } from './quiz-bank.mjs'

// A tiny in-memory stand-in for the database, just enough for the quiz queries.
function fakeDb() {
  const visitors = new Map([['a'.repeat(36), 'Amina'], ['b'.repeat(36), 'Yacine']])
  const rows = []
  const pool = {
    async execute(sql, p = []) {
      if (sql.startsWith('SELECT display_name')) return [visitors.has(p[0]) ? [{ display_name: visitors.get(p[0]) }] : []]
      if (sql.startsWith('INSERT INTO visitors')) {
        visitors.set(p[0], p[1])
        return [{ affectedRows: 1 }]
      }
      if (sql.startsWith('SELECT slot')) return [rows.filter((r) => r.visitor_id === p[0]).sort((x, y) => x.slot - y.slot)]
      if (sql.startsWith('INSERT IGNORE')) {
        for (let i = 0; i < p.length; i += 4) {
          if (!rows.some((r) => r.visitor_id === p[i] && r.slot === p[i + 1])) {
            rows.push({ visitor_id: p[i], slot: p[i + 1], question_key: p[i + 2], option_order: p[i + 3], chosen_index: null, is_correct: null, answered_at: null })
          }
        }
        return [{ affectedRows: 1 }]
      }
      if (sql.includes('UPDATE quiz_assignments')) {
        const r = rows.find((x) => x.visitor_id === p[2] && x.slot === p[3] && !x.answered_at)
        if (!r) return [{ affectedRows: 0 }]
        Object.assign(r, { chosen_index: p[0], is_correct: p[1], answered_at: new Date() })
        return [{ affectedRows: 1 }]
      }
      throw new Error('unexpected sql ' + sql)
    },
  }
  return { pool, rows }
}

function call(api, method, url, id, body) {
  return new Promise((resolve) => {
    const req = new EventEmitter()
    Object.assign(req, { method, url, headers: { host: 'x' } })
    const res = { writeHead(status, headers) { this.status = status; this.headers = headers }, end(text) { resolve({ status: this.status, headers: this.headers, body: JSON.parse(text) }) } }
    api.handler(req, res)
    setImmediate(() => { if (body) req.emit('data', JSON.stringify(body)); req.emit('end') })
  })
}

test('each visitor gets 9 different questions with shuffled answers', () => {
  const picks = pickAssignments()
  assert.equal(picks.length, QUIZ_SIZE)
  assert.equal(new Set(picks.map((p) => p.key)).size, QUIZ_SIZE)
  for (const p of picks) assert.deepEqual([...p.order].sort(), [0, 1, 2])
})

test('quiz flow works anonymously and awards a point only once', async () => {
  const { pool, rows } = fakeDb()
  const anonymousId = 'c'.repeat(36)
  const api = createQuizApi({ getPool: () => pool, visitorIdFrom: (req) => req.__id, createVisitorId: () => anonymousId })
  const as = (id) => (m, u, b) => { const req = { __id: id }; return call({ handler: (rq, rs) => api.handler(Object.assign(rq, req), rs) }, m, u, id, b) }

  const first = await as(null)('GET', '/api/quiz')
  assert.equal(first.status, 200)
  assert.equal(first.body.questions.length, 9)
  assert.equal(first.body.questions[0].correct, null, 'right answer must stay hidden')
  assert.match(first.headers['Set-Cookie'], /^visitor_id=[0-9a-f-]{36};/)
  const learner = as(anonymousId)
  const second = await learner('GET', '/api/quiz')
  assert.deepEqual(second.body.questions.map((q) => q.text), first.body.questions.map((q) => q.text))

  const row = rows.find((r) => r.slot === 1)
  const item = QUIZ_BANK.find((q) => q.key === row.question_key)
  const order = row.option_order.split(',').map(Number)
  const right = order.indexOf(item.answer)
  const ok = await learner('POST', '/api/quiz/answer', { slot: 1, choice: right })
  assert.equal(ok.body.question.isCorrect, true)
  assert.equal(ok.body.score, 1)
  const again = await learner('POST', '/api/quiz/answer', { slot: 1, choice: (right + 1) % 3 })
  assert.equal(again.body.alreadyAnswered, true)
  assert.equal(again.body.score, 1, 'no second point')

  const wrong = await learner('POST', '/api/quiz/answer', { slot: 2, choice: (order.length + 5) })
  assert.equal(wrong.status, 400)

  const board = await learner('GET', '/api/leaderboard')
  assert.equal(board.status, 404)
})

test('toPublicQuestion hides the answer until answered', () => {
  const item = QUIZ_BANK[0]
  const hidden = toPublicQuestion({ slot: 1, question_key: item.key, option_order: '0,1,2', chosen_index: null, is_correct: null })
  assert.equal(hidden.explanation, null)
})

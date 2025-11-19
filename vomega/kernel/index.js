const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const { scoreResonance } = require('./agent-resonance')

const app = express()
app.use(bodyParser.json({ limit: '1mb' }))

// Serve simple health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

// Resonance endpoint
app.post('/resonance', (req, res) => {
  try {
    const ctx = req.body.context || ''
    const r = scoreResonance(ctx)
    res.json({ resonance: r.score, reasons: r.reasons, metrics: r.metrics })
  } catch (e) { res.status(400).send('bad request') }
})

// Plan endpoint (fast planner stub)
app.post('/plan', (req, res) => {
  try {
    const ctx = req.body.context || ''
    const r = scoreResonance(ctx)
    const suggestion = `// Suggestion header\n// resonance=${r.score}\n` + ctx.split('\n').slice(0,20).join('\n')
    const plan = {
      summary: 'vΩ fast plan',
      salience: r.score,
      suggestion,
      edits: [{ startLine: 0, endLine: 0, replacement: suggestion }]
    }
    res.json(plan)
  } catch (e) { res.status(400).send('bad request') }
})

// Slow planner
app.post('/plan-slow', async (req, res) => {
  try {
    const ctx = req.body.context || ''
    await new Promise(r => setTimeout(r, 500))
    const r = scoreResonance(ctx)
    const header = `/* vΩ slow planner suggestion (res=${r.score}) */\n`
    const edits = [{ startLine: 0, endLine: 0, replacement: header }]
    res.json({ summary: 'vΩ slow plan', salience: r.score, edits })
  } catch (e) { res.status(400).send('bad request') }
})

const PORT = process.env.VOMEGA_KERNEL_PORT || 4010
app.listen(PORT, '127.0.0.1', () => console.log(`vΩ kernel listening on http://127.0.0.1:${PORT}`))

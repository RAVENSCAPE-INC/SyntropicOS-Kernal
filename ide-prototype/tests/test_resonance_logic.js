const { scoreResonance } = require('../agent-resonance')

const cases = [
  { t: 'This is verified evidence and proven fact', expectMin: 0.4 },
  { t: 'Buy now! Exclusive offer! Profit guaranteed!!!', expectMax: 0.5 },
  { t: '', expectMax: 0 },
  { t: 'This is a long technical report with tests and replicate instructions'.repeat(10), expectMin: 0.3 }
]

for (const c of cases) {
  const r = scoreResonance(c.t)
  console.log('input:', c.t.slice(0,60).replace(/\n/g,' '), '->', r)
  if (c.expectMin != null && r.score < c.expectMin) { console.error('failed min', c); process.exit(2) }
  if (c.expectMax != null && r.score > c.expectMax) { console.error('failed max', c); process.exit(3) }
}
console.log('resonance logic tests passed')

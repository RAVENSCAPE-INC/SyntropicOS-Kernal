const fs = require('fs')
const path = require('path')

const logPath = path.join(__dirname, '..', 'suggestions.log')
// ensure exists
fs.writeFileSync(logPath, '')
const entry = { ts: Date.now(), file: 'x.js', salience: 0.5, summary: 'test' }
fs.appendFileSync(logPath, JSON.stringify(entry) + '\n')
const all = fs.readFileSync(logPath,'utf8').trim().split('\n').filter(Boolean)
if (all.length === 0) { console.error('audit write failed'); process.exit(2) }
const parsed = JSON.parse(all[all.length-1])
if (parsed.file !== 'x.js') { console.error('audit content mismatch', parsed); process.exit(3) }
console.log('audit test passed')

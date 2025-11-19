const fs = require('fs')
const path = require('path')

const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

const file = path.join(tmpDir, 'sample.txt')
fs.writeFileSync(file, 'line1\nline2\n')

// simulate backup
const stamp = Date.now()
const bak = file + `.bak.${stamp}`
fs.copyFileSync(file, bak)
if (!fs.existsSync(bak)) { console.error('backup failed'); process.exit(2) }

// modify original
fs.writeFileSync(file, 'line1
modified\n')

// restore latest
const all = fs.readdirSync(tmpDir).filter(f => f.startsWith('sample.txt.bak.'))
all.sort()
const latest = path.join(tmpDir, all[all.length-1])
fs.copyFileSync(latest, file)
const content = fs.readFileSync(file,'utf8')
if (!content.includes('line2')) { console.error('restore failed, content:', content); process.exit(3) }
console.log('backup/restore test passed')

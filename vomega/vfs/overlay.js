const fs = require('fs')
const path = require('path')

// Very small overlay manager: stores snapshots and JSONL events
const SNAP_DIR = path.join(__dirname, '.snap')
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true })

function snapshotFile(filePath) {
  const stamp = Date.now()
  const base = path.basename(filePath)
  const dest = path.join(SNAP_DIR, `${base}.snap.${stamp}`)
  fs.copyFileSync(filePath, dest)
  return dest
}

function appendEvent(event) {
  const logPath = path.join(__dirname, 'events.jsonl')
  fs.appendFileSync(logPath, JSON.stringify(Object.assign({ ts: Date.now() }, event)) + '\n')
}

module.exports = { snapshotFile, appendEvent }

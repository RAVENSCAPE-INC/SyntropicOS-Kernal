const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld('ide', {
  ping: () => ipcRenderer.invoke('ping'),
  readFile: (filePath) => {
    try {
      return { ok: true, content: fs.readFileSync(filePath, 'utf8') }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  },
  writeFile: (filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
})

// Backup and restore helpers for safe self-modification
contextBridge.exposeInMainWorld('ideBackup', {
  backupFile: (filePath) => {
    try {
      if (!fs.existsSync(filePath)) return { ok: false, error: 'file not found' }
      const dir = path.dirname(filePath)
      const base = path.basename(filePath)
      const stamp = Date.now()
      const dest = path.join(dir, base + `.bak.${stamp}`)
      fs.copyFileSync(filePath, dest)
      return { ok: true, backupPath: dest }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  },
  restoreLatestBackup: (filePath) => {
    try {
      const dir = path.dirname(filePath)
      const base = path.basename(filePath)
      const all = fs.readdirSync(dir)
      const matches = all.filter(f => f.startsWith(base + '.bak.'))
      if (matches.length === 0) return { ok: false, error: 'no backups' }
      // pick latest by numeric suffix
      matches.sort((a,b) => {
        const na = Number(a.split('.bak.').slice(-1)[0])
        const nb = Number(b.split('.bak.').slice(-1)[0])
        return nb - na
      })
      const latest = path.join(dir, matches[0])
      fs.copyFileSync(latest, filePath)
      return { ok: true, restoredFrom: latest }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
})

// Audit log API: append and read recent entries (stored as JSON lines)
contextBridge.exposeInMainWorld('ideAudit', {
  appendAudit: (entry) => {
    try {
      const logPath = path.join(__dirname, 'suggestions.log')
      const line = JSON.stringify(Object.assign({ ts: Date.now() }, entry)) + '\n'
      fs.appendFileSync(logPath, line, 'utf8')
      return { ok: true, path: logPath }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  },
  readRecent: (n) => {
    try {
      const logPath = path.join(__dirname, 'suggestions.log')
      if (!fs.existsSync(logPath)) return { ok: true, entries: [] }
      const all = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean)
      const last = all.slice(-n)
      const parsed = last.map(l => {
        try { return JSON.parse(l) } catch (e) { return { raw: l } }
      })
      return { ok: true, entries: parsed }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
})

// Return the raw suggestions log content for download/viewing
contextBridge.exposeInMainWorld('ideAuditRaw', {
  getLogContent: () => {
    try {
      const logPath = path.join(__dirname, 'suggestions.log')
      if (!fs.existsSync(logPath)) return { ok: true, content: '' }
      const content = fs.readFileSync(logPath, 'utf8')
      return { ok: true, content }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
})

// Signing helper: generate or read a local signing key and sign content
contextBridge.exposeInMainWorld('ideSign', {
  getOrCreateKey: () => {
    try {
      const keyPath = path.join(__dirname, 'signing.key')
      if (!fs.existsSync(keyPath)) {
        const rand = require('crypto').randomBytes(32).toString('hex')
        fs.writeFileSync(keyPath, rand, { mode: 0o600 })
        return { ok: true, created: true }
      }
      return { ok: true, created: false }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  },
  sign: (content) => {
    try {
      const keyPath = path.join(__dirname, 'signing.key')
      if (!fs.existsSync(keyPath)) return { ok: false, error: 'no signing key' }
      const key = fs.readFileSync(keyPath, 'utf8')
      const hmac = require('crypto').createHmac('sha256', key)
      hmac.update(String(content || ''))
      const sig = hmac.digest('hex')
      return { ok: true, signature: sig }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
})

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

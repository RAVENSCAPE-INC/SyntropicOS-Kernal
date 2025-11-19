// Renderer script: bootstraps monaco and wire UI to preload APIs + agent host
window.addEventListener('DOMContentLoaded', () => {
  const require = window.require || window.requirejs
  require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.44.0/min/vs' }})
  require(['vs/editor/editor.main'], () => {
    const editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Welcome to Syntropic IDE prototype\n',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true
    })

    document.getElementById('btn-ping').addEventListener('click', async () => {
      const r = await window.ide.ping()
      alert('Ping response: ' + JSON.stringify(r))
    })

    document.getElementById('btn-open').addEventListener('click', async () => {
      const p = document.getElementById('filePath').value
      if (!p) return alert('enter file path')
      const res = window.ide.readFile(p)
      if (res.ok) editor.setValue(res.content)
      else alert('Read error: ' + res.error)
    })

    document.getElementById('btn-save').addEventListener('click', async () => {
      const p = document.getElementById('filePath').value
      if (!p) return alert('enter file path')
      const content = editor.getValue()
      const res = window.ide.writeFile(p, content)
      if (!res.ok) alert('Save error: ' + res.error)
      else alert('Saved')
    })

    const suggestionText = document.getElementById('suggestionText')
    const suggestionSalience = document.getElementById('suggestion-salience')
    let latestPlan = null

    let latestResonance = null
    document.getElementById('btn-plan').addEventListener('click', async () => {
      try {
        const code = editor.getValue().slice(0, 4096)
        // first call resonance endpoint
        try {
          const rresp = await fetch('http://127.0.0.1:3001/resonance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: code })
          })
          if (rresp.ok) {
            const rj = await rresp.json()
            latestResonance = rj.resonance
            document.getElementById('resonance-score').innerText = latestResonance
          }
        } catch (e) {
          console.warn('resonance call failed', e)
        }

        const resp = await fetch('http://127.0.0.1:3001/plan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: code, resonance: latestResonance })
        })
        if (!resp.ok) throw new Error('bad response ' + resp.status)
        const j = await resp.json()
        latestPlan = j
        suggestionText.innerText = j.suggestion || JSON.stringify(j, null, 2)
        suggestionSalience.innerText = j.salience != null ? j.salience : '-'
        // If structured edits are provided, show a human-readable representation
        if (j.edits && Array.isArray(j.edits)) {
          const editsText = j.edits.map((e, i) => `Edit ${i+1}: lines ${e.startLine}..${e.endLine}\n${e.replacement}\n---`).join('\n')
          suggestionDiff.innerText = editsText
        }
      } catch (err) {
        alert('Agent host unreachable: ' + err)
      }
    })

    // Preview apply: compute diff and show it in the panel
    const suggestionDiff = document.getElementById('suggestionDiff')
    document.getElementById('btn-apply-suggestion').addEventListener('click', async () => {
      try {
        if (!latestPlan) return alert('No suggestion available')
        const p = document.getElementById('filePath').value
        if (!p) return alert('Enter file path to preview suggestion')
        const existing = window.ide.readFile(p)
        const oldContent = existing.ok ? existing.content : editor.getValue()
        // If structured edits are present, compute the result of applying them
        let newContent
        if (latestPlan && latestPlan.edits && Array.isArray(latestPlan.edits)) {
          newContent = applyEdits(oldContent, latestPlan.edits)
        } else {
          newContent = latestPlan.suggestion || editor.getValue()
        }
        const diff = computeUnifiedDiff(oldContent, newContent)
        suggestionDiff.innerText = diff
        // apply inline decorations in Monaco to preview changes
        applyInlineDecorations(oldContent, newContent)
      } catch (err) {
        alert('Failed to compute preview: ' + err)
      }
    })

    document.getElementById('btn-confirm-apply').addEventListener('click', async () => {
      try {
        if (!latestPlan) return alert('No suggestion available')
        const p = document.getElementById('filePath').value
        if (!p) return alert('Enter file path to apply suggestion')
        // If structured edits present, apply them to the existing content
        const existing = window.ide.readFile(p)
        const oldContent = existing.ok ? existing.content : editor.getValue()
        const newContent = (latestPlan && latestPlan.edits && Array.isArray(latestPlan.edits))
          ? applyEdits(oldContent, latestPlan.edits)
          : (latestPlan.suggestion || editor.getValue())
        // backup first
        const b = window.ideBackup.backupFile(p)
        if (!b.ok) {
          const ok = confirm('Backup failed: ' + b.error + '\nProceed anyway?')
          if (!ok) return
        }
        const res = window.ide.writeFile(p, newContent)
        if (!res.ok) alert('Save error: ' + res.error)
        else {
          alert('Applied suggestion and saved to ' + p + (b.ok ? '\nBackup: ' + b.backupPath : ''))
          const read = window.ide.readFile(p)
          if (read.ok) editor.setValue(read.content)
          // clear decorations after apply
          clearLineDecorations()
          // append audit entry
          try {
            // If manual approval required, mark as pending and write audit without applying
            const requireApproval = document.getElementById('chk-require-approval').checked
            if (requireApproval) {
              try {
                const auditEntry = {
                  file: p,
                  salience: latestPlan.salience != null ? latestPlan.salience : null,
                  summary: latestPlan.summary || null,
                  backup: b.ok ? b.backupPath : null,
                  diff: suggestionDiff.innerText || null,
                  edits: latestPlan.edits || null,
                  status: 'pending'
                }
                window.ideAudit.appendAudit(auditEntry)
                refreshAuditLog()
                alert('Suggestion recorded as PENDING. Use Approve Pending to apply.')
                suggestionDiff.innerText = ''
                return
              } catch (e) {
                console.error('Audit append failed', e)
              }
            }

            const res = window.ide.writeFile(p, newContent)
            if (!res.ok) alert('Save error: ' + res.error)
            else {
              // sign the diff/content
              let sig = null
              try {
                window.ideSign.getOrCreateKey()
                const s = window.ideSign.sign(suggestionDiff.innerText || newContent)
                if (s.ok) sig = s.signature
              } catch (e) { console.error('sign failed', e) }

              alert('Applied suggestion and saved to ' + p + (b.ok ? '\nBackup: ' + b.backupPath : ''))
              const read = window.ide.readFile(p)
              if (read.ok) editor.setValue(read.content)
              // append audit entry with signature
              try {
                const audit = {
                  file: p,
                  salience: latestPlan.salience != null ? latestPlan.salience : null,
                  summary: latestPlan.summary || null,
                  backup: b.ok ? b.backupPath : null,
                  diff: suggestionDiff.innerText || null,
                  edits: latestPlan.edits || null,
                  status: 'applied',
                  signature: sig
                }
                window.ideAudit.appendAudit(audit)
                refreshAuditLog()
              } catch (e) {
                console.error('Audit append failed', e)
              }
              suggestionDiff.innerText = ''

    document.getElementById('btn-clear-suggestion').addEventListener('click', () => {
      suggestionText.innerText = ''
      suggestionSalience.innerText = '-'
      suggestionDiff.innerText = ''
      latestPlan = null
    })

    document.getElementById('btn-rollback').addEventListener('click', async () => {
      try {
        const p = document.getElementById('filePath').value
        if (!p) return alert('Enter file path to rollback')
        const r = window.ideBackup.restoreLatestBackup(p)
        if (!r.ok) return alert('Rollback failed: ' + r.error)
        alert('Restored from backup: ' + r.restoredFrom)
        const read = window.ide.readFile(p)
        if (read.ok) editor.setValue(read.content)
        // refresh decorations
        clearLineDecorations()
      } catch (err) {
        alert('Rollback failed: ' + err)
      }
    })

    // refresh audit log entries shown in the panel
    const auditLogEl = document.getElementById('auditLog')
    function refreshAuditLog() {
      try {
        const r = window.ideAudit.readRecent(8)
        if (!r.ok) return auditLogEl.innerText = 'Audit read error: ' + r.error
        if (!r.entries || r.entries.length === 0) return auditLogEl.innerText = '(no audit entries yet)'
        const lines = r.entries.map(e => {
          const ts = e.ts ? new Date(e.ts).toLocaleString() : '(no ts)'
          const file = e.file || e.path || 'unknown'
          const sal = e.salience != null ? ('salience=' + e.salience) : ''
          const b = e.backup ? (' backup=' + e.backup) : ''
          const s = e.summary ? (' summary=' + e.summary) : ''
          return `${ts} | ${file} ${sal}${b}${s}`
        })
        auditLogEl.innerText = lines.join('\n')
      } catch (e) {
        auditLogEl.innerText = 'Audit refresh error: ' + e
      }
    }

    // populate audit on load
    refreshAuditLog()

    // Approve pending entries: find latest pending and apply
    document.getElementById('btn-approve-pending').addEventListener('click', async () => {
      try {
        const r = window.ideAudit.readRecent(50)
        if (!r.ok) return alert('Audit read failed: ' + r.error)
        const pend = (r.entries || []).filter(e => e.status === 'pending')
        if (!pend || pend.length === 0) return alert('No pending entries')
        // pick the oldest pending (FIFO)
        const entry = pend[0]
        const p = entry.file
        if (!p) return alert('Pending entry missing file')
        const existing = window.ide.readFile(p)
        const oldContent = existing.ok ? existing.content : editor.getValue()
        const newContent = entry.edits ? applyEdits(oldContent, entry.edits) : (entry.suggestion || oldContent)
        const b = window.ideBackup.backupFile(p)
        if (!b.ok) {
          const ok = confirm('Backup failed: ' + b.error + '\nProceed anyway?')
          if (!ok) return
        }
        const res = window.ide.writeFile(p, newContent)
        if (!res.ok) return alert('Save failed: ' + res.error)
        // sign
        let sig = null
        try { window.ideSign.getOrCreateKey(); const s = window.ideSign.sign(entry.diff || newContent); if (s.ok) sig = s.signature } catch(e){}
        // append applied audit record
        window.ideAudit.appendAudit(Object.assign({}, entry, { status: 'applied', signature: sig, backup: b.ok ? b.backupPath : entry.backup }))
        refreshAuditLog()
        const read = window.ide.readFile(p)
        if (read.ok) editor.setValue(read.content)
        clearLineDecorations()
        alert('Pending suggestion applied and signed')
      } catch (e) { alert('Approve failed: ' + e) }
    })

    // Audit viewer modal handlers
    const auditModal = document.getElementById('auditModal')
    const auditDetails = document.getElementById('auditDetails')
    document.getElementById('btn-open-audit').addEventListener('click', () => {
      auditModal.style.display = 'block'
      loadAuditDetails()
    })
    document.getElementById('auditClose').addEventListener('click', () => {
      auditModal.style.display = 'none'
    })
    document.getElementById('auditReload').addEventListener('click', () => {
      loadAuditDetails()
      refreshAuditLog()
    })
    document.getElementById('auditDownload').addEventListener('click', async () => {
      try {
        const r = window.ideAuditRaw.getLogContent()
        if (!r.ok) return alert('Failed to read log: ' + r.error)
        const blob = new Blob([r.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'suggestions.log'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (e) {
        alert('Download failed: ' + e)
      }
    })

    async function loadAuditDetails() {
      try {
        const r = window.ideAudit.readRecent(50)
        if (!r.ok) return auditDetails.innerText = 'Audit read error: ' + r.error
        auditDetails.innerText = JSON.stringify(r.entries, null, 2)
      } catch (e) {
        auditDetails.innerText = 'Audit load error: ' + e
      }
    }

    // simple line-based diff helper
    function computeSimpleDiff(a, b) {
      const A = a.split('\n')
      const B = b.split('\n')
      const max = Math.max(A.length, B.length)
      const out = []
      for (let i = 0; i < max; i++) {
        const la = A[i]
        const lb = B[i]
        if (la === lb) {
          out.push('  ' + (la === undefined ? '' : la))
        } else {
          if (la !== undefined) out.push('- ' + la)
          if (lb !== undefined) out.push('+ ' + lb)
        }
      }
      return out.join('\n')
    }

    function computeUnifiedDiff(a, b) {
      // Very small unified-like diff generator using line comparison
      const A = a.split('\n')
      const B = b.split('\n')
      const lines = []
      let i = 0, j = 0
      while (i < A.length || j < B.length) {
        const la = A[i]
        const lb = B[j]
        if (la === lb) {
          lines.push(' ' + (la === undefined ? '' : la))
          i++; j++
        } else {
          if (la !== undefined && (lb === undefined || !B.slice(j, j+3).includes(la))) {
            lines.push('-' + la)
            i++
          } else if (lb !== undefined && (la === undefined || !A.slice(i, i+3).includes(lb))) {
            lines.push('+' + lb)
            j++
          } else {
            // fallback: mark both
            if (la !== undefined) { lines.push('-' + la); i++ }
            if (lb !== undefined) { lines.push('+' + lb); j++ }
          }
        }
      }
      return lines.join('\n')
    }

    // Monaco decorations management
    let currentDecorations = []
    function clearLineDecorations() {
      currentDecorations = editor.deltaDecorations(currentDecorations, [])
    }

    function applyInlineDecorations(oldContent, newContent) {
      const A = oldContent.split('\n')
      const B = newContent.split('\n')
      const decorations = []
      const max = Math.max(A.length, B.length)
      for (let line = 0; line < max; line++) {
        const la = A[line]
        const lb = B[line]
        const range = new monaco.Range(line+1, 1, line+1, 1)
        if (la === lb) continue
        if (la === undefined && lb !== undefined) {
          decorations.push({ range, options: { isWholeLine: true, className: 'diag-added' } })
        } else if (lb === undefined && la !== undefined) {
          decorations.push({ range, options: { isWholeLine: true, className: 'diag-removed' } })
        } else {
          decorations.push({ range, options: { isWholeLine: true, className: 'diag-changed' } })
        }
      }
      currentDecorations = editor.deltaDecorations(currentDecorations, decorations)
    }

    // Applies structured edits to a text content. Edits are applied in order,
    // where each edit has {startLine, endLine, replacement} using 0-based line indices.
    function applyEdits(content, edits) {
      const lines = content.split('\n')
      // Sort edits by startLine ascending so we can apply from top to bottom
      const sorted = edits.slice().sort((a,b) => a.startLine - b.startLine)
      let cursorShift = 0
      for (const e of sorted) {
        const s = Math.max(0, e.startLine)
        const en = Math.max(0, e.endLine)
        const before = lines.slice(0, s)
        const after = lines.slice(en)
        const repl = (e.replacement || '').split('\n')
        // rebuild lines
        const merged = before.concat(repl).concat(after)
        // set lines for next iteration
        lines.length = 0
        Array.prototype.push.apply(lines, merged)
      }
      return lines.join('\n')
    }
  })
})

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

    document.getElementById('btn-plan').addEventListener('click', async () => {
      try {
        const code = editor.getValue().slice(0, 4096)
        const resp = await fetch('http://127.0.0.1:3001/plan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: code })
        })
        if (!resp.ok) throw new Error('bad response ' + resp.status)
        const j = await resp.json()
        latestPlan = j
        suggestionText.innerText = j.suggestion || JSON.stringify(j, null, 2)
        suggestionSalience.innerText = j.salience != null ? j.salience : '-'
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
        const newContent = latestPlan.suggestion || editor.getValue()
        const diff = computeSimpleDiff(oldContent, newContent)
        suggestionDiff.innerText = diff
      } catch (err) {
        alert('Failed to compute preview: ' + err)
      }
    })

    document.getElementById('btn-confirm-apply').addEventListener('click', async () => {
      try {
        if (!latestPlan) return alert('No suggestion available')
        const p = document.getElementById('filePath').value
        if (!p) return alert('Enter file path to apply suggestion')
        const newContent = latestPlan.suggestion || editor.getValue()
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
          suggestionDiff.innerText = ''
        }
      } catch (err) {
        alert('Failed to apply suggestion: ' + err)
      }
    })

    document.getElementById('btn-cancel-apply').addEventListener('click', () => {
      suggestionDiff.innerText = ''
    })

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
      } catch (err) {
        alert('Rollback failed: ' + err)
      }
    })

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
  })
})

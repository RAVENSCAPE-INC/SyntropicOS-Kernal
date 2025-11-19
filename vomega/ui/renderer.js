require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.44.0/min/vs' }})
require(['vs/editor/editor.main'], () => {
  const editor = monaco.editor.create(document.getElementById('editor'), { value: '// vΩ editor\n', language: 'javascript', theme: 'vs-dark', automaticLayout: true })
  document.getElementById('btn-ping').addEventListener('click', async () => {
    try { const r = await fetch('http://127.0.0.1:4010/health'); const j = await r.json(); alert('kernel: ' + JSON.stringify(j)) } catch(e){alert('kernel unreachable')}
  })
  document.getElementById('btn-plan').addEventListener('click', async () => {
    try {
      const p = document.getElementById('filePath').value
      const code = editor.getValue()
      // request a plan from kernel
      const resp = await fetch('http://127.0.0.1:4010/plan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ context: code }) })
      const j = await resp.json()
      alert('Plan: ' + (j.summary || '') + ' salience=' + j.salience)
      // preview patch
      if (j.edits) {
        const pv = await fetch('http://127.0.0.1:4010/patch-preview', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ filePath: p, edits: j.edits }) })
        if (pv.ok) {
          const pj = await pv.json()
          const ok = confirm('Preview computed (risk=' + pj.risk.risk + '). Apply?')
          if (ok) {
            const ap = await fetch('http://127.0.0.1:4010/apply-patch', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ filePath: p, edits: j.edits }) })
            const aj = await ap.json()
            alert('Applied: backup=' + aj.backup + ' risk=' + JSON.stringify(aj.risk))
          }
        }
      }
    } catch(e) { alert('plan failed: ' + e) }
  })
})

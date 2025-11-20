const fs = require('fs')
const path = require('path')

function applyEditsToContent(content, edits) {
  if (!edits || edits.length === 0) return content
  const lines = content.length === 0 ? [] : content.split('\n')

  // Normalize edits: clamp indices and collect insert-only edits
  const norm = edits.map((e, idx) => {
    const s = Math.max(0, Math.floor(e.startLine || 0))
    const en = Math.max(s, Math.floor(e.endLine || s))
    const repl = (e.replacement == null) ? [] : e.replacement.split('\n')
    return { origIndex: idx, start: s, end: en, repl }
  })

  // inserts: edits where start === end (insert at position)
  const inserts = {}
  // coverage: which edit index covers each original line (last edit wins)
  const coverage = new Array(Math.max(0, lines.length)).fill(null)

  norm.forEach((e, i) => {
    if (e.start === e.end) {
      inserts[e.start] = inserts[e.start] || []
      inserts[e.start].push(e.repl.join('\n'))
    } else {
      const from = Math.min(e.start, lines.length)
      const to = Math.min(e.end, lines.length)
      for (let j = from; j < to; j++) coverage[j] = i
    }
  })

  const out = []
  const emittedEdit = new Set()

  for (let i = 0; i <= lines.length; i++) {
    // emit any inserts at this position (order preserved)
    if (inserts[i]) {
      inserts[i].forEach(t => out.push(t))
    }

    if (i === lines.length) break

    const cov = coverage[i]
    if (cov == null) {
      out.push(lines[i])
      continue
    }

    // If this is the first line covered by this edit, emit its replacement
    if (!emittedEdit.has(cov)) {
      const e = norm[cov]
      out.push(e.repl.join('\n'))
      emittedEdit.add(cov)
    }

    // skip ahead until coverage changes
    let j = i
    while (j < lines.length && coverage[j] === cov) j++
    i = j - 1 // loop will increment
  }

  return out.join('\n')
}

function unifiedDiff(a, b) {
  const A = a.split('\n')
  const B = b.split('\n')
  const out = []
  const max = Math.max(A.length, B.length)
  for (let i=0;i<max;i++){
    const la=A[i], lb=B[i]
    if (la===lb) out.push(' '+(la===undefined?'':la))
    else {
      if (la!==undefined) out.push('-'+la)
      if (lb!==undefined) out.push('+'+lb)
    }
  }
  return out.join('\n')
}

function computeRisk(oldContent, newContent) {
  const oldLines = oldContent.split('\n').length
  const newLines = newContent.split('\n').length
  const diffLines = unifiedDiff(oldContent,newContent).split('\n').filter(l=>l.startsWith('-')||l.startsWith('+')).length
  const changeRatio = diffLines / Math.max(1, Math.max(oldLines,newLines))
  // risk score 0..1
  const risk = Math.min(1, changeRatio * 1.5)
  return { risk: Number(risk.toFixed(3)), diffLines, changeRatio }
}

module.exports = { applyEditsToContent, unifiedDiff, computeRisk }

const fs = require('fs')
const path = require('path')

function applyEditsToContent(content, edits) {
  const lines = content.split('\n')
  // sort edits by startLine asc
  const sorted = (edits || []).slice().sort((a,b)=>a.startLine - b.startLine)
  let cur = lines.slice()
  // apply from top to bottom
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i]
    const s = Math.max(0, e.startLine)
    const en = Math.max(0, e.endLine)
    const before = cur.slice(0, s)
    const after = cur.slice(en)
    const repl = (e.replacement || '').split('\n')
    cur = before.concat(repl).concat(after)
  }
  return cur.join('\n')
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

// Auditor agent stub: scores risk and adds a short audit note
module.exports.run = function run(payload) {
  const risk = (payload.risk && payload.risk.risk) || 0
  const note = risk > 0.5 ? 'high-risk change' : 'low-risk'
  return { ok: true, audit: { risk, note, ts: Date.now() } }
}

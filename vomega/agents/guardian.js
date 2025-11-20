// Guardian agent stub: simple policy gate that approves or rejects applies
module.exports.run = function run(payload) {
  const risk = (payload.risk && payload.risk.risk) || 0
  const approved = risk < 0.8
  return { ok: true, approved, reason: approved ? 'auto-approved' : 'risk-too-high' }
}

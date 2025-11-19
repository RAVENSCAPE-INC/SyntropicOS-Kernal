// Simple resonance scoring heuristics for Syntropic IDE
// Returns { score: 0..1, reasons: [string], metrics: {...} }

const TRUTHY_KEYWORDS = ['true','fact','verified','evidence','coherent','consistent','proven','test','replicate']
const DISSONANT_KEYWORDS = ['fake','lie','manipulate','profit','exploit','spin','marketing','advertis','advert']

function scoreResonance(text) {
  const t = String(text || '').toLowerCase()
  const reasons = []
  if (!t.trim()) {
    return { score: 0, reasons: ['empty input'], metrics: {} }
  }

  let truthCount = 0
  for (const k of TRUTHY_KEYWORDS) if (t.includes(k)) truthCount++
  let dissonCount = 0
  for (const k of DISSONANT_KEYWORDS) if (t.includes(k)) dissonCount++

  const lengthScore = Math.min(1, t.length / 2000)
  const exclaimPenalty = (t.match(/!/g) || []).length > 3 ? 0.1 : 0

  // base computed from keyword balance
  let raw = (truthCount * 0.35) - (dissonCount * 0.5) + (lengthScore * 0.3) - exclaimPenalty
  // normalize roughly to 0..1
  let score = Math.max(0, Math.min(1, (raw + 0.5)))

  if (truthCount > 0) reasons.push('contains truthy keywords')
  if (dissonCount > 0) reasons.push('contains dissonant keywords')
  if (lengthScore > 0.8) reasons.push('long context')
  if (exclaimPenalty) reasons.push('excessive punctuation')

  const metrics = { truthCount, dissonCount, length: t.length, lengthScore, exclaimPenalty }
  return { score: Number(score.toFixed(3)), reasons, metrics }
}

module.exports = { scoreResonance }

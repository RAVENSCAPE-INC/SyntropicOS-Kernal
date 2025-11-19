const TRUTHY_KEYWORDS = ['true','fact','verified','evidence','coherent','consistent','proven','test','replicate','validate']
const DISSONANT_KEYWORDS = ['fake','lie','manipulate','profit','exploit','spin','marketing','advertis','advert','should buy']

function scoreResonance(text) {
  const t = String(text || '')
  const low = t.toLowerCase()
  const reasons = []
  if (!low.trim()) return { score: 0, reasons: ['empty'], metrics: {} }
  let truthCount = 0
  for (const k of TRUTHY_KEYWORDS) if (low.includes(k)) truthCount++
  let dissonCount = 0
  for (const k of DISSONANT_KEYWORDS) if (low.includes(k)) dissonCount++
  const lengthScore = Math.min(1, low.length / 2000)
  const exclaimPenalty = (low.match(/!/g) || []).length > 3 ? 0.15 : 0
  let raw = (truthCount * 0.35) - (dissonCount * 0.55) + (lengthScore * 0.3) - exclaimPenalty
  let score = Math.max(0, Math.min(1, (raw + 0.5)))
  if (truthCount > 0) reasons.push('truthy_keywords')
  if (dissonCount > 0) reasons.push('dissonant_keywords')
  if (lengthScore > 0.8) reasons.push('long_context')
  if (exclaimPenalty) reasons.push('exclaim_penalty')
  return { score: Number(score.toFixed(3)), reasons, metrics: { truthCount, dissonCount, length: low.length, lengthScore } }
}

module.exports = { scoreResonance }

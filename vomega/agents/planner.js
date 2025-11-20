// Simple planner agent: returns a small plan (edits) based on context
module.exports.run = function run(payload) {
  const ctx = (payload.context || '').toString()
  const summary = 'planner: simple header insert'
  const header = `// Planner suggestion\n// ctx-lines=${ctx.split('\n').length}\n` 
  const edits = [{ startLine: 0, endLine: 0, replacement: header }]
  return { summary, salience: 0.5, edits }
}
// Simple planner agent stub that converts a directive into structured edits
function planDirective(directive, context) {
  // naive mapping: place directive as comment at top
  const header = `/* Directive: ${directive} */\n`
  const edits = [{ startLine: 0, endLine: 0, replacement: header }]
  return { summary: 'planner-stub', edits }
}

module.exports = { planDirective }

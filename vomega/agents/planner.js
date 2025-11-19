// Simple planner agent stub that converts a directive into structured edits
function planDirective(directive, context) {
  // naive mapping: place directive as comment at top
  const header = `/* Directive: ${directive} */\n`
  const edits = [{ startLine: 0, endLine: 0, replacement: header }]
  return { summary: 'planner-stub', edits }
}

module.exports = { planDirective }
